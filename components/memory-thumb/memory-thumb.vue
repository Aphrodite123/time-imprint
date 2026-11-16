<template>
	<view :class="['mt', size === 'lg' ? 'lg' : '']">
		<!-- 缩略图: 第一张照片 > 视频首帧 > 语音声波 > 心情切图(未选心情用默认嫩芽), 与记录列表同一套规则 -->
		<image v-if="firstImage" :src="firstImage" mode="aspectFill" class="mt-thumb" />
		<!-- 视频: 列表模式(sm)展示第一帧角标, 点击进详情播放; 大图模式(lg)启用原生控件内联播放 -->
		<view v-else-if="firstVideo" class="mt-thumb mt-thumb-media">
			<video
				class="mt-thumb-video"
				:src="firstVideo.url"
				object-fit="cover"
				:controls="large"
				:autoplay="false"
				:muted="!large"
				:show-center-play-btn="large"
				:show-play-btn="large"
			/>
			<view v-if="!large" class="mt-thumb-play center"><view class="mt-play-tri lg"></view></view>
		</view>
		<!-- 语音: 声波切图 + 播放按钮, 点击内联播放/停止 -->
		<view
			v-else-if="firstVoice"
			class="mt-thumb mt-thumb-media mt-thumb-face"
			:class="'tbg-' + faceOf"
			@click.stop="toggleVoice"
		>
			<view class="mt-wave">
				<view v-for="(h, i) in waveBars" :key="i" class="mt-wave-bar" :style="{ height: h + 'rpx' }"></view>
			</view>
			<view class="mt-thumb-play">
				<view v-if="!playing" class="mt-play-tri"></view>
				<template v-else>
					<view class="mt-pause-bar"></view>
					<view class="mt-pause-bar"></view>
				</template>
			</view>
		</view>
		<!-- 心情表情切图 -->
		<view v-else :class="['mt-thumb', 'mt-thumb-face', 'tbg-' + faceOf]">
			<view v-if="faceSpec.sprout" class="fc-sprout">
				<view class="sp-leaf l"></view>
				<view class="sp-leaf r"></view>
				<view class="sp-stem"></view>
			</view>
			<view v-else class="fc">
				<view v-if="faceSpec.brow" class="fc-brow l"></view>
				<view v-if="faceSpec.brow" class="fc-brow r"></view>
				<view :class="['fc-eye', 'l', 'is-' + faceSpec.eyes]"></view>
				<view :class="['fc-eye', 'r', 'is-' + faceSpec.eyes]"></view>
				<view :class="['fc-mouth', 'is-' + faceSpec.mouth]"></view>
				<view v-if="faceSpec.accent === 'drop'" class="fc-drop"></view>
				<text v-else-if="faceSpec.accent === 'heart'" class="fc-accent">♥</text>
				<text v-else-if="faceSpec.accent === 'q'" class="fc-accent">?</text>
			</view>
		</view>
	</view>
</template>

