<template>
	<view class="sp">
		<!-- 光晕装饰 -->
		<view class="sp-glow sp-glow-orange"></view>
		<view class="sp-glow sp-glow-teal"></view>

		<!-- 中心 Logo -->
		<view class="sp-center">
			<image class="sp-logo" src="/static/sp-logo.png" mode="aspectFit" />
			<text class="sp-name">时光印记</text>
			<text class="sp-slogan">记 录 每 一 段 人 生 故 事</text>
		</view>

		<!-- 底部波浪 -->
		<image class="sp-wave" src="/static/sp-wave.png" mode="widthFix" />

		<!-- 加载点 + 版本 -->
		<view class="sp-foot">
			<view class="sp-dots">
				<view class="sp-dot on"></view>
				<view class="sp-dot orange"></view>
				<view class="sp-dot"></view>
			</view>
			<text class="sp-version">v1.0.0 · 时光印记</text>
		</view>
	</view>
</template>

<script>
	// 闪屏页:首次使用跳引导页,之后固定进入首页
	const GUIDE_KEY = 'ti_guide_done'

	export default {
		data() {
			return { timer: null }
		},
		onLoad() {
			this.timer = setTimeout(() => this.route(), 1800)
		},
		onUnload() {
			if (this.timer) clearTimeout(this.timer)
		},
		methods: {
			route() {
				// 防御:历史版本残留的脏数据(类型异常/页面路径已废弃)不能阻断启动
				try {
					const guided = uni.getStorageSync(GUIDE_KEY)
					if (!guided) {
						this.go('/pages/guide/guide')
						return
					}
					this.go('/pages/index/index')
				} catch (e) {
					this.go('/pages/index/index')
				}
			},
			// 带兜底的跳转:失败时回退,避免卡在闪屏页
			go(url, fallback) {
				uni.reLaunch({
					url,
					fail: () => {
						if (fallback) {
							this.go(fallback)
						} else {
							uni.showToast({ title: '页面加载失败，请重试', icon: 'none' })
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.sp {
		min-height: 100vh;
		background: linear-gradient(180deg, #F8F3E6 0%, #F5EEDA 100%);
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 320rpx;
		box-sizing: border-box;
	}
	.sp-glow {
		position: absolute;
		border-radius: 50%;
	}
	.sp-glow-orange {
		width: 600rpx;
		height: 600rpx;
		top: -160rpx;
		left: -140rpx;
		background: radial-gradient(circle, rgba(240, 153, 90, 0.20), transparent 70%);
	}
	.sp-glow-teal {
		width: 680rpx;
		height: 680rpx;
		bottom: -180rpx;
		right: -160rpx;
		background: radial-gradient(circle, rgba(79, 139, 139, 0.16), transparent 70%);
	}
	.sp-center {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.sp-logo {
		width: 236rpx;
		height: 236rpx;
	}
	.sp-name {
		margin-top: 68rpx;
		font-size: 72rpx;
		font-weight: 800;
		color: $ti-navy;
		letter-spacing: 14rpx;
	}
	.sp-slogan {
		margin-top: 28rpx;
		font-size: 28rpx;
		color: $ti-text-3;
		letter-spacing: 8rpx;
	}
	.sp-wave {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
	}
	.sp-foot {
		position: absolute;
		bottom: calc(88rpx + env(safe-area-inset-bottom));
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24rpx;
	}
	.sp-dots {
		display: flex;
		gap: 16rpx;
	}
	.sp-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		background: #D7D2C4;
	}
	.sp-dot.on {
		background: $ti-primary;
	}
	.sp-dot.orange {
		background: #F0A96E;
	}
	.sp-version {
		font-size: 22rpx;
		color: #B9B2A0;
		letter-spacing: 2rpx;
	}
</style>
