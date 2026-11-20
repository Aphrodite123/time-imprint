<template>
	<view class="ad">
		<nav-bar :title="year ? year + ' 年' : '纪念册'" subtitle="那一年，闪闪发光的日子" />

		<view v-if="cards.length" class="ad-body">
			<view class="ad-top">
				<text class="ad-page">{{ index + 1 }} / {{ cards.length }}</text>
				<text class="ad-mode">左右滑动翻页</text>
			</view>

			<swiper class="ad-swiper" :current="index" :circular="cards.length > 1" @change="onChange">
				<swiper-item v-for="(c, i) in cards" :key="c.cardId">
					<view class="ad-slide">
						<view class="ad-deck">
							<view class="ad-back b2"></view>
							<view class="ad-back b1"></view>
							<view class="ad-card" @longpress="onLongpress(c)">
								<photo-card :card="c" w="560rpx" />
							</view>
						</view>
					</view>
				</swiper-item>
			</swiper>

			<view class="ad-dots">
				<view v-for="(c, i) in cards" :key="c.cardId" :class="['ad-dot', i === index ? 'on' : '']"></view>
			</view>
		</view>

		<view v-else-if="!loading" class="ad-empty">
			<empty-state text="这一册还是空的" sub="去做一张纪念照吧">
				<template #action>
					<view class="ti-btn" @click="goCreate">做一张纪念照</view>
				</template>
			</empty-state>
		</view>

		<view v-if="cards.length" class="ad-actions">
			<view class="ad-btn pri" @click="saveImage">保存图片</view>
			<view class="ad-btn ghost" @click="shareImage">分享</view>
			<view class="ad-btn del" @click="removeCurrent">删除</view>
		</view>

		<canvas canvas-id="cardCanvas" class="ad-canvas"></canvas>
	</view>
</template>

