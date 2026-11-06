<template>
	<view class="ex">
		<!-- 导出说明 -->
		<view class="ti-card ex-card">
			<text class="ex-title">导出你的回忆录</text>
			<text class="ex-desc">将全部时光印记按时间线整理为一份文字回忆录,完整保存你的人生档案。</text>
			<view class="ti-btn ex-btn" @click="exportMemoir">导出回忆录(文字版)</view>
			<text v-if="resultText" class="ex-result">{{ resultText }}</text>
		</view>

		<!-- 素材包导出(App) -->
		<view class="ti-card ex-card">
			<text class="ex-title">导出媒体素材包</text>
			<text class="ex-desc">打包全部照片、语音、视频原文件。{{ isApp ? '' : '此功能需在 App 端使用。' }}</text>
			<view :class="['ti-btn', 'ex-btn', isApp ? '' : 'disabled']" @click="exportMedias">导出素材包(zip)</view>
			<text v-if="resultZip" class="ex-result">{{ resultZip }}</text>
		</view>
	</view>
</template>

<script>
	// 导出回忆录:文字回忆录 + 媒体素材包(需求 2.6)
	import { exportAll } from '../../utils/db'
	import { buildMemoir, exportText, exportMediaZip } from '../../utils/exporter'
	import { store } from '../../store'

	export default {
		data() {
			return {
				isApp: false,
				resultText: '',
				resultZip: ''
			}
		},
		onLoad() {
			// #ifdef APP-PLUS
			this.isApp = true
			// #endif
		},
		methods: {
			async exportMemoir() {
				uni.showLoading({ title: '正在生成', mask: true })
				try {
					const data = await exportAll()
					const content = buildMemoir(data.user, data.memories)
					const filename = `时光印纪回忆录_${new Date().toISOString().slice(0, 10)}.txt`
					const result = await exportText(content, filename)
					uni.hideLoading()
					this.resultText = result === 'clipboard'
						? '回忆录全文已复制到剪贴板,可粘贴保存'
						: `已导出:${result}`
					uni.showToast({ title: '导出成功', icon: 'success' })
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: e.message || '导出失败,请检查存储空间', icon: 'none' })
				}
			},
			async exportMedias() {
				if (!this.isApp) {
					return uni.showToast({ title: '素材包导出仅支持 App 端', icon: 'none' })
				}
				uni.showLoading({ title: '正在打包素材', mask: true })
				try {
					const path = await exportMediaZip()
					uni.hideLoading()
					this.resultZip = `素材包已导出:${path}`
					uni.showToast({ title: '导出成功', icon: 'success' })
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: e.message || '导出失败', icon: 'none' })
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.ex {
		min-height: 100vh;
		background: $ti-bg;
		padding: 24rpx $page-pad 60rpx;
		box-sizing: border-box;
	}
	.ex-card {
		margin-bottom: 24rpx;
	}
	.ex-title {
		display: block;
		font-size: $font-sub;
		font-weight: 500;
		color: $ti-text;
	}
	.ex-desc {
		display: block;
		margin-top: 16rpx;
		font-size: $font-body;
		color: $ti-text-2;
		line-height: 1.7;
	}
	.ex-btn {
		margin-top: 32rpx;
	}
	.ex-result {
		display: block;
		margin-top: 20rpx;
		font-size: $font-small;
		color: $ti-text-3;
		word-break: break-all;
	}
</style>
