<template>
	<view v-if="visible" class="ep-mask" @click="close">
		<view class="ep-panel" @click.stop>
			<view class="ep-grab"></view>
			<view class="ep-head">
				<text class="ep-title">今天的心情</text>
				<text class="ep-sub">选一个最接近的感受</text>
			</view>
			<view class="ep-grid">
				<view
					v-for="e in emotions"
					:key="e.key"
					:class="['ep-item', selected === e.key ? 'on' : '']"
					@click="pick(e)"
				>
					<text class="ep-emoji">{{ e.emoji }}</text>
					<text class="ep-label">{{ e.label }}</text>
					<view v-if="selected === e.key" class="ep-check">
						<text class="ep-check-icon">✓</text>
					</view>
				</view>
			</view>
			<view class="ep-actions">
				<view class="ep-clear" @click="clear">清除</view>
				<view class="ep-ok" @click="close">确 定</view>
			</view>
		</view>
	</view>
</template>

<script>
	// 情绪表情选择器(底部弹层)
	import { EMOTIONS } from '../../utils/stage'

	export default {
		name: 'emotion-picker',
		props: {
			visible: { type: Boolean, default: false },
			selected: { type: String, default: '' }
		},
		data() {
			return { emotions: EMOTIONS }
		},
		methods: {
			pick(e) {
				this.$emit('select', e.key)
				this.$emit('update:visible', false)
			},
			clear() {
				this.$emit('select', '')
				this.$emit('update:visible', false)
			},
			close() {
				this.$emit('update:visible', false)
			}
		}
	}
</script>

<style lang="scss" scoped>
	.ep-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(27, 43, 57, 0.45);
		z-index: 999;
		display: flex;
		align-items: flex-end;
	}
	.ep-panel {
		width: 100%;
		background: #FFFDF7;
		border-radius: 56rpx 56rpx 0 0;
		padding: 24rpx 40rpx calc(44rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
		box-shadow: 0 -14rpx 40rpx rgba(27, 59, 87, 0.2);
	}
	.ep-grab {
		width: 88rpx;
		height: 10rpx;
		border-radius: 6rpx;
		background: #E3DCCB;
		margin: 0 auto;
	}
	.ep-head {
		margin-top: 28rpx;
		display: flex;
		align-items: baseline;
		gap: 20rpx;
	}
	.ep-title {
		font-size: 36rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.ep-sub {
		font-size: $font-small;
		color: $ti-text-3;
	}
	.ep-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 22rpx;
		margin-top: 36rpx;
	}
	.ep-item {
		position: relative;
		width: calc((100% - 66rpx) / 4);
		height: 168rpx;
		border-radius: 40rpx;
		background: $ti-bg;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 14rpx;
		box-sizing: border-box;
		&.on {
			outline: 4rpx solid $ti-primary;
			outline-offset: -4rpx;
		}
	}
	.ep-emoji {
		font-size: 56rpx;
		line-height: 1.2;
	}
	.ep-label {
		font-size: $font-small;
		font-weight: 600;
		color: $ti-text-2;
	}
	.ep-item.on .ep-label {
		color: $ti-navy;
		font-weight: 700;
	}
	.ep-check {
		position: absolute;
		top: 12rpx;
		right: 12rpx;
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		background: $ti-primary;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ep-check-icon {
		color: #FFFFFF;
		font-size: 26rpx;
		font-weight: 700;
	}
	.ep-actions {
		display: flex;
		gap: 28rpx;
		margin-top: 40rpx;
	}
	.ep-clear,
	.ep-ok {
		flex: 1;
		height: 96rpx;
		line-height: 96rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: $font-body;
		font-weight: 700;
		letter-spacing: 4rpx;
	}
	.ep-clear {
		background: #FFFFFF;
		border: 3rpx solid #BFD8D6;
		color: $ti-primary;
	}
	.ep-ok {
		background: linear-gradient(135deg, #579292 0%, #4A8282 100%);
		color: #FFFFFF;
		box-shadow: $shadow-primary;
	}
</style>
