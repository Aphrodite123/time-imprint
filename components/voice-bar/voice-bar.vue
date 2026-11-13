<template>
	<view class="vb" @click.stop="toggle">
		<view class="vb-icon">
			<text :class="['vb-bars', playing ? 'playing' : '']">
				<text class="bar b1"></text>
				<text class="bar b2"></text>
				<text class="bar b3"></text>
			</text>
		</view>
		<view
			class="vb-track-hit"
			@click.stop="onTrackTap"
			@touchstart.stop="onTouchStart"
			@touchmove.stop.prevent="onTouchMove"
			@touchend.stop="onTouchEnd"
		>
			<view class="vb-track">
				<view class="vb-fill" :style="{ width: percent + '%' }"></view>
				<view class="vb-dot" :style="{ left: percent + '%' }"></view>
			</view>
		</view>
		<text class="vb-time">{{ fmt(current) }}</text>
		<text class="vb-play">{{ playing ? '❚❚' : '▶' }}</text>
		<text class="vb-time">{{ fmt(totalDuration) }}</text>
	</view>
</template>

<script>
	// 语音播放条:自管理播放状态;播放速度跟随「设置-语音播放速度」
	// 多条语音条互斥: 同一时间只有一条在播, 其他条开始播放/点进度时自动停掉在播的
	import { probeAudioDuration } from '../../utils/media'

	let activeBar = null

	export default {
		name: 'voice-bar',
		props: {
			src: { type: String, default: '' },
			duration: { type: Number, default: 0 } // 秒
		},
		data() {
			return {
				audio: null,
				playing: false,
				current: 0,
				audioDuration: 0,
				rect: null, // 轨道位置缓存(拖动换算用)
				dragMoved: false // 本次触摸是否发生了拖动(避免拖动结束误触发点击)
			}
		},
		computed: {
			totalDuration() {
				return this.duration || this.audioDuration
			},
			percent() {
				if (!this.totalDuration) return 0
				return Math.min(100, (this.current / this.totalDuration) * 100)
			}
		},
		mounted() {
			// 未写入时长的音频(如本地选择的 mp3): 后台预加载元数据读取时长
			if (!this.duration && this.src) {
				probeAudioDuration(this.src).then(d => {
					if (d && !this.audioDuration) this.audioDuration = Math.ceil(d)
				})
			}
		},
		beforeUnmount() {
			if (this.audio) {
				this.audio.stop()
				this.audio.destroy()
			}
			if (activeBar === this) activeBar = null
		},
		methods: {
			// 懒创建音频实例(事件路由到本组件)
			ensureAudio() {
				if (this.audio) return this.audio
				const a = uni.createInnerAudioContext()
				try { a.obeyMuteSwitch = false } catch (e) {}
				a.src = this.src
				a.playbackRate = this.storedRate()
				a.onCanplay(() => {
					if (a.duration) this.audioDuration = Math.ceil(a.duration)
				})
				a.onTimeUpdate(() => {
					this.current = Math.floor(a.currentTime)
					if (a.duration) this.audioDuration = Math.ceil(a.duration)
				})
				a.onEnded(() => {
					this.playing = false
					this.current = 0
					if (activeBar === this) activeBar = null
				})
				a.onError(() => {
					this.playing = false
					if (activeBar === this) activeBar = null
					uni.showToast({ title: '语音播放失败', icon: 'none' })
				})
				this.audio = a
				return a
			},
			// 独占播放: 停掉其他语音条的播放
			claimPlayback() {
				if (activeBar && activeBar !== this) activeBar.stopPlaying()
				activeBar = this
			},
			// 被其他条抢占时停掉自己(保留进度显示)
			stopPlaying() {
				if (this.audio) this.audio.pause()
				this.playing = false
			},
			storedRate() {
				const r = Number(uni.getStorageSync('ti_play_rate'))
				return r > 0 ? r : 1.0
			},
			// 点击轨道: 跳转到点击位置
			onTrackTap(e) {
				// 拖动结束后的合成点击不重复处理
				if (this.dragMoved) {
					this.dragMoved = false
					return
				}
				const x = this.tapX(e)
				if (this.rect) return this.seekToX(x)
				const q = uni.createSelectorQuery().in(this)
				q.select('.vb-track').boundingClientRect()
				q.exec(res => {
					this.rect = res && res[0]
					this.seekToX(x)
				})
			},
			// 按下: 缓存轨道位置并跳到按点
			onTouchStart(e) {
				const q = uni.createSelectorQuery().in(this)
				q.select('.vb-track').boundingClientRect()
				q.exec(res => {
					this.rect = res && res[0]
					if (this.rect && e.touches && e.touches[0]) this.seekToX(e.touches[0].clientX)
				})
			},
			// 拖动: 连续滑动进度
			onTouchMove(e) {
				if (!this.rect) return
				this.dragMoved = true
				if (e.touches && e.touches[0]) this.seekToX(e.touches[0].clientX)
			},
			onTouchEnd() {
				// 拖动结束后短暂延迟复位, 拦截紧随其后的合成点击
				setTimeout(() => {
					this.dragMoved = false
				}, 60)
			},
			tapX(e) {
				if (!e) return 0
				if (e.detail && e.detail.x != null) return e.detail.x
				if (e.clientX != null) return e.clientX
				if (e.touches && e.touches[0]) return e.touches[0].clientX
				if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientX
				return 0
			},
			seekToX(clientX) {
				if (!this.rect || !this.rect.width) return
				const ratio = Math.min(Math.max((clientX - this.rect.left) / this.rect.width, 0), 1)
				const d = this.totalDuration
				if (!d) return
				const target = ratio * d
				this.current = target
				const audio = this.ensureAudio()
				audio.seek(target)
				// 未在播放: 跳转后自动开始播放(并停掉其他条)
				if (!this.playing) {
					this.claimPlayback()
					audio.playbackRate = this.storedRate()
					audio.play()
					this.playing = true
				}
			},
			toggle() {
				if (!this.src) return
				if (this.playing) {
					this.audio.pause()
					this.playing = false
					return
				}
				this.claimPlayback()
				const audio = this.ensureAudio()
				audio.playbackRate = this.storedRate()
				audio.play()
				this.playing = true
			},
			fmt(s) {
				if (!s || s < 0) s = 0
				const m = Math.floor(s / 60)
				const r = Math.floor(s % 60)
				return `${m < 10 ? '0' + m : m}:${r < 10 ? '0' + r : r}`
			}
		}
	}
