<template>
	<view class="gd" :style="{ paddingTop: statusBarHeight + 'px' }">
		<!-- 跳过(内容页) -->
		<view v-if="current > 0" class="gd-skip" :style="{ top: statusBarHeight + 8 + 'px' }" @click="finish">跳过</view>

		<swiper class="gd-swiper" :current="current" @change="e => (current = e.detail.current)">
			<!-- 第一页:品牌页 -->
			<swiper-item>
				<view class="gd-brand">
					<image class="gd-book" src="/static/guide/guide-book.png" mode="widthFix" />
					<text class="gd-brand-name">时光印记</text>
					<text class="gd-brand-slogan">镌刻一生点滴，看见自己的成长</text>
				</view>
			</swiper-item>

			<!-- 第二页:记录印记 —— 抽象自创建页: 一张高光卡片 + 记录方式环绕 -->
			<swiper-item>
				<view class="gd-page">
					<view class="gd-art">
						<view class="gd-stage">
							<view class="ga-pol">
								<view class="ga-pol-img">
									<text class="ga-pol-heart">♥</text>
								</view>
								<text class="ga-pol-date">2026 · 06</text>
							</view>
							<view class="ga-chip g1"><text>📷</text><text>照片</text></view>
							<view class="ga-chip g2"><text>🎙️</text><text>语音</text></view>
							<view class="ga-chip g3"><text>😊</text><text>心情</text></view>
							<text class="ga-spark k1">✦</text>
							<text class="ga-spark k2">✦</text>
							<text class="ga-spark k3">✦</text>
						</view>
					</view>
					<text class="gd-slide-title">记录印记</text>
					<text class="gd-slide-sub">文字、照片、语音、心情，随手记下此刻</text>
				</view>
			</swiper-item>

			<!-- 第三页:时光轴 —— 抽象自首页: 按年龄铺开的成长时间轴 -->
			<swiper-item>
				<view class="gd-page">
					<view class="gd-art">
						<view class="gd-stage">
							<view class="ga-axis"></view>
							<view class="ga-node na">
								<view class="ga-age">0岁</view>
								<text class="ga-moment">第一次微笑</text>
							</view>
							<view class="ga-node nb">
								<view class="ga-age">1岁</view>
								<text class="ga-moment">迈出第一步</text>
							</view>
							<view class="ga-node nc">
								<view class="ga-age now">今天 ♥</view>
								<text class="ga-moment">持续记录中</text>
							</view>
							<text class="ga-spark k1">✦</text>
							<text class="ga-spark k2">✦</text>
						</view>
					</view>
					<text class="gd-slide-title">时光轴</text>
					<text class="gd-slide-sub">按年龄排布，成长足迹一目了然</text>
				</view>
			</swiper-item>

			<!-- 第四页:档案馆 —— 抽象自档案页: 一沓彩色的成长纪念照 -->
			<swiper-item>
				<view class="gd-page">
					<view class="gd-art">
						<view class="gd-stage">
							<view class="ga-stack">
								<view class="ga-card c1"><view class="ga-img i1"></view><view class="ga-bar w40"></view></view>
								<view class="ga-card c2"><view class="ga-img i2"></view><view class="ga-bar w60"></view></view>
								<view class="ga-card c3"><view class="ga-img i3"></view><view class="ga-bar w50"></view></view>
							</view>
							<text class="ga-spark k1">✦</text>
							<text class="ga-spark k2">✦</text>
							<text class="ga-spark k3">✦</text>
						</view>
					</view>
					<text class="gd-slide-title">档案馆</text>
					<text class="gd-slide-sub">快照 · 纪念册 · 阶段集，看见自己的变化</text>
				</view>
			</swiper-item>
		</swiper>

		<!-- 隐私声明(仅品牌页) -->
		<text v-if="current === 0" class="gd-privacy">隐私本地优先，只属于你的人生档案</text>

		<!-- 指示点 -->
		<view class="gd-dots">
			<view v-for="i in 4" :key="i" :class="['gd-dot', current === i - 1 ? 'on' : '']"></view>
		</view>

		<!-- 操作按钮(内容页) -->
		<view v-if="current > 0" class="gd-btn" @click="finish">{{ btnTexts[current - 1] }}</view>
		<view v-else class="gd-btn-hold"></view>
	</view>
</template>

