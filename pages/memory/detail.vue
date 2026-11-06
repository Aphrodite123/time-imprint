<template>
	<view class="dt">
		<!-- 背景装饰 -->
		<view class="dt-blob-teal"></view>
		<view class="dt-blob-orange"></view>

		<nav-bar title="时光印记" :accent="true" />

		<view class="dt-body" v-if="memory">
			<view class="dt-card">
				<view class="dt-head">
					<text class="dt-date">{{ fmtCN(memory.eventDate) }}</text>
					<text v-if="memory.isHighlight" class="dt-hl-link">高光 ›</text>
				</view>

				<!-- 标签行 -->
				<view class="dt-tags">
					<view v-if="emotion" class="dt-tag-item">
						<view class="dt-dot"></view>
						<text class="dt-tag-text teal">{{ emotion.label }}</text>
					</view>
					<view v-if="memory.lifeStage" class="dt-tag-item">
						<image class="dt-pin" src="/static/entries/stage.png" mode="aspectFit" />
						<text class="dt-tag-text teal">{{ memory.lifeStage }}</text>
					</view>
					<view v-if="memory.isHighlight" class="dt-tag-item">
						<text class="dt-star">★</text>
						<text class="dt-tag-text navy">高光时刻</text>
					</view>
				</view>

				<text v-if="memory.title" class="dt-title">{{ memory.title }}</text>
				<text v-if="memory.content" class="dt-content">{{ memory.content }}</text>
				<media-grid v-if="medias.length" :medias="medias" :max-images="9" class="dt-media" />
				<voice-bar v-if="voice" :src="voice.url" :duration="voice.duration" class="dt-voice" />
			</view>

			<!-- 操作按钮 -->
			<view class="dt-actions">
				<view class="dt-btn outline" @click="goEdit">编 辑</view>
				<view class="dt-btn solid" @click="onDelete">删 除</view>
			</view>
		</view>
	</view>
</template>

<script>
	// 记录详情页:完整图文语音视频内容(PRD 3.3.2)
	import { getMemory, deleteMemory } from '../../utils/db'
	import { removeFile } from '../../utils/media'
	import { fmtCN } from '../../utils/date'
	import { emotionOf } from '../../utils/stage'

	export default {
		data() {
			return {
				memory: null
			}
		},
		computed: {
			medias() {
				return (this.memory && this.memory.medias) || []
			},
			voice() {
				return this.medias.find(m => m.type === 'voice') || null
			},
			emotion() {
				return this.memory ? emotionOf(this.memory.emotion) : null
			}
		},
		onLoad(opt) {
			this.id = opt.id || ''
		},
		onShow() {
			this.load()
		},
		methods: {
			fmtCN,
			async load() {
				const m = await getMemory(this.id)
				if (!m) {
					uni.showToast({ title: '记录不存在', icon: 'none' })
					setTimeout(() => uni.navigateBack(), 600)
					return
				}
				this.memory = m
			},
			goEdit() {
				uni.navigateTo({ url: '/pages/memory/edit?id=' + this.id })
			},
			onDelete() {
				uni.showModal({
					title: '删除这条印记?',
					content: '删除后无法恢复,关联的媒体文件将一并删除',
					confirmColor: '#D96A5B',
					success: async r => {
						if (!r.confirm) return
						for (const md of this.medias) removeFile(md.url)
						await deleteMemory(this.id)
						uni.showToast({ title: '已删除', icon: 'none' })
						setTimeout(() => uni.navigateBack(), 600)
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.dt {
		min-height: 100vh;
		background: $ti-bg;
		position: relative;
		overflow: hidden;
	}
	.dt-blob-teal {
		position: absolute;
		right: -140rpx;
		bottom: -80rpx;
		width: 560rpx;
		height: 560rpx;
		border-radius: 58% 42% 55% 45% / 55% 48% 52% 45%;
		background: #7FB0AD;
		opacity: 0.55;
	}
	.dt-blob-orange {
		position: absolute;
		left: -120rpx;
		bottom: -140rpx;
		width: 380rpx;
		height: 380rpx;
		border-radius: 50%;
		background: #F6D9AE;
	}
	.dt-body {
		position: relative;
		z-index: 1;
		padding: 20rpx 32rpx calc(64rpx + env(safe-area-inset-bottom));
	}
	.dt-card {
		background: $ti-card;
		border-radius: 48rpx;
		padding: 44rpx 40rpx;
		box-shadow: $shadow-float;
	}
	.dt-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.dt-date {
		font-size: 30rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.dt-hl-link {
		font-size: $font-small;
		font-weight: 600;
		color: $ti-text-3;
	}
	.dt-tags {
		display: flex;
		gap: 36rpx;
		margin-top: 28rpx;
		flex-wrap: wrap;
	}
	.dt-tag-item {
		display: flex;
		align-items: center;
		gap: 10rpx;
	}
	.dt-dot {
		width: 24rpx;
		height: 24rpx;
		border-radius: 50%;
		background: $ti-primary;
	}
	.dt-pin {
		width: 30rpx;
		height: 30rpx;
	}
	.dt-star {
		color: $ti-accent;
		font-size: 32rpx;
	}
	.dt-tag-text {
		font-size: 28rpx;
		font-weight: 700;
	}
	.dt-tag-text.teal {
		color: $ti-primary-deep;
	}
	.dt-tag-text.navy {
		color: $ti-navy;
	}
	.dt-title {
		display: block;
		margin-top: 30rpx;
		font-size: 44rpx;
		font-weight: 800;
		color: #1B1B1B;
		line-height: 1.4;
	}
	.dt-content {
		display: block;
		margin-top: 22rpx;
		font-size: 30rpx;
		color: $ti-text-2;
		line-height: 1.9;
		word-break: break-all;
	}
	.dt-media {
		margin-top: 30rpx;
	}
	.dt-voice {
		margin-top: 30rpx;
	}
	.dt-actions {
		display: flex;
		gap: 28rpx;
		margin-top: 40rpx;
		padding: 0 4rpx;
	}
	.dt-btn {
		flex: 1;
		height: 108rpx;
		line-height: 104rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 30rpx;
		font-weight: 700;
		letter-spacing: 8rpx;
		box-sizing: border-box;
	}
	.dt-btn.outline {
		border: 3rpx solid #BFD8D6;
		color: $ti-primary;
		background: $ti-card;
	}
	.dt-btn.solid {
		background: linear-gradient(135deg, #579292 0%, #4A8282 100%);
		color: #FFFFFF;
		box-shadow: $shadow-primary;
	}
</style>