</script>

<style lang="scss" scoped>
	.vb {
		display: flex;
		align-items: center;
		height: 64rpx;
	}
	.vb-icon {
		margin-right: 20rpx;
	}
	.vb-bars {
		display: inline-flex;
		align-items: flex-end;
		height: 34rpx;
		gap: 6rpx;

		.bar {
			width: 7rpx;
			border-radius: 4rpx;
			background: $ti-primary;
			height: 34rpx;
		}
		.b2 { height: 22rpx; }
		.b3 { height: 27rpx; }
	}
	.playing .bar {
		background: $ti-accent;
		animation: vbJump 0.8s ease-in-out infinite;
	}
	.playing .b2 { animation-delay: 0.2s; }
	.playing .b3 { animation-delay: 0.4s; }
	@keyframes vbJump {
		0%, 100% { height: 34rpx; }
		50% { height: 14rpx; }
	}

	.vb-track-hit {
		position: relative;
		flex: 1;
		padding: 12rpx 14rpx; /* 扩大点击/拖动热区; 水平内边距容纳 0%/100% 处伸出的滑块 */
	}
	.vb-track {
		position: relative;
		height: 10rpx;
		border-radius: 5rpx;
		background: #EFE9DC;
		margin: 0 12rpx;
	}
	.vb-fill {
		position: absolute;
		left: 0;
		top: 0;
		height: 10rpx;
		border-radius: 5rpx;
		background: linear-gradient(90deg, #F5B27E, #EC9048);
	}
	.vb-dot {
		position: absolute;
		top: 50%;
		width: 22rpx;
		height: 22rpx;
		border-radius: 50%;
		background: #FFFFFF;
		border: 6rpx solid $ti-accent-deep;
		box-sizing: border-box;
		transform: translate(-50%, -50%);
	}
	.vb-time {
		font-size: $font-small;
		color: $ti-text-3;
	}
	.vb-play {
		margin: 0 18rpx;
		font-size: 26rpx;
		color: $ti-navy;
		font-weight: 700;
	}
</style>