<script>
	// 列表缩略图切图: 按媒体素材自动选择展示样式, 供记录/高光等列表复用
	// 心情切图配置(与 EMOTIONS key 对应): 眼型/嘴型/点缀; default 为未选心情的嫩芽
	const FACE_MAP = {
		happy: { eyes: 'dot', mouth: 'open' }, // 开心: 圆眼 + 张嘴大笑
		warm: { eyes: 'arc', mouth: 'smile' }, // 温暖: 弯弯眼 + 微笑
		calm: { eyes: 'line', mouth: 'flat' }, // 平静: 线眼 + 平嘴
		touched: { eyes: 'arc', mouth: 'open', accent: 'drop' }, // 感动: 弯眼 + 张嘴 + 泪光
		sad: { eyes: 'dot', mouth: 'frown', accent: 'drop' }, // 难过: 圆眼 + 撇嘴 + 泪滴
		love: { eyes: 'arc', mouth: 'smile', accent: 'heart' }, // 热爱: 弯眼 + 微笑 + 爱心
		upset: { eyes: 'line', mouth: 'frown', brow: true }, // 郁闷: 斜眉 + 线眼 + 撇嘴
		lost: { eyes: 'ring', mouth: 'flat', accent: 'q' }, // 迷茫: 空心眼 + 问号
		default: { sprout: true } // 未选心情: 嫩芽
	}

	import { voiceState, toggleVoiceUrl, releaseVoice } from '../../utils/voice-player'

	export default {
		name: 'memory-thumb',
		props: {
			memory: { type: Object, default: () => ({}) },
			// sm: 列表缩略图(默认); lg: 大图模式(漫游卡等), 切图铺满父容器并放大内部元素
			size: { type: String, default: 'sm' }
		},
		data() {
			return {
				waveBars: [14, 26, 40, 26, 14] // 声波切图的柱高
			}
		},
		computed: {
			// 是否大图模式(漫游卡等): 视频启用原生控件内联播放, 语音切图放大
			large() {
				return this.size === 'lg'
			},
			// 缩略图素材: 第一张照片 / 视频 / 语音
			firstImage() {
				const img = (this.memory.medias || []).find(x => x.type === 'image')
				return img ? img.url : ''
			},
			firstVideo() {
				return (this.memory.medias || []).find(x => x.type === 'video') || null
			},
			firstVoice() {
				return (this.memory.medias || []).find(x => x.type === 'voice') || null
			},
			// 本条记录的全部语音地址
			voiceUrls() {
				return (this.memory.medias || []).filter(x => x.type === 'voice').map(x => x.url)
			},
			// 播放状态(联动全局共享播放器): 列表看本条是否在播; 大图模式本卡任一语音在播即播放中
			playing() {
				if (!voiceState.playing || !voiceState.url) return false
				return this.large
					? this.voiceUrls.includes(voiceState.url)
					: !!this.firstVoice && voiceState.url === this.firstVoice.url
			},
			// 心情切图: 未选心情回退到默认嫩芽
			faceOf() {
				return this.memory.emotion || 'default'
			},
			faceSpec() {
				return FACE_MAP[this.faceOf] || FACE_MAP.default
			}
		},
		beforeUnmount() {
			// 本卡的语音还在全局播放中(切页/换卡/列表回收)时停掉
			if (this.voiceUrls.includes(voiceState.url)) releaseVoice(voiceState.url)
		},
		methods: {
			// 声波切图上的播放键: 大图模式是主控——无语音在播默认播第一条, 已有在播/暂停的控制当前这条;
			// 列表模式控制本条自己的语音
			toggleVoice() {
				const v = this.firstVoice
				if (!v) return
				const url = this.large && voiceState.url && this.voiceUrls.includes(voiceState.url)
					? voiceState.url
					: v.url
				toggleVoiceUrl(url)
			}
		}
	}
</script>

