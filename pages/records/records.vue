<template>
	<view class="rc">
		<!-- 顶部: 标题居中, 副标题居中, 日历工具移到标题下方(避让小程序右上角胶囊) -->
		<nav-bar title="记录" :back="false" :subtitle="'共 ' + total + ' 条印记 · 持续更新中'">
			<template #tools>
				<view class="nb-tools-group">
					<view class="nb-tool" @click="goCalendar">
						<image src="/static/menus/calendar.png" mode="aspectFit" />
					</view>
				</view>
			</template>
		</nav-bar>

		<!-- 筛选胶囊 -->
		<scroll-view scroll-x class="rc-chips">
			<view :class="['rc-chip', filter === '' ? 'on' : '']" @click="setFilter('')">全部</view>
			<view :class="['rc-chip', 'soft-orange', filter === 'highlight' ? 'on-orange' : '']" @click="setFilter('highlight')">★ 高光时刻</view>
			<view :class="['rc-chip', filter === 'voice' ? 'on' : '']" @click="setFilter('voice')">含语音</view>
			<view :class="['rc-chip', filter === 'photo' ? 'on' : '']" @click="setFilter('photo')">有照片</view>
		</scroll-view>

		<!-- 按年份分组列表 -->
		<view v-for="g in groupList" :key="g.year" class="rc-group">
			<view class="rc-group-head">
				<text class="rc-year">{{ g.year }}年</text>
				<text class="rc-count">{{ g.items.length }} 条</text>
			</view>
			<view
				v-for="m in g.items"
				:key="m.memoryId"
				class="rc-item"
				@click="goDetail(m)"
				@longpress="onLongpress(m)"
			>
				<!-- 缩略图切图: 照片 > 视频首帧 > 语音声波 > 心情表情, 语音支持内联播放 -->
				<memory-thumb :memory="m" />
				<view class="rc-info">
					<text class="rc-date">{{ shortDate(m.eventDate) }}</text>
					<text class="rc-title2">{{ m.title || '(未命名印记)' }}</text>
					<view class="rc-tags">
						<text v-if="emotionOf(m.emotion)" class="rc-tag teal">{{ emotionOf(m.emotion).label }}</text>
						<text v-if="m.isHighlight" class="rc-tag orange">★ 高光</text>
						<text v-if="stageLabel(m)" class="rc-tag orange">{{ stageLabel(m) }}</text>
					</view>
				</view>
				<!-- 右侧徽标: 高光星标 / 箭头(语音播放已移到左侧切图) -->
				<view :class="['rc-badge', m.isHighlight ? 'star' : 'plain']">
					<text v-if="m.isHighlight" class="rc-badge-icon">★</text>
					<view v-else class="rc-badge-arrow"></view>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view v-if="!filteredList.length && !loading" class="rc-empty">
			<empty-state text="还没有留下印记" sub="点击下方「新增印记」,记下今天的故事">
				<template #action>
					<view class="ti-btn" @click="goCreate">新增印记</view>
				</template>
			</empty-state>
		</view>
		<view v-if="loading" class="rc-loading">加载中...</view>
		<view v-else-if="!hasMore && filteredList.length" class="rc-loading">已经翻到最早的记忆啦</view>

		<tab-bar current="records" />
	</view>
</template>