<script>
	// 纪念册内页: 逐年翻页浏览、保存、分享、删除
	import { listPhotoCards, deletePhotoCard } from '../../utils/db'
	import { removeFile } from '../../utils/media'
	import { exportCardImage, saveImageToAlbum, CARD_CANVAS_ID } from '../../utils/card-canvas'

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
				year: '',
				cards: [],
				index: 0,
				loading: true
			}
		},
		computed: {
			current() {
				return this.cards[this.index] || null
			}
		},
		onLoad(opt) {
			this.year = decodeURIComponent(opt.year || '')
		},
		onShow() {
			this.load()
		},
		methods: {
			async load() {
				this.loading = true
				try {
					const all = await listPhotoCards()
					const list = this.year === '未知'
						? all.filter(c => !c.eventDate)
						: this.year
							? all.filter(c => String(c.eventDate || '').slice(0, 4) === this.year)
							: all
					this.cards = list
					if (this.index > list.length - 1) this.index = Math.max(0, list.length - 1)
				} finally {
					this.loading = false
				}
			},
			onChange(e) {
				this.index = e.detail.current
			},
			goCreate() {
				uni.navigateTo({ url: '/pages/archive/album-create' })
			},
			async buildImage(card) {
				return exportCardImage(card, CARD_CANVAS_ID, this)
			},
			async saveImage() {
				const c = this.current
				if (!c) return
				uni.showLoading({ title: '生成图片', mask: true })
				try {
					const path = await this.buildImage(c)
					const ok = await saveImageToAlbum(path)
					uni.hideLoading()
					if (ok) {
						uni.showToast({ title: '已保存到相册', icon: 'success' })
					} else {
						uni.previewImage({ urls: [path], current: 0 })
						uni.showToast({ title: '长按图片可保存', icon: 'none' })
					}
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: e.message || '保存失败', icon: 'none' })
				}
			},
			async shareImage() {
				const c = this.current
				if (!c) return
				// #ifdef MP-WEIXIN
				if (typeof wx.showShareImageMenu !== 'function') {
					return this.saveImage()
				}
				uni.showLoading({ title: '生成图片', mask: true })
				try {
					const path = await this.buildImage(c)
					uni.hideLoading()
					wx.showShareImageMenu({
						path,
						fail: () => uni.showToast({ title: '请使用右上角转发', icon: 'none' })
					})
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: e.message || '分享失败', icon: 'none' })
				}
				// #endif
				// #ifndef MP-WEIXIN
				this.saveImage()
				// #endif
			},
			removeCurrent() {
				const c = this.current
				if (!c) return
				uni.showModal({
					title: '删除这张纪念照?',
					content: '删除后无法恢复，原印记不受影响',
					confirmColor: '#D96A5B',
					success: async r => {
						if (!r.confirm) return
						// 纪念照持有自己的图片副本, 删除时一并清理
						for (const u of c.images || []) removeFile(u)
						await deletePhotoCard(c.cardId)
						await this.load()
						if (!this.cards.length) {
							setTimeout(() => uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/archive/album' }) }), 300)
						}
					}
				})
			},
			onLongpress(c) {
				uni.showActionSheet({
					itemList: ['保存图片', '分享', '重新编辑', '删除'],
					success: r => {
						if (r.tapIndex === 0) this.saveImage()
						else if (r.tapIndex === 1) this.shareImage()
						else if (r.tapIndex === 2) {
							uni.navigateTo({ url: '/pages/archive/album-create?cardId=' + c.cardId })
						} else if (r.tapIndex === 3) {
							this.removeCurrent()
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.ad {
		min-height: 100vh;
		background:
			radial-gradient(420rpx 320rpx at 50% 16%, #FBF6E9 0%, rgba(251, 246, 233, 0) 70%),
			linear-gradient(180deg, #EFE7D6 0%, #E6DBC6 100%);
		display: flex;
		flex-direction: column;
	}
	.ad-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding-bottom: 200rpx;
	}
	.ad-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6rpx $page-pad 12rpx;
	}
	.ad-page {
		font-size: 24rpx;
		font-weight: 800;
		color: $ti-navy;
		letter-spacing: 2rpx;
	}
	.ad-mode {
		font-size: 21rpx;
		color: #A79E8E;
	}

	/* 翻页 */
	.ad-swiper {
		height: 900rpx;
	}
	.ad-slide {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ad-deck {
		position: relative;
		width: 560rpx;
	}
	.ad-back {
		position: absolute;
		left: 0;
		top: 0;
		width: 560rpx;
		height: 700rpx;
		border-radius: 10rpx;
		background: #FFFFFF;
		box-shadow: 0 20rpx 44rpx rgba(27, 59, 87, 0.16);
	}
	.ad-back.b2 {
		transform: translateY(30rpx) scale(0.94) rotate(-2.4deg);
		opacity: 0.45;
	}
	.ad-back.b1 {
		transform: translateY(15rpx) scale(0.97) rotate(1.6deg);
		opacity: 0.72;
	}
	.ad-card {
		position: relative;
		width: 560rpx;
		border-radius: 8rpx;
		overflow: hidden;
		box-shadow: 0 22rpx 50rpx rgba(27, 59, 87, 0.22);
		transform: rotate(-0.6deg);
	}

	/* 圆点 */
	.ad-dots {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10rpx;
		padding: 6rpx 0 0;
	}
	.ad-dot {
		width: 10rpx;
		height: 10rpx;
		border-radius: 50%;
		background: #CFC6B2;
	}
	.ad-dot.on {
		width: 30rpx;
		border-radius: 6rpx;
		background: $ti-primary;
	}

	/* 操作 */
	.ad-actions {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		gap: 20rpx;
		padding: 22rpx $page-pad calc(34rpx + env(safe-area-inset-bottom));
		background: linear-gradient(180deg, rgba(230, 219, 198, 0) 0%, #E6DBC6 40%);
		z-index: 90;
	}
	.ad-btn {
		height: 92rpx;
		line-height: 92rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 26rpx;
		font-weight: 700;
	}
	.ad-btn.pri {
		flex: 1.3;
		background: linear-gradient(135deg, #579292, #4A8282);
		color: #FFFFFF;
		box-shadow: $shadow-primary;
	}
	.ad-btn.ghost {
		flex: 1;
		background: rgba(255, 255, 255, 0.9);
		color: $ti-primary-deep;
		box-shadow: $shadow-card;
	}
	.ad-btn.del {
		flex: 0 0 120rpx;
		color: #8E8778;
	}
	.ad-canvas {
		position: fixed;
		left: -2000px;
		top: 0;
		width: 750px;
		height: 938px;
	}
	.ad-empty {
		padding-top: 160rpx;
	}
</style>
