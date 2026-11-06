<template>
	<view class="es">
		<view class="es-icon">
			<text class="es-book">📖</text>
			<text class="es-star">✦</text>
		</view>
		<text class="es-text">{{ text }}</text>
		<text v-if="sub" class="es-sub">{{ sub }}</text>
		<view v-if="$slots.action" class="es-action">
			<slot name="action"></slot>
		</view>
	</view>
</template>

<script>
	// 空状态占位
	export default {
		name: 'empty-state',
		props: {
			text: { type: String, default: '还没有留下这个阶段的故事' },
			sub: { type: String, default: '' }
		}
	}
</script>

<style lang="scss" scoped>
	.es {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 80rpx 32rpx;
	}
	.es-icon {
		position: relative;
		width: 140rpx;
		height: 140rpx;
		border-radius: 50%;
		background: $ti-primary-light;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.es-book {
		font-size: 64rpx;
	}
	.es-star {
		position: absolute;
		top: -6rpx;
		right: -6rpx;
		color: $ti-accent;
		font-size: 40rpx;
	}
	.es-text {
		margin-top: 32rpx;
		font-size: $font-body;
		color: $ti-text-3;
	}
	.es-sub {
		margin-top: 12rpx;
		font-size: $font-small;
		color: $ti-text-3;
	}
	.es-action {
		margin-top: 40rpx;
		width: 100%;
	}
</style>
