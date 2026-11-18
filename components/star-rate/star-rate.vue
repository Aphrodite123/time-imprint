<template>
	<view class="sr">
		<view class="sr-stars">
			<text
				v-for="i in maxLevel"
				:key="i"
				:class="['sr-star', i <= level ? 'on' : '']"
				@click="pick(i)"
			>★</text>
		</view>
		<text class="sr-label">{{ levelLabel(level) }}</text>
	</view>
</template>

<script>
	// 高光星数选择器: 点第 n 颗星即选 n 星, 下方展示当前档位含义
	import { MAX_HL_LEVEL, levelLabel } from '../../utils/highlight'

	export default {
		name: 'star-rate',
		props: {
			level: { type: Number, default: 3 }
		},
		data() {
			return { maxLevel: MAX_HL_LEVEL }
		},
		methods: {
			levelLabel,
			pick(i) {
				this.$emit('update:level', i)
			}
		}
	}
</script>

<style lang="scss" scoped>
	.sr {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: $ti-card;
		border-radius: 40rpx;
		padding: 30rpx;
		box-shadow: $shadow-card;
	}
	.sr-stars {
		display: flex;
		align-items: center;
		gap: 18rpx;
	}
	.sr-star {
		font-size: 54rpx;
		line-height: 1.2;
		padding: 6rpx 10rpx;
		color: #E3DCCB;
		transition: color 0.15s;
		&.on {
			color: $ti-accent;
		}
	}
	.sr-label {
		margin-top: 12rpx;
		font-size: $font-small;
		font-weight: 600;
		color: $ti-text-3;
	}
</style>