<style lang="scss" scoped>
	.mt-thumb {
		width: 124rpx;
		height: 124rpx;
		border-radius: 32rpx;
		flex-shrink: 0;
		background: $ti-bg;
	}
	.mt-thumb-media {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.mt-thumb-video {
		width: 100%;
		height: 100%;
	}
	.mt-thumb-face {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* ===== 大图模式(lg): 铺满父容器并放大内部元素, 选取规则与列表缩略图一致 ===== */
	/* 根节点也须撑满, 否则内层 height:100% 相对 auto 父级会塌缩为 0 */
	.mt.lg {
		width: 100%;
		height: 100%;
	}
	.mt.lg .mt-thumb {
		width: 100%;
		height: 100%;
		border-radius: 40rpx;
	}
	.mt.lg .fc,
	.mt.lg .fc-sprout {
		transform: scale(2.2);
	}
	.mt.lg .mt-wave {
		transform: scale(2);
	}
	.mt.lg .mt-thumb-play {
		right: 20rpx;
		bottom: 20rpx;
		width: 64rpx;
		height: 64rpx;
	}
	.mt.lg .mt-play-tri {
		border-width: 12rpx 0 12rpx 20rpx;
		margin-left: 8rpx;
	}
	.mt.lg .mt-pause-bar {
		height: 26rpx;
	}

	/* ===== 心情切图配色: 渐变底 + 特征色(--fc 供内部元素继承) ===== */
	.tbg-happy { background: linear-gradient(150deg, #FFEDC2, #FFD98E); --fc: #C08A2D; } /* 开心: 暖黄 */
	.tbg-warm { background: linear-gradient(150deg, #FFEBDD, #FFD3B8); --fc: #C4764B; } /* 温暖: 蜜桃 */
	.tbg-calm { background: linear-gradient(150deg, #E7F3F1, #CFE8E4); --fc: #3E7373; } /* 平静: 青瓷 */
	.tbg-touched { background: linear-gradient(150deg, #FCEAE7, #F8D3CD); --fc: #C06A60; } /* 感动: 粉樱 */
	.tbg-sad { background: linear-gradient(150deg, #E3EDF5, #CBDEEC); --fc: #5C7FA0; } /* 难过: 雾蓝 */
	.tbg-love { background: linear-gradient(150deg, #FDE6EB, #F9CBD6); --fc: #D06A82; } /* 热爱: 蔷薇 */
	.tbg-upset { background: linear-gradient(150deg, #EAE9F2, #D5D2E4); --fc: #7B77A2; } /* 郁闷: 灰紫 */
	.tbg-lost { background: linear-gradient(150deg, #40576C, #26394B); --fc: #F4EFE4; } /* 迷茫: 夜海军 */
	.tbg-default { background: linear-gradient(150deg, #F5EFE2, #E9DFC9); --fc: #7FA06A; } /* 未选心情: 米杏 */

	/* ===== 表情脸 ===== */
	.fc {
		position: relative;
		width: 64rpx;
		height: 56rpx;
	}
	.fc-eye {
		position: absolute;
		top: 14rpx;
		width: 10rpx;
		height: 10rpx;
	}
	.fc-eye.l { left: 6rpx; }
	.fc-eye.r { right: 6rpx; }
	.fc-eye.is-dot { border-radius: 50%; background: var(--fc); }
	.fc-eye.is-line { top: 17rpx; height: 6rpx; border-radius: 3rpx; background: var(--fc); }
	.fc-eye.is-arc {
		top: 12rpx;
		width: 16rpx;
		height: 10rpx;
		border: 4rpx solid var(--fc);
		border-bottom: none;
		border-radius: 16rpx 16rpx 0 0;
		box-sizing: border-box;
	}
	.fc-eye.is-ring { border-radius: 50%; border: 4rpx solid var(--fc); box-sizing: border-box; }
	.fc-brow {
		position: absolute;
		top: 6rpx;
		width: 14rpx;
		height: 4rpx;
		border-radius: 2rpx;
		background: var(--fc);
	}
	.fc-brow.l { left: 3rpx; transform: rotate(16deg); }
	.fc-brow.r { right: 3rpx; transform: rotate(-16deg); }
	.fc-mouth {
		position: absolute;
		left: 50%;
		bottom: 0;
		transform: translateX(-50%);
	}
	.fc-mouth.is-smile {
		width: 32rpx;
		height: 16rpx;
		border-bottom: 5rpx solid var(--fc);
		border-radius: 0 0 32rpx 32rpx;
		box-sizing: border-box;
	}
	.fc-mouth.is-open {
		width: 32rpx;
		height: 18rpx;
		background: var(--fc);
		border-radius: 4rpx 4rpx 32rpx 32rpx;
	}
	.fc-mouth.is-flat {
		bottom: 4rpx;
		width: 26rpx;
		height: 6rpx;
		border-radius: 3rpx;
		background: var(--fc);
	}
	.fc-mouth.is-frown {
		width: 30rpx;
		height: 12rpx;
		border-top: 5rpx solid var(--fc);
		border-radius: 30rpx 30rpx 0 0;
		box-sizing: border-box;
	}
	.fc-drop {
		position: absolute;
		top: 28rpx;
		right: 0;
		width: 12rpx;
		height: 12rpx;
		background: var(--fc);
		border-radius: 0 50% 50% 50%;
		transform: rotate(45deg);
		opacity: 0.85;
	}
	.fc-accent {
		position: absolute;
		top: -6rpx;
		right: -12rpx;
		color: var(--fc);
		font-size: 22rpx;
		line-height: 1;
		font-weight: 800;
	}

	/* 默认切图: 嫩芽 */
	.fc-sprout {
		position: relative;
		width: 56rpx;
		height: 56rpx;
	}
	.sp-stem {
		position: absolute;
		left: 50%;
		bottom: 4rpx;
		transform: translateX(-50%);
		width: 7rpx;
		height: 26rpx;
		border-radius: 4rpx;
		background: var(--fc);
	}
	.sp-leaf {
		position: absolute;
		top: 8rpx;
		width: 20rpx;
		height: 20rpx;
		border-radius: 0 100% 0 100%;
		background: var(--fc);
	}
	.sp-leaf.l { left: 6rpx; transform: rotate(-12deg); }
	.sp-leaf.r { right: 6rpx; transform: rotate(78deg); opacity: 0.65; }

	/* ===== 语音声波切图 ===== */
	.mt-wave {
		display: flex;
		align-items: center;
		gap: 7rpx;
	}
	.mt-wave-bar {
		width: 7rpx;
		border-radius: 4rpx;
		background: var(--fc);
	}

	/* ===== 切图上的播放按钮 ===== */
	.mt-thumb-play {
		position: absolute;
		right: 8rpx;
		bottom: 8rpx;
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.92);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2rpx 8rpx rgba(27, 59, 87, 0.18);
	}
	.mt-thumb-play.center {
		right: auto;
		bottom: auto;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 56rpx;
		height: 56rpx;
		background: rgba(255, 255, 255, 0.85);
	}
	.mt-play-tri {
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 8rpx 0 8rpx 13rpx;
		border-color: transparent transparent transparent #4F8B8B;
		margin-left: 5rpx;
	}
	.mt-play-tri.lg {
		border-width: 11rpx 0 11rpx 18rpx;
		margin-left: 7rpx;
	}
	.mt-pause-bar {
		width: 6rpx;
		height: 16rpx;
		border-radius: 2rpx;
		background: #4F8B8B;
		margin: 0 3rpx;
	}
</style>
