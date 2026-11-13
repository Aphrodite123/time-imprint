<template>
	<view class="tb-bar">
		<view class="tb-item" v-for="t in items.slice(0, 2)" :key="t.key" @click="go(t)">
			<image class="tb-icon" :src="current === t.key ? t.on : t.off" mode="aspectFit" />
			<text :class="['tb-label', current === t.key ? 'on' : '']">{{ t.label }}</text>
		</view>
		<view class="tb-add" @click="goCreate">新增印记</view>
		<view class="tb-item" v-for="t in items.slice(2)" :key="t.key" @click="go(t)">
			<image class="tb-icon" :src="current === t.key ? t.on : t.off" mode="aspectFit" />
			<text :class="['tb-label', current === t.key ? 'on' : '']">{{ t.label }}</text>
		</view>
	</view>
</template>

<script>
	// 通栏停靠式 TabBar(首页/记录/新增印记/档案馆/我的)
	// 不透明底 + 顶部细分割线,内容不会从栏体后穿透,避免视觉重叠错觉
	export default {
		name: 'tab-bar',
		props: {
			current: { type: String, default: 'home' }
		},
		data() {
			return {
				items: [
					{ key: 'home', label: '首页', url: '/pages/index/index', off: '/static/tab/home.png', on: '/static/tab/home-on.png' },
					{ key: 'records', label: '记录', url: '/pages/records/records', off: '/static/tab/records.png', on: '/static/tab/records-on.png' },
					{ key: 'archive', label: '档案馆', url: '/pages/archive/archive', off: '/static/tab/archive.png', on: '/static/tab/archive-on.png' },
					{ key: 'mine', label: '我的', url: '/pages/mine/mine', off: '/static/tab/mine.png', on: '/static/tab/mine-on.png' }
				]
			}
		},
		methods: {
			go(t) {
				if (this.current === t.key) return
				uni.reLaunch({ url: t.url })
			},
			goCreate() {
				uni.navigateTo({ url: '/pages/memory/create' })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.tb-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 100;
		height: 128rpx;
		box-sizing: content-box;
		padding: 0 40rpx calc(4rpx + env(safe-area-inset-bottom));
		background: #FFFFFF;
		border-top: 1rpx solid #EFE8D7;
		border-radius: 26rpx 26rpx 0 0;
		box-shadow: 0 -10rpx 30rpx rgba(27, 59, 87, 0.06);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.tb-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5rpx;
	}
	.tb-icon {
		width: 46rpx;
		height: 46rpx;
	}
	.tb-label {
		font-size: 21rpx;
		font-weight: 600;
		color: $ti-text-3;
	}
	.tb-label.on {
		color: $ti-primary;
		font-weight: 700;
	}
	.tb-add {
		height: 92rpx;
		line-height: 92rpx;
		padding: 0 42rpx;
		border-radius: 999rpx;
		background: linear-gradient(135deg, #579292 0%, #4A8282 100%);
		color: #FFFFFF;
		font-size: 28rpx;
		font-weight: 800;
		letter-spacing: 2rpx;
		box-shadow: $shadow-primary;
		white-space: nowrap;
	}
</style>