<script>
	// 引导页:品牌页 → 记录印记 → 时光轴 → 档案馆
	// 内容页为「抽象插画 + 大标题 + 一句话」: 抽出各页面最核心的特点, 手绘 CSS 语言绘制
	// 任意内容页按钮或跳过完成引导 → 填写个人档案
	import { appShare, appShareTimeline } from '../../utils/share'
	export default {
		// 微信转发/朋友圈分享(统一应用推广, 见 utils/share.js)
		onShareAppMessage() {
			return appShare()
		},
		onShareTimeline() {
			return appShareTimeline()
		},
		data() {
			return {
				statusBarHeight: 20,
				current: 0,
				btnTexts: ['开 始 记 录', '看 看 时 光 轴', '开 启 时 光 之 旅']
			}
		},
		onLoad() {
			const sys = uni.getSystemInfoSync()
			this.statusBarHeight = sys.statusBarHeight || 20
		},
		methods: {
			finish() {
				uni.setStorageSync('ti_guide_done', 1)
				uni.redirectTo({ url: '/pages/mine/profile?first=1' })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.gd {
		height: 100vh;
		background: $ti-bg;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		overflow: hidden;
		position: relative;
	}
	.gd-swiper {
		flex: 1;
		min-height: 0;
	}
	.gd-skip {
		position: absolute;
		right: $page-pad;
		z-index: 5;
		font-size: 26rpx;
		color: $ti-text-3;
		padding: 10rpx 24rpx;
	}

	/* ============ 第一页:品牌页 ============ */
	.gd-brand {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding-bottom: 80rpx;
	}
	.gd-book {
		width: 460rpx;
	}
	.gd-brand-name {
		margin-top: 70rpx;
		font-size: 80rpx;
		font-weight: 800;
		color: $ti-navy;
		letter-spacing: 16rpx;
	}
	.gd-brand-slogan {
		margin-top: 30rpx;
		font-size: 30rpx;
		font-weight: 600;
		color: $ti-text-2;
	}

	/* ============ 内容页公共布局: 插画居中 + 大标题 + 一句话 ============ */
	.gd-page {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 30rpx $page-pad calc(30rpx + env(safe-area-inset-bottom) / 2);
		box-sizing: border-box;
	}
	/* 插画舞台: 居中固定尺寸, 任何屏幕都协调 */
	.gd-art {
		position: relative;
		flex: 1;
		width: 100%;
		min-height: 0;
	}
	.gd-stage {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 560rpx;
		height: 560rpx;
	}
	.gd-slide-title {
		flex-shrink: 0;
		font-size: 48rpx;
		font-weight: 800;
		color: $ti-navy;
		letter-spacing: 6rpx;
		margin-bottom: 20rpx;
	}
	.gd-slide-sub {
		flex-shrink: 0;
		font-size: 28rpx;
		color: $ti-text-2;
		margin-bottom: 24rpx;
	}
	.ga-spark {
		position: absolute;
		color: $ti-accent;
		line-height: 1;
	}

	/* ============ 插画:记录印记 ============ */
	.ga-pol {
		position: absolute;
		left: 130rpx;
		top: 120rpx;
		width: 300rpx;
		height: 330rpx;
		background: #FFFFFF;
		border-radius: 14rpx;
		box-shadow: 0 20rpx 44rpx rgba(27, 59, 87, 0.16);
		transform: rotate(-4deg);
		box-sizing: border-box;
		padding: 18rpx;
	}
	.ga-pol-img {
		height: 236rpx;
		border-radius: 10rpx;
		background: linear-gradient(160deg, #BFDCBE, #7FB989);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ga-pol-heart {
		font-size: 64rpx;
		color: rgba(255, 255, 255, 0.9);
	}
	.ga-pol-date {
		display: block;
		margin-top: 20rpx;
		font-size: 24rpx;
		color: #C9C2B2;
		text-align: center;
		letter-spacing: 2rpx;
	}
	.ga-chip {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 10rpx;
		background: #FFFFFF;
		border-radius: 999rpx;
		padding: 14rpx 28rpx;
		font-size: 26rpx;
		font-weight: 700;
		color: $ti-navy;
		box-shadow: 0 10rpx 24rpx rgba(27, 59, 87, 0.14);
		box-sizing: border-box;
	}
	.ga-chip.g1 {
		left: 20rpx;
		top: 60rpx;
		transform: rotate(-7deg);
	}
	.ga-chip.g1 text:first-child { font-size: 30rpx; }
	.ga-chip.g2 {
		right: 10rpx;
		top: 130rpx;
		transform: rotate(6deg);
	}
	.ga-chip.g2 text:first-child { font-size: 30rpx; }
	.ga-chip.g3 {
		right: 40rpx;
		bottom: 90rpx;
		transform: rotate(-4deg);
	}
	.ga-chip.g3 text:first-child { font-size: 30rpx; }
	.ga-spark.k1 { left: 60rpx; top: 150rpx; font-size: 26rpx; opacity: 0.8; }
	.ga-spark.k2 { right: 70rpx; top: 260rpx; font-size: 34rpx; }
	.ga-spark.k3 { left: 110rpx; bottom: 40rpx; font-size: 22rpx; opacity: 0.7; }

	/* ============ 插画:时光轴 ============ */
	.ga-axis {
		position: absolute;
		left: 60rpx;
		right: 60rpx;
		top: 270rpx;
		height: 8rpx;
		border-radius: 8rpx;
		background: linear-gradient(90deg, #D8D2C2, #579292 55%, $ti-accent);
	}
	.ga-node {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14rpx;
		width: 170rpx;
	}
	.ga-node .ga-age {
		font-size: 26rpx;
		font-weight: 700;
		color: $ti-navy;
		background: #FFFFFF;
		border-radius: 999rpx;
		padding: 10rpx 30rpx;
		box-shadow: 0 8rpx 20rpx rgba(27, 59, 87, 0.12);
	}
	.ga-node .ga-age.now {
		color: #FFFFFF;
		background: $ti-primary;
	}
	.ga-node .ga-moment {
		font-size: 24rpx;
		color: $ti-text-3;
	}
	.ga-node.na {
		left: 0;
		top: 316rpx;
	}
	.ga-node.nb {
		left: 195rpx;
		top: 316rpx;
	}
	.ga-node.nc {
		right: 0;
		top: 316rpx;
	}
	.ga-node::after {
		content: "";
		position: absolute;
		left: 50%;
		width: 18rpx;
		height: 18rpx;
		border-radius: 50%;
		background: #FFFFFF;
		border: 5rpx solid $ti-primary;
		box-sizing: border-box;
		transform: translateX(-50%);
	}
	.ga-node.na::after { top: -46rpx; }
	.ga-node.nb::after { top: -46rpx; }
	.ga-node.nc::after {
		top: -46rpx;
		border-color: $ti-accent;
	}
	.ga-spark.k1 { right: 20rpx; top: 40rpx; font-size: 32rpx; }
	.ga-spark.k2 { left: 40rpx; bottom: 120rpx; font-size: 22rpx; opacity: 0.75; }

	/* ============ 插画:档案馆 ============ */
	.ga-stack {
		position: absolute;
		left: 120rpx;
		top: 110rpx;
		width: 320rpx;
		height: 360rpx;
	}
	.ga-card {
		position: absolute;
		width: 220rpx;
		height: 290rpx;
		background: #FFFFFF;
		border-radius: 16rpx;
		box-shadow: 0 18rpx 40rpx rgba(27, 59, 87, 0.16);
		box-sizing: border-box;
		padding: 14rpx;
	}
	.ga-card.c1 {
		left: 0;
		top: 20rpx;
		transform: rotate(-10deg);
	}
	.ga-card.c2 {
		left: 60rpx;
		top: 6rpx;
		transform: rotate(2deg);
		z-index: 2;
	}
	.ga-card.c3 {
		left: 120rpx;
		top: 34rpx;
		transform: rotate(12deg);
	}
	.ga-img {
		height: 190rpx;
		border-radius: 10rpx;
	}
	.ga-img.i1 { background: linear-gradient(160deg, #F8D8D0, #EAA9A0); }
	.ga-img.i2 { background: linear-gradient(160deg, #D3E7D2, #93C29B); }
	.ga-img.i3 { background: linear-gradient(160deg, #CCD9EA, #93AFCE); }
	.ga-bar {
		height: 14rpx;
		border-radius: 8rpx;
		background: #EAE3D2;
		margin-top: 18rpx;
	}
	.ga-bar.w40 { width: 40%; }
	.ga-bar.w50 { width: 50%; }
	.ga-bar.w60 { width: 60%; }
	.ga-spark.k1 { right: 30rpx; top: 60rpx; font-size: 34rpx; }
	.ga-spark.k2 { left: 30rpx; top: 240rpx; font-size: 22rpx; opacity: 0.75; }
	.ga-spark.k3 { right: 60rpx; bottom: 40rpx; font-size: 26rpx; opacity: 0.85; }

	/* ============ 底部公共区 ============ */
	.gd-privacy {
		text-align: center;
		font-size: 26rpx;
		color: $ti-text-3;
		padding: 24rpx 0 0;
	}
	.gd-dots {
		display: flex;
		justify-content: center;
		gap: 18rpx;
		padding: 28rpx 0;
	}
	.gd-dot {
		width: 18rpx;
		height: 18rpx;
		border-radius: 50%;
		background: #D8D2C2;
		&.on {
			background: $ti-primary;
		}
	}
	.gd-btn {
		height: 108rpx;
		line-height: 108rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 32rpx;
		font-weight: 700;
		letter-spacing: 6rpx;
		color: #FFFFFF;
		background: linear-gradient(135deg, #5E82A6 0%, #52749A 100%);
		box-shadow: 0 12rpx 26rpx rgba(88, 124, 160, 0.32);
		margin: 0 $page-pad calc(40rpx + env(safe-area-inset-bottom));
	}
	.gd-btn-hold {
		height: calc(176rpx + env(safe-area-inset-bottom));
	}
</style>
