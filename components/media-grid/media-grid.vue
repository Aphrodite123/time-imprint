<template>
	<view class="mg">
		<!-- 图片网格 -->
		<view :class="['mg-grid', 'n' + imageList.length]" v-if="imageList.length">
			<image
				v-for="(img, i) in imageList"
				:key="i"
				:src="img"
				mode="aspectFill"
				class="mg-img"
				@click.stop="preview(i)"
			/>
		</view>
		<!-- 视频封面 -->
		<view v-if="video && showVideo" class="mg-video" @click.stop="playVideo">
			<video
				v-if="playing"
				:src="video.url"
				class="mg-video-player"
				controls
				autoplay
				object-fit="contain"
			></video>
			<block v-else>
				<image :src="video.thumbnailUrl || video.url" mode="aspectFill" class="mg-video-cover" />
				<view class="mg-video-badge">▶</view>
			</block>
		</view>
	</view>
</template>

<script>
	// 媒体网格:图片九宫格 + 视频(卡片模式下封面+角标,点击内嵌播放)
	export default {
		name: 'media-grid',
		props: {
			medias: { type: Array, default: () => [] },
			maxImages: { type: Number, default: 9 } // 卡片场景限制 3 张,详情展示全部
		},
		data() {
			return { playing: false }
		},
		computed: {
			imageList() {
				return this.medias.filter(m => m.type === 'image').map(m => m.url).slice(0, this.maxImages)
			},
			video() {
				return this.medias.find(m => m.type === 'video') || null
			},
			showVideo() {
				return !!(this.video && this.maxImages > 3)
			}
		},
		methods: {
			preview(i) {
				uni.previewImage({ urls: this.imageList, current: i })
			},
			playVideo() {
				this.playing = true
			}
		}
	}
</script>

<style lang="scss" scoped>
	.mg-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;

		.mg-img {
			width: 210rpx;
			height: 210rpx;
			border-radius: $radius-img;
			background: $ti-bg;
		}
		&.n1 .mg-img { width: 100%; height: 360rpx; }
		&.n2 .mg-img,
		&.n3 .mg-img { width: calc((100% - 24rpx) / 3); height: 210rpx; }
		&.n2 .mg-img { width: calc((100% - 12rpx) / 2); }
	}
	.mg-video {
		position: relative;
		margin-top: 12rpx;
		border-radius: $radius-img;
		overflow: hidden;

		.mg-video-cover {
			width: 100%;
			height: 360rpx;
			display: block;
			background: $ti-bg;
		}
		.mg-video-badge {
			position: absolute;
			left: 50%;
			top: 50%;
			transform: translate(-50%, -50%);
			width: 80rpx;
			height: 80rpx;
			line-height: 80rpx;
			text-align: center;
			border-radius: 50%;
			background: rgba(0, 0, 0, 0.45);
			color: #FFFFFF;
			font-size: 28rpx;
		}
		.mg-video-player {
			width: 100%;
			height: 400rpx;
		}
	}
</style>
