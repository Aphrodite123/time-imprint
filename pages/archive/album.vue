<template>
	<view class="al">
		<nav-bar title="高光纪念册" subtitle="把高光时刻，装订成册" />

		<view v-if="albums.length" class="al-body">
			<view class="al-sum">
				<text>共 <text class="num">{{ cards.length }}</text> 张纪念照 · <text class="num">{{ albums.length }}</text> 册</text>
				<text class="al-sum-hint">按年份自动成册</text>
			</view>

			<view v-for="a in albums" :key="a.year" class="al-book" @click="openAlbum(a)">
				<view class="al-cover-wrap">
					<view class="al-pages"></view>
					<view class="al-cover">
						<photo-card :card="a.cover" size="cover" w="172rpx" class="al-cover-card" />
						<view class="al-spine"></view>
						<text class="al-year">{{ a.year }}</text>
					</view>
				</view>
				<view class="al-meta">
					<text class="al-title">{{ a.year }} 年</text>
					<text class="al-count">{{ a.count }} 张纪念照</text>
					<text class="al-last">最近：{{ fmtShort(a.lastDate) }}</text>
					<text v-if="a.year === currentYear" class="al-tag">进行中</text>
				</view>
				<text class="al-chev">›</text>
			</view>

			<view class="al-tip">纪念照会按发生年份自动归册，不需要手动整理。</view>
		</view>

		<view v-else-if="!loading" class="al-empty">
			<view class="al-art">
				<view class="al-p"></view>
				<view class="al-p"></view>
				<view class="al-p add"><text>+</text></view>
				<text class="al-spark s1">✦</text>
				<text class="al-spark s2">✦</text>
			</view>
			<text class="al-empty-title">还没有纪念照</text>
			<text class="al-empty-sub">把三星以上的高光时刻{{ '\n' }}做成一册可以翻看的纪念册</text>
			<view class="al-empty-btn" @click="goCreate()">做第一张</view>
		</view>

		<view v-if="albums.length" class="al-fab" @click="goCreate()">＋ 做一张纪念照</view>
		<tab-bar current="archive" />
	</view>
</template>

