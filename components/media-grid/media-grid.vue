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
		<!-- 视频列表(支持多个): 封面/首帧 + 角标, 点击原地播放 -->
		<view v-for="(v, i) in videoList" :key="'v' + i" class="mg-video" @click.stop="playVideo(v)">
			<video
				v-if="playing === v.url"
				:src="v.url"
				class="mg-video-player"
				controls
				autoplay
				object-fit="contain"
			></video>
			<block v-else>
				<image v-if="v.thumbnailUrl" :src="v.thumbnailUrl" mode="aspectFill" class="mg-video-cover" />
				<view v-else class="mg-video-cover mg-video-dark"></view>
				<view class="mg-video-badge">▶</view>
			</block>
		</view>
	</view>
</template>

<script>
	// 媒体网格: 图片九宫格 + 视频列表(封面+角标, 点击原地播放)
	export default {
		name: 'media-grid',
		props: {
			medias: { type: Array, default: () => [] },
			maxImages: { type: Number, default: 9 } // 卡片场景限制 3 张,详情展示全部
		},
		data() {
			return { playing: '' } // 正在内嵌播放的视频 url
		},
		computed: {
			imageList() {
				return this.medias.filter(m => m.type === 'image').map(m => m.url).slice(0, this.maxImages)
			},
			videoList() {
				return this.medias.filter(m => m.type === 'video')
			},
			showVideo() {
				return !!(this.videoList.length && this.maxImages > 3)
			}
		},
		methods: {
			preview(i) {
				uni.previewImage({ urls: this.imageList, current: i })
			},
			playVideo(v) {
				this.playing = v.url
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
	}
	.mg-video-cover {
		width: 100%;
		height: 360rpx;
		display: block;
		background: #26394B;
	}
	.mg-video-dark {
		background: linear-gradient(150deg, #3E566C, #26394B);
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
</style>
