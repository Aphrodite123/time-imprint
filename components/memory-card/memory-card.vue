<template>
	<view class="mc" @click="$emit('click', memory)" @longpress="$emit('longpress', memory)">
		<view class="mc-head">
			<text class="mc-date">{{ dateCN }}</text>
			<view class="mc-head-right">
				<text v-if="memory.isHighlight" class="mc-star">★</text>
				<text v-if="memory.lifeStage" class="ti-tag">{{ memory.lifeStage }}</text>
			</view>
		</view>
		<text v-if="memory.title" class="mc-title">{{ memory.title }}</text>
		<text v-if="memory.content" class="mc-content">{{ memory.content }}</text>
		<media-grid v-if="medias.length" :medias="medias" :max-images="3" class="mc-media" />
		<voice-bar v-if="voice" :src="voice.url" :duration="voice.duration" class="mc-voice" />
		<view v-if="emotion" class="mc-emotion">
			<text class="mc-emotion-emoji">{{ emotion.emoji }}</text>
			<text class="mc-emotion-label">{{ emotion.label }}</text>
		</view>
	</view>
</template>

<script>
	// 时光印记卡片(时间轴/列表通用)
	import { fmtCN } from '../../utils/date'
	import { emotionOf } from '../../utils/stage'

	export default {
		name: 'memory-card',
		props: {
			memory: { type: Object, required: true }
		},
		computed: {
			dateCN() {
				return fmtCN(this.memory.eventDate)
			},
			medias() {
				return this.memory.medias || []
			},
			voice() {
				return this.medias.find(m => m.type === 'voice') || null
			},
			emotion() {
				return emotionOf(this.memory.emotion)
			}
		}
	}
</script>

<style lang="scss" scoped>
	.mc {
		background: $ti-card;
		border-radius: 40rpx;
		padding: 32rpx;
		box-shadow: $shadow-card;
	}
	.mc-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.mc-date {
		font-size: $font-small;
		font-weight: 600;
		color: $ti-text-3;
	}
	.mc-head-right {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}
	.mc-star {
		font-size: 30rpx;
		color: $ti-accent;
	}
	.mc-title {
		display: block;
		margin-top: 16rpx;
		font-size: 30rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.mc-content {
		display: block;
		margin-top: 12rpx;
		font-size: $font-body;
		color: $ti-text-2;
		line-height: 1.7;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}
	.mc-media {
		margin-top: 20rpx;
	}
	.mc-voice {
		margin-top: 20rpx;
	}
	.mc-emotion {
		display: flex;
		align-items: center;
		margin-top: 16rpx;
		gap: 8rpx;
	}
	.mc-emotion-emoji {
		font-size: 36rpx;
	}
	.mc-emotion-label {
		font-size: $font-small;
		font-weight: 600;
		color: $ti-navy;
	}
</style>
