<template>
	<view class="pv">
		<!-- 隐私规则说明 -->
		<view class="ti-card pv-card">
			<text class="pv-card-title">隐私规则</text>
			<view class="pv-rule" v-for="(r, i) in rules" :key="i">
				<text class="pv-rule-icon">✓</text>
				<text class="pv-rule-text">{{ r }}</text>
			</view>
		</view>

		<!-- 可选安全项 -->
		<view class="ti-card pv-card">
			<view class="pv-switch-row">
				<view class="pv-switch-info">
					<text class="pv-switch-label">生物识别锁</text>
					<text class="pv-switch-desc">打开 App 时需验证指纹/面容</text>
				</view>
				<switch checked disabled color="#4F8B8B" />
			</view>
			<view class="ti-divider"></view>
			<view class="pv-switch-row">
				<view class="pv-switch-info">
					<text class="pv-switch-label">本地存储加密</text>
					<text class="pv-switch-desc">记录数据仅保存在本机私有目录</text>
				</view>
				<switch :checked="true" disabled color="#4F8B8B" />
			</view>
		</view>

		<!-- 清空数据 -->
		<view class="ti-card pv-card">
			<text class="pv-card-title danger">清空数据</text>
			<text class="pv-card-desc">删除设备上的全部印记、媒体与档案,操作不可恢复。</text>
			<view class="pv-clear-btn" @click="clearData">清空全部本地记录</view>
		</view>
	</view>
</template>

<script>
	// 隐私设置:隐私规则说明 + 清空数据(PRD 3.3.5)
	import { clearAll } from '../../utils/db'
	import { refreshUser } from '../../store'

	export default {
		data() {
			return {
				rules: [
					'所有记录默认私有,没有公开分享',
					'没有社交广场,没有任何人可以看到你的档案',
					'基础数据完全保存在本地设备中',
					'云端备份(如开启)全程加密存储'
				]
			}
		},
		methods: {
			clearData() {
				uni.showModal({
					title: '清空全部数据?',
					content: '所有时光印记、媒体文件与个人档案将被永久删除,此操作无法恢复。',
					confirmText: '清空',
					confirmColor: '#D96A5B',
					success: async r => {
						if (!r.confirm) return
						// 二次确认
						uni.showModal({
							title: '再次确认',
							content: '真的要删除全部人生档案吗?',
							confirmText: '删除',
							confirmColor: '#D96A5B',
							success: async rr => {
								if (!rr.confirm) return
								await clearAll()
								await refreshUser()
								uni.showToast({ title: '已清空', icon: 'none' })
							}
						})
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.pv {
		min-height: 100vh;
		background: $ti-bg;
		padding: 24rpx $page-pad 60rpx;
		box-sizing: border-box;
	}
	.pv-card {
		margin-bottom: 24rpx;
	}
	.pv-card-title {
		font-size: $font-sub;
		font-weight: 500;
		color: $ti-text;
	}
	.pv-card-title.danger {
		color: $ti-danger;
	}
	.pv-card-desc {
		display: block;
		margin-top: 16rpx;
		font-size: $font-body;
		color: $ti-text-2;
		line-height: 1.7;
	}
	.pv-rule {
		display: flex;
		align-items: flex-start;
		gap: 16rpx;
		margin-top: 24rpx;
	}
	.pv-rule-icon {
		color: $ti-success;
		font-size: $font-body;
		flex-shrink: 0;
	}
	.pv-rule-text {
		font-size: $font-body;
		color: $ti-text-2;
		line-height: 1.6;
	}
	.pv-switch-row {
		display: flex;
		align-items: center;
		padding: 24rpx 0;
	}
	.pv-switch-info {
		flex: 1;
	}
	.pv-switch-label {
		display: block;
		font-size: $font-body;
		color: $ti-text;
	}
	.pv-switch-desc {
		display: block;
		margin-top: 6rpx;
		font-size: $font-small;
		color: $ti-text-3;
	}
	.pv-clear-btn {
		margin-top: 32rpx;
		height: $height-btn;
		line-height: $height-btn;
		text-align: center;
		border-radius: $radius-btn;
		border: 2rpx solid $ti-danger;
		color: $ti-danger;
		font-size: $font-body;
		font-weight: 500;
	}
</style>