<script>
	// 高光纪念册: 按年份成册的纪念照集合
	import { listPhotoCards } from '../../utils/db'
	import { groupByYear } from '../../utils/album'

	import { appShare, appShareTimeline } from '../../utils/share'
	export default {
		onShareAppMessage() {
			return appShare()
		},
		onShareTimeline() {
			return appShareTimeline()
		},
		data() {
			return {
				cards: [],
				loading: true,
				currentYear: String(new Date().getFullYear())
			}
		},
		computed: {
			albums() {
				return groupByYear(this.cards)
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			async load() {
				this.loading = true
				try {
					this.cards = await listPhotoCards()
				} finally {
					this.loading = false
				}
			},
			fmtShort(date) {
				if (!date) return ''
				const [, m, d] = date.split('-')
				return `${parseInt(m)} 月 ${parseInt(d)} 日`
			},
			openAlbum(a) {
				uni.navigateTo({ url: '/pages/archive/album-detail?year=' + encodeURIComponent(a.year) })
			},
			goCreate(memoryId) {
				const url = '/pages/archive/album-create' + (memoryId ? '?memoryId=' + memoryId : '')
				uni.navigateTo({ url })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.al {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 220rpx;
	}
	.al-body {
		padding: 16rpx $page-pad 0;
	}
	.al-sum {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4rpx 6rpx 24rpx;
		font-size: 24rpx;
		color: $ti-text-3;
	}
	.al-sum .num {
		font-size: 26rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.al-sum-hint {
		color: $ti-primary;
		font-weight: 600;
	}

	/* 册子 */
	.al-book {
		position: relative;
		display: flex;
		align-items: center;
		gap: 26rpx;
		background: $ti-card;
		border-radius: 44rpx;
		box-shadow: $shadow-card;
		padding: 24rpx;
		margin-bottom: 24rpx;
	}
	.al-cover-wrap {
		position: relative;
		flex: 0 0 172rpx;
		padding-right: 10rpx;
	}
	.al-pages {
		position: absolute;
		right: 0;
		top: 10rpx;
		bottom: 10rpx;
		width: 16rpx;
		border-radius: 0 8rpx 8rpx 0;
		background: repeating-linear-gradient(180deg, #FFFFFF 0 4rpx, #E6DFD0 4rpx 6rpx);
	}
	.al-cover {
		position: relative;
		width: 172rpx;
		border-radius: 16rpx 22rpx 22rpx 16rpx;
		overflow: hidden;
		box-shadow: 0 12rpx 26rpx rgba(27, 59, 87, 0.18);
	}
	.al-cover-card {
		display: block;
	}
	.al-spine {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 14rpx;
		background: linear-gradient(90deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0));
	}
	.al-year {
		position: absolute;
		left: 18rpx;
		bottom: 12rpx;
		font-size: 20rpx;
		font-weight: 800;
		letter-spacing: 2rpx;
		color: #FFFFFF;
		text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.45);
	}
	.al-meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.al-title {
		font-size: 34rpx;
		font-weight: 800;
		color: $ti-navy;
		letter-spacing: 1rpx;
	}
	.al-count {
		font-size: 24rpx;
		color: $ti-text-2;
		margin-top: 10rpx;
	}
	.al-last {
		font-size: 22rpx;
		color: $ti-text-3;
		margin-top: 6rpx;
	}
	.al-tag {
		align-self: flex-start;
		margin-top: 14rpx;
		font-size: 20rpx;
		font-weight: 700;
		color: $ti-accent-deep;
		background: $ti-accent-light;
		border-radius: 999rpx;
		padding: 4rpx 16rpx;
	}
	.al-chev {
		font-size: 36rpx;
		color: #C9C2B2;
		padding-right: 6rpx;
	}
	.al-tip {
		padding: 8rpx 10rpx;
		font-size: 22rpx;
		color: #8E8778;
		line-height: 1.7;
	}

	/* 空状态 */
	.al-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 180rpx;
		text-align: center;
	}
	.al-art {
		position: relative;
		width: 320rpx;
		height: 300rpx;
		margin-bottom: 30rpx;
	}
	.al-p {
		position: absolute;
		width: 196rpx;
		height: 246rpx;
		border-radius: 20rpx;
		background: #FFFFFF;
		box-shadow: 0 16rpx 36rpx rgba(27, 59, 87, 0.12);
	}
	.al-p:nth-child(1) {
		left: 14rpx;
		top: 36rpx;
		transform: rotate(-8deg);
		background: #FDF9F0;
	}
	.al-p:nth-child(2) {
		right: 16rpx;
		top: 22rpx;
		transform: rotate(8deg);
	}
	/* 橙色星光点缀, 对应高保真手绘语言 */
	.al-spark {
		position: absolute;
		color: $ti-accent;
		line-height: 1;
	}
	.al-spark.s1 {
		right: 34rpx;
		top: 26rpx;
		font-size: 34rpx;
	}
	.al-spark.s2 {
		left: 44rpx;
		bottom: 40rpx;
		font-size: 18rpx;
		opacity: 0.85;
	}
	.al-p.add {
		left: 62rpx;
		top: 44rpx;
		border: 3rpx dashed #D8D0BE;
		box-shadow: 0 16rpx 36rpx rgba(27, 59, 87, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #C9C2B2;
		font-size: 56rpx;
		font-weight: 300;
		box-sizing: border-box;
	}
	.al-p.add::after {
		display: none;
	}
	.al-empty-title {
		font-size: 34rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.al-empty-sub {
		margin-top: 16rpx;
		font-size: 24rpx;
		color: $ti-text-3;
		line-height: 1.9;
		white-space: pre-line;
	}
	.al-empty-btn {
		margin-top: 44rpx;
		height: 96rpx;
		padding: 0 64rpx;
		line-height: 96rpx;
		border-radius: 999rpx;
		background: linear-gradient(135deg, #579292, #4A8282);
		color: #FFFFFF;
		font-size: 28rpx;
		font-weight: 800;
		letter-spacing: 3rpx;
		box-shadow: $shadow-primary;
	}

	/* 底部按钮 */
	.al-fab {
		position: fixed;
		left: $page-pad;
		right: $page-pad;
		bottom: calc(200rpx + env(safe-area-inset-bottom));
		height: 100rpx;
		line-height: 100rpx;
		text-align: center;
		border-radius: 999rpx;
		background: linear-gradient(135deg, #579292, #4A8282);
		color: #FFFFFF;
		font-size: 28rpx;
		font-weight: 800;
		letter-spacing: 3rpx;
		box-shadow: $shadow-primary;
		z-index: 90;
	}
</style>