<script>
	// 记录列表:按年份分组的时间足迹(设计图 04)
	import { listMemories, deleteMemory, setHighlight, updateMemory, countMemories } from '../../utils/db'
	import { removeFile } from '../../utils/media'
	import { emotionOf, stageLabelOf } from '../../utils/stage'
	import { fmtCN } from '../../utils/date'
	import { store } from '../../store'

	const PAGE_SIZE = 20
	const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

	export default {
		data() {
			return {
				total: 0,
				rows: [],
				filter: '',
				loading: false,
				hasMore: true
			}
		},
		computed: {
			filteredList() {
				return this.rows.filter(m => {
					if (this.filter === 'highlight') return !!m.isHighlight
					if (this.filter === 'voice') return (m.medias || []).some(x => x.type === 'voice')
					if (this.filter === 'photo') return (m.medias || []).some(x => x.type === 'image')
					return true
				})
			},
			groupList() {
				const map = {}
				for (const m of this.filteredList) {
					const y = (m.eventDate || '—').slice(0, 4)
					if (!map[y]) map[y] = []
					map[y].push(m)
				}
				return Object.keys(map)
					.sort((a, b) => b.localeCompare(a))
					.map(year => ({ year, items: map[year] }))
			}
		},
		onShow() {
			this.reload()
		},
		onReachBottom() {
			this.loadPage()
		},
		methods: {
			emotionOf,
			fmtCN,
			// 展示用人生阶段: 出生前的印记统一显示「未出生」
			stageLabel(m) {
				const birth = store.user && store.user.birthDate
				return stageLabelOf(birth, m.eventDate, m.lifeStage)
			},
			shortDate(dateStr) {
				if (!dateStr) return ''
				const [, m, d] = dateStr.split('-')
				const day = new Date(dateStr.replace(/-/g, '/')).getDay()
				return `${parseInt(m)}月${parseInt(d)}日 · ${WEEK[day] || ''}`
			},
			setFilter(f) {
				this.filter = f
			},
			async reload() {
				this.total = await countMemories()
				this.rows = []
				this.hasMore = true
				await this.loadPage()
			},
			async loadPage() {
				if (this.loading || !this.hasMore) return
				this.loading = true
				try {
					const rows = await listMemories({ offset: this.rows.length, limit: PAGE_SIZE, includeArchived: false })
					this.rows = this.rows.concat(rows)
					this.hasMore = rows.length >= PAGE_SIZE
				} finally {
					this.loading = false
				}
			},
			goCalendar() {
				uni.navigateTo({ url: '/pages/mine/calendar' })
			},
			goCreate() {
				uni.navigateTo({ url: '/pages/memory/create' })
			},
			goDetail(m) {
				uni.navigateTo({ url: '/pages/memory/detail?id=' + m.memoryId })
			},
			onLongpress(m) {
				const actions = ['编辑', '删除', m.isHighlight ? '取消高光' : '加入高光']
				uni.showActionSheet({
					itemList: actions,
					success: async r => {
						if (r.tapIndex === 0) {
							uni.navigateTo({ url: '/pages/memory/edit?id=' + m.memoryId })
						} else if (r.tapIndex === 1) {
							uni.showModal({
								title: '删除这条印记?',
								content: '删除后无法恢复,关联的媒体文件将一并删除',
								confirmColor: '#D96A5B',
								success: async mr => {
									if (!mr.confirm) return
									for (const md of m.medias || []) removeFile(md.url)
									await deleteMemory(m.memoryId)
									uni.showToast({ title: '已删除', icon: 'none' })
									this.reload()
								}
							})
						} else {
							await setHighlight(m.memoryId, !m.isHighlight, m.title)
							uni.showToast({ title: m.isHighlight ? '已取消高光' : '已加入高光回忆集', icon: 'none' })
							this.reload()
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.rc {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 200rpx;
	}
	.rc-chips {
		display: flex;
		white-space: nowrap;
		padding: 28rpx $page-pad 4rpx;
		box-sizing: border-box;
	}
	.rc-chip {
		display: inline-flex;
		align-items: center;
		height: 72rpx;
		padding: 0 32rpx;
		margin-right: 20rpx;
		border-radius: 999rpx;
		font-size: 26rpx;
		font-weight: 600;
		color: $ti-text-2;
		background: #FFFFFF;
		border: 2rpx solid #E6E0D2;
		box-sizing: border-box;
		&.on {
			background: linear-gradient(135deg, #579292, #4A8282);
			border-color: transparent;
			color: #FFFFFF;
		}
	}
	.rc-chip.soft-orange {
		background: $ti-accent-light;
		border-color: transparent;
		color: #B4692E;
	}
	.rc-chip.on-orange {
		background: linear-gradient(135deg, #F2A262, #EC9048);
		color: #FFFFFF;
	}

	.rc-group {
		padding: 20rpx $page-pad 0;
	}
	.rc-group-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx 4rpx 20rpx;
	}
	.rc-year {
		font-size: 36rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.rc-count {
		font-size: $font-small;
		color: $ti-text-3;
	}
	.rc-item {
		display: flex;
		align-items: center;
		gap: 24rpx;
		background: $ti-card;
		border-radius: 40rpx;
		padding: 26rpx;
		margin-bottom: 24rpx;
		box-shadow: $shadow-card;
	}
	.rc-info {
		flex: 1;
		min-width: 0;
	}
	.rc-date {
		font-size: 24rpx;
		font-weight: 600;
		color: $ti-text-3;
	}
	.rc-title2 {
		display: block;
		margin-top: 8rpx;
		font-size: 30rpx;
		font-weight: 800;
		color: $ti-navy;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.rc-tags {
		display: flex;
		gap: 12rpx;
		margin-top: 12rpx;
		flex-wrap: wrap;
	}
	.rc-tag {
		font-size: 22rpx;
		font-weight: 600;
		border-radius: 16rpx;
		padding: 4rpx 14rpx;
	}
	.rc-tag.teal {
		background: $ti-primary-mist;
		color: $ti-primary-deep;
	}
	.rc-tag.orange {
		background: $ti-accent-light;
		color: #B4692E;
	}
	.rc-badge {
		width: 76rpx;
		height: 76rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.rc-badge.plain {
		background: $ti-primary-light;
	}
	.rc-badge.star {
		background: $ti-accent-light;
	}
	.rc-badge-icon {
		font-size: 28rpx;
		line-height: 1;
		color: $ti-primary-deep;
	}
	.rc-badge.star .rc-badge-icon {
		color: $ti-accent-deep;
	}
	/* CSS 画的右箭头, 避免文本字形在圆内不居中 */
	.rc-badge-arrow {
		width: 16rpx;
		height: 16rpx;
		border-top: 4rpx solid $ti-primary-deep;
		border-right: 4rpx solid $ti-primary-deep;
		transform: rotate(45deg);
		box-sizing: border-box;
	}
	.rc-empty {
		margin-top: 60rpx;
	}
	.rc-loading {
		text-align: center;
		padding: 24rpx 0;
		font-size: $font-small;
		color: $ti-text-3;
	}
</style>
