<template>
	<view class="st">
		<nav-bar title="设置" />

		<!-- 通用 -->
		<text class="st-group-label">通用</text>
		<view class="st-card">
			<view class="st-row">
				<text class="st-label">语言</text>
				<text class="st-val" @click="onLanguage">简体中文</text>
				<text class="st-arrow">›</text>
			</view>
			<view class="st-row">
				<text class="st-label">语音播放速度</text>
				<picker mode="selector" :range="rateLabels" @change="onRateChange">
					<text class="st-val">{{ rateLabel }}</text>
				</picker>
				<text class="st-arrow">›</text>
			</view>
			<view class="st-row">
				<text class="st-label">隐私与安全</text>
				<text class="st-val">仅自己可见</text>
				<text class="st-arrow" @click="go('/pages/mine/privacy')">›</text>
			</view>
		</view>

		<!-- 数据 -->
		<text class="st-group-label">数据</text>
		<view class="st-card">
			<view class="st-row" @click="go('/pages/mine/backup')">
				<text class="st-label">数据备份与恢复</text>
				<text class="st-arrow">›</text>
			</view>
			<view class="st-row" @click="go('/pages/mine/export')">
				<text class="st-label">导出全部数据</text>
				<text class="st-arrow">›</text>
			</view>
			<view class="st-row">
				<text class="st-label danger">清空所有数据</text>
				<text class="st-arrow" @click="onClear">›</text>
			</view>
		</view>

		<!-- 关于 -->
		<text class="st-group-label">关于</text>
		<view class="st-card">
			<view class="st-row">
				<text class="st-label">版本</text>
				<text class="st-val">v1.0.0</text>
			</view>
			<view class="st-row" @click="go('/pages/mine/about')">
				<text class="st-label">关于时光印记</text>
				<text class="st-arrow">›</text>
			</view>
		</view>

		<text class="st-foot">时光印记 v1.0.0 · 记录每一段人生故事</text>
	</view>
</template>

<script>
	// 设置:语音播放速度 / 数据管理 / 关于(播放速度实时作用于 voice-bar)
	import { clearAll } from '../../utils/db'

	const RATES = [0.75, 1.0, 1.25, 1.5, 2.0]

	export default {
		data() {
			return { rate: 1.0 }
		},
		computed: {
			rateLabels() {
				return RATES.map(r => r.toFixed(1) + 'x')
			},
			rateLabel() {
				return this.rate.toFixed(1) + 'x'
			}
		},
		onLoad() {
			const r = Number(uni.getStorageSync('ti_play_rate'))
			if (r > 0) this.rate = r
		},
		methods: {
			onLanguage() {
				uni.showToast({ title: '当前版本仅支持简体中文', icon: 'none' })
			},
			onRateChange(e) {
				this.rate = RATES[Number(e.detail.value)] || 1.0
				uni.setStorageSync('ti_play_rate', this.rate)
				uni.showToast({ title: '播放速度已设为 ' + this.rate.toFixed(1) + 'x', icon: 'none' })
			},
			onClear() {
				uni.showModal({
					title: '清空所有数据?',
					content: '所有印记、照片、语音与个人档案都将被删除,且无法恢复。建议先进行数据备份。',
					confirmColor: '#D96A5B',
					success: async r => {
						if (!r.confirm) return
						try {
							await clearAll()
							uni.showToast({ title: '已清空', icon: 'none' })
						} catch (e) {
							uni.showToast({ title: '清空失败:' + (e.message || e), icon: 'none' })
						}
					}
				})
			},
			go(url) {
				uni.navigateTo({ url })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.st {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 64rpx;
	}
	.st-group-label {
		display: block;
		font-size: 26rpx;
		font-weight: 700;
		color: $ti-text-3;
		letter-spacing: 2rpx;
		margin: 36rpx $page-pad 18rpx;
	}
	.st-card {
		margin: 0 $page-pad;
		background: $ti-card;
		border-radius: 44rpx;
		padding: 8rpx 36rpx;
		box-shadow: $shadow-card;
	}
	.st-row {
		display: flex;
		align-items: center;
		height: 108rpx;
		border-bottom: 2rpx solid $ti-bg;

		&:last-child {
			border-bottom: none;
		}
	}
	.st-label {
		flex: 1;
		font-size: 30rpx;
		font-weight: 700;
		color: $ti-navy;
	}
	.st-label.danger {
		color: $ti-danger;
	}
	.st-val {
		font-size: 26rpx;
		color: $ti-text-3;
	}
	.st-arrow {
		margin-left: 16rpx;
		font-size: 32rpx;
		color: #C9CEC9;
	}
	.st-foot {
		display: block;
		text-align: center;
		margin-top: 48rpx;
		font-size: 22rpx;
		color: #B9B2A0;
	}
</style>
