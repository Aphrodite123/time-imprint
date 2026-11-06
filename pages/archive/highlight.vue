<template>
	<view class="hl">
		<nav-bar title="高光回忆集">
			<template #right>
				<text class="hl-nav-star">★</text>
			</template>
		</nav-bar>

		<view class="hl-body" v-if="list.length">
			<!-- 精选高光(最近一条) -->
			<view class="hl-featured" v-if="featured" @click="goDetail(featured)" @longpress="onLongpress(featured)">
				<view class="hl-feat-head">
					<text class="hl-feat-badge">★ 精选高光</text>
					<text class="hl-feat-date">{{ fmtCN(featured.eventDate) }}</text>
				</view>
				<media-grid :medias="featured.medias" :max-images="1" class="hl-feat-media" />
				<text class="hl-feat-title">{{ featured.title || '一段闪闪发光的日子' }}</text>
				<text v-if="featured.content" class="hl-feat-content">{{ featured.content }}</text>
				<view class="hl-feat-foot">
					<text v-if="emotionOf(featured.emotion)" class="hl-feat-emotion">{{ emotionOf(featured.emotion).label }}</text>
					<text class="hl-feat-stars">★ ★ ★</text>
				</view>
			</view>

			<!-- 更多高光 -->
			<view class="hl-section" v-if="rest.length">
				<view class="hl-section-head">
					<text class="hl-section-title">更多高光</text>
					<text class="hl-section-more">共 {{ list.length }} 条</text>
				</view>
				<view
					v-for="m in rest"
					:key="m.memoryId"
					class="hl-item"
					@click="goDetail(m)"
					@longpress="onLongpress(m)"
				>
					<image v-if="thumbOf(m)" :src="thumbOf(m)" mode="aspectFill" class="hl-thumb" />
					<view v-else class="hl-thumb hl-thumb-blank">
						<text class="hl-thumb-star">★</text>
					</view>
					<view class="hl-item-info">
						<text class="hl-item-date">{{ fmtCN(m.eventDate) }}</text>
						<text class="hl-item-title">{{ m.title || '(未命名印记)' }}</text>
					</view>
					<text class="hl-item-star">★</text>
				</view>
			</view>
		</view>

		<view v-else-if="!loading" class="hl-empty">
			<empty-state text="还没有标记高光时刻" sub="长按印记卡片,或开启高光开关,把重要的瞬间留在这一页" />
		</view>
	</view>
</template>

<script>
	// 高光回忆集:汇总所有标记高光的重要人生瞬间(需求 2.5)
	import { listMemories, setHighlight, deleteMemory } from '../../utils/db'
	import { removeFile } from '../../utils/media'
	import { fmtCN } from '../../utils/date'
	import { emotionOf } from '../../utils/stage'

	export default {
		data() {
			return { list: [], loading: false }
		},
		computed: {
			featured() {
				return this.list[0] || null
			},
			rest() {
				return this.list.slice(1)
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			emotionOf,
			fmtCN,
			thumbOf(m) {
				const img = (m.medias || []).find(x => x.type === 'image')
				return img ? img.url : ''
			},
			async load() {
				this.loading = true
				try {
					this.list = await listMemories({ offset: 0, limit: 9999, highlightOnly: true })
				} finally {
					this.loading = false
				}
			},
			goDetail(m) {
				uni.navigateTo({ url: '/pages/memory/detail?id=' + m.memoryId })
			},
			onLongpress(m) {
				uni.showActionSheet({
					itemList: ['编辑', '删除', '取消高光'],
					success: async r => {
						if (r.tapIndex === 0) {
							uni.navigateTo({ url: '/pages/memory/edit?id=' + m.memoryId })
						} else if (r.tapIndex === 1) {
							uni.showModal({
								title: '删除这条印记?',
								content: '删除后无法恢复',
								confirmColor: '#D96A5B',
								success: async mr => {
									if (!mr.confirm) return
									for (const md of m.medias || []) removeFile(md.url)
									await deleteMemory(m.memoryId)
									this.load()
								}
							})
						} else {
							await setHighlight(m.memoryId, false, m.title)
							this.load()
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.hl {
		min-height: 100vh;
		background: $ti-bg;
	}
	.hl-nav-star {
		font-size: 40rpx;
		color: $ti-accent;
	}
	.hl-body {
		padding: 20rpx $page-pad calc(64rpx + env(safe-area-inset-bottom));
	}

	/* 精选高光 */
	.hl-featured {
		background: $ti-card;
		border-radius: 48rpx;
		padding: 36rpx;
		box-shadow: $shadow-float;
	}
	.hl-feat-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.hl-feat-badge {
		font-size: $font-small;
		font-weight: 700;
		color: #B4692E;
		background: $ti-accent-light;
		border-radius: 999rpx;
		padding: 10rpx 24rpx;
	}
	.hl-feat-date {
		font-size: $font-small;
		font-weight: 600;
		color: $ti-text-3;
	}
	.hl-feat-media {
		margin-top: 26rpx;
	}
	.hl-feat-title {
		display: block;
		margin-top: 28rpx;
		font-size: 36rpx;
		font-weight: 800;
		color: #1B1B1B;
	}
	.hl-feat-content {
		display: block;
		margin-top: 14rpx;
		font-size: 26rpx;
		color: $ti-text-2;
		line-height: 1.8;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}
	.hl-feat-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 26rpx;
	}
	.hl-feat-emotion {
		font-size: $font-small;
		font-weight: 600;
		color: $ti-primary-deep;
		background: $ti-primary-mist;
		border-radius: 20rpx;
		padding: 8rpx 22rpx;
	}
	.hl-feat-stars {
		font-size: 26rpx;
		color: $ti-accent;
		letter-spacing: 6rpx;
	}

	/* 更多高光 */
	.hl-section {
		margin-top: 40rpx;
	}
	.hl-section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 4rpx 24rpx;
	}
	.hl-section-title {
		font-size: 34rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.hl-section-more {
		font-size: $font-small;
		color: $ti-primary;
	}
	.hl-item {
		display: flex;
		align-items: center;
		gap: 24rpx;
		background: $ti-card;
		border-radius: 40rpx;
		padding: 26rpx;
		margin-bottom: 24rpx;
		box-shadow: $shadow-card;
	}
	.hl-thumb {
		width: 104rpx;
		height: 104rpx;
		border-radius: 30rpx;
		flex-shrink: 0;
		background: $ti-bg;
	}
	.hl-thumb-blank {
		background: linear-gradient(150deg, #FAE8D2, #F5D9AE);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.hl-thumb-star {
		color: $ti-accent;
		font-size: 44rpx;
	}
	.hl-item-info {
		flex: 1;
		min-width: 0;
	}
	.hl-item-date {
		font-size: 22rpx;
		font-weight: 600;
		color: $ti-text-3;
	}
	.hl-item-title {
		display: block;
		margin-top: 6rpx;
		font-size: 28rpx;
		font-weight: 800;
		color: $ti-navy;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.hl-item-star {
		color: $ti-accent;
		font-size: 30rpx;
	}
	.hl-empty {
		padding-top: 40rpx;
	}
</style>
