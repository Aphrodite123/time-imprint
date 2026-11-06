<template>
	<view class="vb" @click.stop="toggle">
		<view class="vb-icon">
			<text :class="['vb-bars', playing ? 'playing' : '']">
				<text class="bar b1"></text>
				<text class="bar b2"></text>
				<text class="bar b3"></text>
			</text>
		</view>
		<view class="vb-track">
			<view class="vb-fill" :style="{ width: percent + '%' }"></view>
			<view class="vb-dot" :style="{ left: percent + '%' }"></view>
		</view>
		<text class="vb-time">{{ fmt(current) }}</text>
		<text class="vb-play">{{ playing ? '❚❚' : '▶' }}</text>
		<text class="vb-time">{{ fmt(totalDuration) }}</text>
	</view>
</template>

<script>
	// 语音播放条:自管理播放状态;播放速度跟随「设置-语音播放速度」
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
				audioDuration: 0
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
			this.audio = uni.createInnerAudioContext()
			this.audio.src = this.src
			this.audio.playbackRate = this.storedRate()
			this.audio.onCanplay(() => {
				if (this.audio.duration) this.audioDuration = Math.ceil(this.audio.duration)
			})
			this.audio.onTimeUpdate(() => {
				this.current = Math.floor(this.audio.currentTime)
				if (this.audio.duration) this.audioDuration = Math.ceil(this.audio.duration)
			})
			this.audio.onEnded(() => {
				this.playing = false
				this.current = 0
			})
			this.audio.onError(() => {
				this.playing = false
				uni.showToast({ title: '语音播放失败', icon: 'none' })
			})
		},
		beforeUnmount() {
			if (this.audio) {
				this.audio.stop()
				this.audio.destroy()
			}
		},
		methods: {
			storedRate() {
				const r = Number(uni.getStorageSync('ti_play_rate'))
				return r > 0 ? r : 1.0
			},
			toggle() {
				if (!this.src) return
				if (this.playing) {
					this.audio.pause()
					this.playing = false
				} else {
					this.audio.playbackRate = this.storedRate()
					this.audio.play()
					this.playing = true
				}
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

	.vb-track {
		position: relative;
		flex: 1;
		height: 32rpx;
		margin: 0 12rpx;
	}
	.vb-fill {
		position: absolute;
		left: 0;
		top: 50%;
		height: 6rpx;
		transform: translateY(-50%);
		border-radius: 6rpx;
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
