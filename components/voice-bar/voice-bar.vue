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
	// 语音播放条:播放状态/进度走全局共享播放器(utils/voice-player)
	// 好处: 同一时间只播一条, 且声波切图(memory-thumb)等多处按钮与语音条状态联动
	import { probeAudioDuration } from '../../utils/media'
	import { voiceState, toggleVoiceUrl, seekVoiceUrl, releaseVoice } from '../../utils/voice-player'

	export default {
		name: 'voice-bar',
		props: {
			src: { type: String, default: '' },
			duration: { type: Number, default: 0 } // 秒
		},
		data() {
			return {
				audioDuration: 0, // 本条探测到的时长(无 duration 属性时的兜底)
				rect: null, // 轨道位置缓存(拖动换算用)
				dragMoved: false // 本次触摸是否发生了拖动(避免拖动结束误触发点击)
			}
		},
		computed: {
			totalDuration() {
				if (this.duration) return this.duration
				if (voiceState.url === this.src && voiceState.duration) return voiceState.duration
				return this.audioDuration
			},
			// 是否播放中: 全局播放器指向本条且在播
			playing() {
				return voiceState.url === this.src && voiceState.playing
			},
			// 进度: 本条是当前语音时实时跟随播放器, 否则展示记忆的进度(被抢占/暂停后保留)
			current() {
				return voiceState.url === this.src ? voiceState.current : (voiceState.positions[this.src] || 0)
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
			// 本条还在全局播放中(切页/删除条目)时停掉
			releaseVoice(this.src)
		},
		methods: {
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
				seekVoiceUrl(this.src, ratio * d)
			},
			toggle() {
				toggleVoiceUrl(this.src)
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
