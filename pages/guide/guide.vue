<template>
	<view class="gd" :style="{ paddingTop: statusBarHeight + 'px' }">
		<!-- 轮播:品牌页 / 记录页 / 回忆页 -->
		<swiper class="gd-swiper" :current="current" @change="e => (current = e.detail.current)">
			<!-- 第一页:品牌页 -->
			<swiper-item>
				<view class="gd-brand">
					<image class="gd-book" src="/static/guide/guide-book.png" mode="widthFix" />
					<text class="gd-brand-name">时光印记</text>
					<text class="gd-brand-slogan">镌刻一生点滴，看见自己的成长</text>
				</view>
			</swiper-item>

			<!-- 第二/三页:双卡片内容页 -->
			<swiper-item v-for="(s, si) in cardSlides" :key="si">
				<view class="gd-page">
					<text class="gd-page-title">时光印记</text>
					<view v-for="(c, ci) in s.cards" :key="ci" class="gd-card">
						<view class="gd-card-imgwrap">
							<image class="gd-card-img" :src="c.img" mode="aspectFill" />
						</view>
						<view class="gd-card-text">
							<text class="gd-card-title">{{ c.title }}</text>
							<text class="gd-card-sub">{{ c.sub }}</text>
						</view>
					</view>
				</view>
			</swiper-item>
		</swiper>

		<!-- 隐私声明(仅品牌页) -->
		<text v-if="current === 0" class="gd-privacy">隐私本地优先，只属于你的人生档案</text>

		<!-- 指示点 -->
		<view class="gd-dots">
			<view v-for="i in 3" :key="i" :class="['gd-dot', current === i - 1 ? 'on' : '']"></view>
		</view>

		<!-- 操作按钮(内容页) -->
		<view v-if="current > 0" class="gd-btn" @click="finish">{{ current === 1 ? '开 始 记 录' : '开 启 时 光 之 旅' }}</view>
		<view v-else class="gd-btn-hold"></view>
	</view>
</template>

<script>
	// 引导页:品牌页 → 记录页 → 回忆页;按钮或滑动到末页完成引导 → 填写个人档案
	// 内容页为弹性自适应布局:图片区随屏幕高度伸缩(短屏裁切居中、不裁文字),文字区域永远完整
	export default {
		data() {
			return {
				statusBarHeight: 20,
				current: 0,
				cardSlides: [
					{
						cards: [
							{ img: '/static/guide/guide-person.png', title: '记录每一段人生故事', sub: '把你的经历、感悟全部留存' },
							{ img: '/static/guide/guide-reeds.png', title: '定格每一刻心动瞬间', sub: '让美好不再被遗忘' }
						]
					},
					{
						cards: [
							{ img: '/static/guide/guide-flowers.png', title: '翻阅每一段成长足迹', sub: '看见自己的点滴变化' },
							{ img: '/static/guide/guide-stars.png', title: '收藏每一份温暖回忆', sub: '时光替你妥帖保管' }
						]
					}
				]
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
	}
	.gd-swiper {
		flex: 1;
		min-height: 0;
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

	/* ============ 第二/三页:内容页(自适应) ============ */
	.gd-page {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-evenly;
		padding: 24rpx $page-pad 0;
		box-sizing: border-box;
	}
	.gd-page-title {
		flex-shrink: 0;
		font-size: 58rpx;
		font-weight: 800;
		color: $ti-navy;
		letter-spacing: 8rpx;
	}
	.gd-card {
		flex: 0 1 auto;
		min-height: 0;
		width: 100%;
		background: $ti-card;
		border-radius: 52rpx;
		overflow: hidden;
		box-shadow: $shadow-card;
		display: flex;
		flex-direction: column;
	}
	/* 图片容器:吃掉富余空间;空间不足时先于文字收缩(min 200rpx 保证可见) */
	.gd-card-imgwrap {
		flex: 1 1 auto;
		min-height: 200rpx;
		max-height: 400rpx;
		width: 100%;
		overflow: hidden;
	}
	.gd-card-img {
		width: 100%;
		height: 100%;
		display: block;
	}
	.gd-card-text {
		flex-shrink: 0;
		text-align: center;
		padding: 26rpx 32rpx 32rpx;
	}
	.gd-card-title {
		display: block;
		font-size: 34rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.gd-card-sub {
		display: block;
		margin-top: 10rpx;
		font-size: 26rpx;
		color: $ti-text-3;
	}

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
