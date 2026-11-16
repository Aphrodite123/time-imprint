<template>
	<view class="hl">
		<!-- 顶部: 返回靠左 + 标题居中, 副标题居中, 星标点缀移到标题下方 -->
		<nav-bar title="高光回忆集" subtitle="那些闪闪发光的日子">
			<template #tools>
				<view class="nb-tools-group">
					<view class="nb-tool">
						<image src="/static/icon-star-line.png" mode="aspectFit" />
					</view>
				</view>
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
				<text v-if="featTitle" class="hl-feat-title">{{ featTitle }}</text>
				<text v-if="featured.content" class="hl-feat-content">{{ featured.content }}</text>
				<view class="hl-feat-foot">
					<text v-if="emotionOf(featured.emotion)" class="hl-feat-emotion">{{ emotionOf(featured.emotion).label }}</text>
					<view class="hl-feat-stars">
						<text v-for="i in maxLevel" :key="i" :class="['hl-feat-star', i <= featLevel ? 'on' : '']">★</text>
					</view>
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
					<memory-thumb :memory="m" />
					<view class="hl-item-info">
						<text class="hl-item-date">{{ fmtCN(m.eventDate) }}</text>
						<text class="hl-item-title">{{ m.title || '(未命名印记)' }}</text>
					</view>
					<text class="hl-item-star">{{ starsText(m) }}</text>
				</view>
			</view>
		</view>

		<view v-else-if="!loading" class="hl-empty">
			<empty-state text="还没有标记高光时刻" sub="长按印记卡片,或开启高光开关,把重要的瞬间留在这一页" />
		</view>
	</view>
</template>

<script>
	// 高光回忆集:汇总所有标记高光的重要人生瞬间(需求 2.5), 按 1~5 星规则展示
	import { listMemories, setHighlight, deleteMemory } from '../../utils/db'
	import { removeFile } from '../../utils/media'
	import { fmtCN } from '../../utils/date'
	import { emotionOf } from '../../utils/stage'
	import { HL_LEVELS, MAX_HL_LEVEL, levelOf, starsText } from '../../utils/highlight'

	export default {
		data() {
			return { list: [], loading: false, maxLevel: MAX_HL_LEVEL }
		},
		computed: {
			// 精选规则: 星数最高者优先, 同星数取日期最近的一条
			featured() {
				if (!this.list.length) return null
				let best = this.list[0]
				for (const m of this.list) {
					const better = levelOf(m) > levelOf(best) ||
						(levelOf(m) === levelOf(best) && (m.eventDate || '') > (best.eventDate || ''))
					if (better) best = m
				}
				return best
			},
			// 其余高光保持日期升序(成长轨迹)
			rest() {
				return this.list.filter(m => m !== this.featured)
			},
			featLevel() {
				return levelOf(this.featured)
			},
			// 精选卡标题: 有标题显示标题, 未填时用占位文案; 历史数据里标题是复制正文的(旧版保存时取了正文首行)不再重复展示, 由正文单独显示
			featTitle() {
				const m = this.featured
				if (!m) return ''
				const t = (m.title || '').trim()
				const c = (m.content || '').trim()
				if (!t) return '一段闪闪发光的日子'
				if (c && (c.startsWith(t) || t.startsWith(c))) return ''
				return t
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			emotionOf,
			fmtCN,
			starsText,
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
			// 手动调整高光星数(1~5 星, 调整后按新星级重排精选)
			adjustLevel(m) {
				uni.showActionSheet({
					itemList: HL_LEVELS.map(l => '★'.repeat(l.level) + ' ' + l.label),
					success: async r => {
						const hit = HL_LEVELS[r.tapIndex]
						await setHighlight(m.memoryId, true, m.title, hit.level)
						uni.showToast({ title: '已设为「' + hit.label + '」', icon: 'none' })
						this.load()
					}
				})
			},
			onLongpress(m) {
				uni.showActionSheet({
					itemList: ['编辑', '删除', '调整星数', '取消高光'],
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
						} else if (r.tapIndex === 2) {
							this.adjustLevel(m)
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
	.hl-body {
		padding: 12rpx $page-pad calc(64rpx + env(safe-area-inset-bottom));
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
		margin-bottom: 36rpx;
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
		display: flex;
		align-items: center;
		gap: 10rpx;
	}
	.hl-feat-star {
		font-size: 30rpx;
		color: #E3DCCB;
		&.on {
			color: $ti-accent;
		}
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
	.hl-item-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
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
		font-size: 28rpx;
		letter-spacing: 4rpx;
		flex-shrink: 0;
	}
	.hl-empty {
		padding-top: 40rpx;
	}
</style>
