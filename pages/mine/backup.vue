<template>
	<view class="bk">
		<!-- 备份概览 -->
		<view class="ti-card bk-overview">
			<text class="bk-overview-title">当前数据</text>
			<view class="bk-overview-grid">
				<view class="bk-overview-item">
					<text class="bk-num">{{ stats.total }}</text>
					<text class="bk-unit">条印记</text>
				</view>
				<view class="bk-overview-item">
					<text class="bk-num">{{ stats.images }}</text>
					<text class="bk-unit">张照片</text>
				</view>
				<view class="bk-overview-item">
					<text class="bk-num">{{ stats.voices }}</text>
					<text class="bk-unit">条语音</text>
				</view>
			</view>
		</view>

		<!-- 本地备份 -->
		<view class="ti-card bk-card">
			<text class="bk-card-title">本地备份</text>
			<text class="bk-card-desc">将全部文字与档案导出为备份文件,可随时恢复。</text>
			<view class="bk-btn-row">
				<view class="bk-btn solid" @click="createBackup">创建备份</view>
				<view class="bk-btn outline" @click="restoreBackup">恢复备份</view>
			</view>
			<text v-if="lastBackupPath" class="bk-path">最近备份:{{ lastBackupPath }}</text>
		</view>

		<!-- 云端备份 -->
		<view class="ti-card bk-card">
			<view class="bk-card-head">
				<text class="bk-card-title">云端加密备份</text>
				<text class="bk-soon">即将上线</text>
			</view>
			<text class="bk-card-desc">多设备同步,备份数据全程加密存储,仅你本人可解密。</text>
		</view>
	</view>
</template>

<script>
	// 数据备份:本地备份/恢复,云端加密备份占位(PRD 3.3.5 / 2.6)
	import { exportAll, importAll, getStats } from '../../utils/db'
	import { exportBackup, pickBackupFile } from '../../utils/exporter'
	import { refreshUser } from '../../store'

	export default {
		data() {
			return {
				stats: { total: 0, images: 0, voices: 0 },
				lastBackupPath: ''
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			async load() {
				this.stats = await getStats()
			},
			async createBackup() {
				uni.showLoading({ title: '正在备份', mask: true })
				try {
					const data = await exportAll()
					const json = JSON.stringify(data)
					const result = await exportBackup(json)
					uni.hideLoading()
					// App 端返回文件路径;小程序端为剪贴板
					if (result === 'clipboard') {
						uni.showModal({ title: '备份成功', content: '备份数据已复制到剪贴板,请粘贴保存到安全位置', showCancel: false })
					} else {
						this.lastBackupPath = result
						uni.showModal({ title: '备份成功', content: `备份文件已保存到:${result}`, showCancel: false })
					}
				} catch (e) {
					uni.hideLoading()
					// 存储空间不足提示(异常场景 3.8)
					uni.showToast({ title: e.message || '备份失败,请检查存储空间', icon: 'none' })
				}
			},
			restoreBackup() {
				uni.showModal({
					title: '恢复备份',
					content: '恢复将覆盖当前全部数据,确定继续?',
					success: async r => {
						if (!r.confirm) return
						try {
							const text = await pickBackupFile()
							const data = JSON.parse(text)
							uni.showLoading({ title: '正在恢复', mask: true })
							await importAll(data)
							await refreshUser()
							uni.hideLoading()
							this.load()
							uni.showToast({ title: '恢复完成', icon: 'success' })
						} catch (e) {
							uni.hideLoading()
							uni.showToast({ title: e.message || '恢复失败', icon: 'none' })
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.bk {
		min-height: 100vh;
		background: $ti-bg;
		padding: 24rpx $page-pad 60rpx;
		box-sizing: border-box;
	}
	.bk-overview {
		background: linear-gradient(135deg, #5F9898 0%, #4A8282 100%);
		color: #FFFFFF;
	}
	.bk-overview-title {
		font-size: $font-sub;
		font-weight: 500;
	}
	.bk-overview-grid {
		display: flex;
		margin-top: 32rpx;
	}
	.bk-overview-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4rpx;
	}
	.bk-num {
		font-size: 48rpx;
		font-weight: bold;
	}
	.bk-unit {
		font-size: $font-small;
		opacity: 0.85;
	}
	.bk-card {
		margin-top: 24rpx;
	}
	.bk-card-head {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}
	.bk-card-title {
		font-size: $font-sub;
		font-weight: 500;
		color: $ti-text;
	}
	.bk-soon {
		font-size: $font-small;
		color: $ti-accent;
		background: $ti-accent-light;
		border-radius: $radius-tag;
		padding: 4rpx 16rpx;
	}
	.bk-card-desc {
		display: block;
		margin-top: 16rpx;
		font-size: $font-body;
		color: $ti-text-2;
		line-height: 1.7;
	}
	.bk-btn-row {
		display: flex;
		gap: 24rpx;
		margin-top: 32rpx;
	}
	.bk-btn {
		flex: 1;
		height: 80rpx;
		line-height: 80rpx;
		text-align: center;
		border-radius: $radius-btn;
		font-size: $font-body;
		font-weight: 500;
	}
	.bk-btn.solid {
		background: $ti-primary;
		color: #FFFFFF;
	}
	.bk-btn.outline {
		border: 2rpx solid $ti-primary;
		color: $ti-primary;
	}
	.bk-path {
		display: block;
		margin-top: 20rpx;
		font-size: $font-small;
		color: $ti-text-3;
		word-break: break-all;
	}
</style>
