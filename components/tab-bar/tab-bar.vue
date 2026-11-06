<template>
	<view class="tb-wrap">
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
	</view>
</template>

<script>
	// 自定义悬浮胶囊 TabBar(首页/记录/新增印记/档案馆/我的)
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
	.tb-wrap {
		position: fixed;
		left: 32rpx;
		right: 32rpx;
		bottom: calc(44rpx + env(safe-area-inset-bottom));
		z-index: 100;
	}
	.tb-bar {
		height: 148rpx;
		background: #FFFFFF;
		border-radius: 999rpx;
		box-shadow: $shadow-float;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 44rpx;
	}
	.tb-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6rpx;
		width: 96rpx;
	}
	.tb-icon {
		width: 48rpx;
		height: 48rpx;
	}
	.tb-label {
		font-size: 22rpx;
		font-weight: 600;
		color: $ti-text-3;
	}
	.tb-label.on {
		color: $ti-primary;
	}
	.tb-add {
		background: linear-gradient(135deg, #579292 0%, #4A8282 100%);
		color: #FFFFFF;
		font-size: 30rpx;
		font-weight: 800;
		letter-spacing: 2rpx;
		padding: 30rpx 42rpx;
		border-radius: 52rpx;
		box-shadow: $shadow-primary;
		white-space: nowrap;
	}
</style>
