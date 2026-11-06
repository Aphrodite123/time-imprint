<template>
	<view class="nb" :style="{ paddingTop: statusBarHeight + 'px' }">
		<view class="nb-row">
			<view v-if="back" class="nb-side" @click="onBack">
				<image class="nb-back" src="/static/icon-back.png" mode="aspectFit" />
			</view>
			<view v-else class="nb-side"></view>
			<text class="nb-title">{{ title }}</text>
			<view class="nb-side nb-right">
				<slot name="right"></slot>
			</view>
		</view>
		<view v-if="accent" class="nb-accent"></view>
	</view>
</template>

<script>
	// 自定义导航栏:返回 + 标题(可带右侧插槽与橙色下划线点缀)
	export default {
		name: 'nav-bar',
		props: {
			title: { type: String, default: '' },
			back: { type: Boolean, default: true },
			accent: { type: Boolean, default: false } // 标题下橙色短划线(详情页样式)
		},
		data() {
			return { statusBarHeight: 20 }
		},
		mounted() {
			const sys = uni.getSystemInfoSync()
			this.statusBarHeight = sys.statusBarHeight || 20
		},
		methods: {
			onBack() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack()
				} else {
					// 无上级页面时(如分享/推送直达)回落到首页
					uni.reLaunch({ url: '/pages/index/index' })
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.nb {
		background: $ti-bg;
	}
	.nb-row {
		height: 96rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 $page-pad;
	}
	.nb-side {
		width: 72rpx;
		display: flex;
		align-items: center;
	}
	.nb-back {
		width: 44rpx;
		height: 44rpx;
	}
	.nb-title {
		font-size: 38rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.nb-right {
		justify-content: flex-end;
	}
	.nb-accent {
		width: 72rpx;
		height: 10rpx;
		border-radius: 6rpx;
		background: $ti-accent;
		margin: 2rpx 0 0 $page-pad;
	}
</style>
