<template>
	<view class="se">
		<!-- 搜索栏: 固定吸顶不随页面滚动; 行高对齐右上角胶囊(行中心=胶囊中心), 右侧避让胶囊 -->
		<view class="se-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view
				class="se-nav-row"
				:style="[{ height: rowHeight + 'px' }, navInset ? { paddingRight: navInset + 4 + 'px' } : {}]"
			>
				<image class="se-back" src="/static/icon-back.png" @click="goBack" />
				<view class="se-input-wrap">
					<input
						v-model="keyword"
						class="se-input"
						placeholder="搜索印记、心情、阶段…"
						placeholder-class="se-placeholder"
						focus
						confirm-type="search"
						@input="onInput"
						@confirm="onConfirm"
					/>
				</view>
				<text class="se-btn" @click="onConfirm">搜索</text>
			</view>
		</view>
		<!-- 文档流占位: 高度与固定搜索栏一致 -->
		<view class="se-nav-placeholder" :style="{ height: statusBarHeight + rowHeight + 'px' }"></view>

		<!-- 筛选类型 -->
		<scroll-view scroll-x class="se-chips">
			<view :class="['se-chip', !filterType ? 'on' : '']" @click="setFilterType('')">全部</view>
			<view :class="['se-chip', filterType === 'year' ? 'on' : '']" @click="setFilterType('year')">时间</view>
			<view :class="['se-chip', filterType === 'emotion' ? 'on' : '']" @click="setFilterType('emotion')">心情</view>
			<view :class="['se-chip', filterType === 'stage' ? 'on' : '']" @click="setFilterType('stage')">阶段</view>
			<view :class="['se-chip', filterType === 'highlight' ? 'on' : '']" @click="setFilterType('highlight')">高光</view>
		</scroll-view>

		<!-- 时间子筛选 -->
		<scroll-view v-if="filterType === 'year' && years.length" scroll-x class="se-chips sub">
			<view :class="['se-chip soft', !filterValue ? 'on' : '']" @click="setFilterValue('')">全部</view>
			<view v-for="y in years" :key="y" :class="['se-chip soft', filterValue === y ? 'on' : '']" @click="setFilterValue(y)">
				{{ y }}
			</view>
		</scroll-view>
		<!-- 心情子筛选 -->
		<scroll-view v-if="filterType === 'emotion'" scroll-x class="se-chips sub">
			<view :class="['se-chip soft', !filterValue ? 'on' : '']" @click="setFilterValue('')">全部</view>
			<view
				v-for="e in emotions"
				:key="e.key"
				:class="['se-chip soft', filterValue === e.key ? 'on' : '']"
				@click="setFilterValue(e.key)"
			>
				{{ e.emoji }} {{ e.label }}
			</view>
		</scroll-view>
		<!-- 阶段子筛选 -->
		<scroll-view v-if="filterType === 'stage'" scroll-x class="se-chips sub">
			<view :class="['se-chip soft', !filterValue ? 'on' : '']" @click="setFilterValue('')">全部</view>
			<view
				v-for="s in stages"
				:key="s.key"
				:class="['se-chip soft', filterValue === s.label ? 'on' : '']"
				@click="setFilterValue(s.label)"
			>
				{{ s.label }}
			</view>
		</scroll-view>

		<!-- 最近搜索 -->
		<view v-if="!searched && recents.length" class="se-section">
			<view class="se-section-head">
				<text class="se-section-title">最近搜索</text>
				<text class="se-clear" @click="clearRecents">清空</text>
			</view>
			<view class="se-recents">
				<view v-for="r in recents" :key="r" class="se-recent" @click="quickSearch(r)">
					<text class="se-recent-icon">⏱</text>
					<text class="se-recent-text">{{ r }}</text>
				</view>
			</view>
		</view>

		<!-- 按心情找一找 -->
		<view v-if="!searched" class="se-section">
			<view class="se-section-head">
				<text class="se-section-title">按心情找一找</text>
			</view>
			<view class="se-moods">
				<view v-for="e in quickMoods" :key="e.key" class="se-mood" @click="quickMood(e)">
					<text class="se-mood-emoji">{{ e.emoji }}</text>
					<text class="se-mood-label">{{ e.label }}</text>
				</view>
			</view>
		</view>

		<!-- 结果列表 -->
		<view v-if="searched" class="se-results">
			<view class="se-results-head">
				<text class="se-results-title">
					<text v-if="keyword">{{ keyword }} 相关印记</text>
					<text v-else>筛选结果</text>
				</text>
				<text class="se-results-count">找到 {{ results.length }} 条</text>
			</view>
			<view v-for="m in results" :key="m.memoryId" class="se-item" @click="goDetail(m)">
				<view class="se-item-head">
					<text class="se-item-title">
						<text v-for="(seg, i) in highlightSegs(m.title || '(未命名印记)')" :key="i" :class="{ hl: seg.hl }">{{ seg.t }}</text>
					</text>
					<text v-if="m.isHighlight" class="se-item-star">★</text>
				</view>
				<text class="se-item-snippet">
					{{ fmtCN(m.eventDate) }} · {{ snippetOf(m) }}
				</text>
				<view class="se-item-tags">
					<text v-if="emotionOf(m.emotion)" class="se-tag teal">{{ emotionOf(m.emotion).label }}</text>
					<text v-if="stageLabel(m)" class="se-tag orange">{{ stageLabel(m) }}</text>
				</view>
			</view>
			<view v-if="!results.length" class="se-empty">
				<empty-state text="没有找到相关印记" sub="换个关键词试试" />
			</view>
		</view>
	</view>
</template>

<script>
	// 搜索页:标题/正文关键词 + 时间/心情/阶段/高光筛选 + 最近搜索
	import { listMemories } from '../../utils/db'
	import { EMOTIONS, STAGES, UNBORN_STAGE, emotionOf, stageLabelOf } from '../../utils/stage'
	import { getNavMetrics } from '../../utils/nav'
	import { fmtCN } from '../../utils/date'
	import { store } from '../../store'

	const RECENT_KEY = 'ti_recent_search'

	export default {
		data() {
			return {
				statusBarHeight: 20,
				navInset: 0,
				rowHeight: uni.upx2px(96), // 搜索行高度: 小程序端按胶囊对齐计算(行中心=胶囊中心)
				keyword: '',
				filterType: '', // '' | year | emotion | stage | highlight
				filterValue: '',
				years: [],
				emotions: EMOTIONS,
				stages: STAGES.concat([UNBORN_STAGE]),
				quickMoods: EMOTIONS.slice(0, 4),
				recents: [],
				results: [],
				searched: false
			}
		},
		onLoad() {
			const nav = getNavMetrics()
			this.statusBarHeight = nav.statusBarHeight
			this.navInset = nav.rightInset
			// 小程序端: 行高 = (胶囊顶距状态栏) * 2 + 胶囊高, 使行中心与胶囊中心重合
			if (nav.rightInset > 0 && nav.capsuleHeight > 0) {
				this.rowHeight = (nav.capsuleTop - nav.statusBarHeight) * 2 + nav.capsuleHeight
			}
			this.recents = uni.getStorageSync(RECENT_KEY) || []
			this.initYears()
		},
		methods: {
			emotionOf,
			fmtCN,
			// 展示用人生阶段: 出生前的印记统一显示「未出生」
			stageLabel(m) {
				const birth = store.user && store.user.birthDate
				return stageLabelOf(birth, m.eventDate, m.lifeStage)
			},
			goBack() {
				uni.navigateBack()
			},
			async initYears() {
				const all = await listMemories({ offset: 0, limit: 9999, noMedia: true })
				const set = new Set()
				for (const m of all) if (m.eventDate) set.add(m.eventDate.slice(0, 4))
				this.years = [...set].sort().reverse()
			},
			setFilterType(t) {
				this.filterType = t
				this.filterValue = ''
				if (t === 'highlight') this.doSearch()
				else if (!t) this.doSearch()
			},
			setFilterValue(v) {
				this.filterValue = v
				this.doSearch()
			},
			onInput() {
				// 关键词清空时回到初始推荐态
				if (!this.keyword.trim() && !this.filterType) {
					this.searched = false
					this.results = []
				}
			},
			onConfirm() {
				this.saveRecent()
				this.doSearch()
			},
			quickSearch(r) {
				this.keyword = r
				this.saveRecent()
				this.doSearch()
			},
			quickMood(e) {
				this.filterType = 'emotion'
				this.filterValue = e.key
				this.doSearch()
			},
			saveRecent() {
				const kw = this.keyword.trim()
				if (!kw) return
				const list = [kw].concat(this.recents.filter(x => x !== kw)).slice(0, 8)
				this.recents = list
				uni.setStorageSync(RECENT_KEY, list)
			},
			clearRecents() {
				this.recents = []
				uni.setStorageSync(RECENT_KEY, [])
			},
			async doSearch() {
				this.searched = true
				const kw = this.keyword.trim()
				let all = await listMemories({ offset: 0, limit: 9999 })
				if (this.filterType === 'year' && this.filterValue) {
					all = all.filter(m => String(m.eventDate || '').startsWith(this.filterValue + '-'))
				}
				if (this.filterType === 'emotion' && this.filterValue) {
					all = all.filter(m => m.emotion === this.filterValue)
				}
				if (this.filterType === 'stage' && this.filterValue) {
					all = all.filter(m => this.stageLabel(m) === this.filterValue)
				}
				if (this.filterType === 'highlight') {
					all = all.filter(m => m.isHighlight)
				}
				if (kw) {
					all = all.filter(m => (m.title || '').includes(kw) || (m.content || '').includes(kw))
				}
				this.results = all
			},
			snippetOf(m) {
				const kw = this.keyword.trim()
				const text = (m.content || '').replace(/\s+/g, ' ')
				if (!kw) return text.slice(0, 40) || '暂无文字内容'
				const idx = text.indexOf(kw)
				if (idx < 0) return (m.title || '').includes(kw) ? text.slice(0, 40) || '暂无文字内容' : text.slice(0, 40)
				const start = Math.max(0, idx - 8)
				return (start > 0 ? '…' : '') + text.slice(start, idx + kw.length + 16) + '…'
			},
			// 关键词高亮分段
			highlightSegs(text) {
				const kw = this.keyword.trim()
				if (!kw || !text.includes(kw)) return [{ t: text, hl: false }]
				const segs = []
				let rest = text
				while (rest.includes(kw)) {
					const idx = rest.indexOf(kw)
					if (idx > 0) segs.push({ t: rest.slice(0, idx), hl: false })
					segs.push({ t: kw, hl: true })
					rest = rest.slice(idx + kw.length)
				}
				if (rest) segs.push({ t: rest, hl: false })
				return segs
			},
			goDetail(m) {
				uni.navigateTo({ url: '/pages/memory/detail?id=' + m.memoryId })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.se {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 64rpx;
	}
	.se-nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 900;
		background: $ti-bg;
	}
	.se-nav-placeholder {
		width: 100%;
	}
	.se-nav-row {
		display: flex;
		align-items: center;
		gap: 20rpx;
		padding: 0 $page-pad;
		box-sizing: border-box;
	}
	.se-back {
		width: 44rpx;
		height: 44rpx;
		flex-shrink: 0;
	}
	.se-input-wrap {
		flex: 1;
		height: 76rpx;
		background: $ti-card;
		border-radius: 999rpx;
		padding: 0 32rpx;
		display: flex;
		align-items: center;
		box-shadow: $shadow-card;
	}
	.se-input {
		width: 100%;
		font-size: 26rpx;
		color: $ti-text;
	}
	.se-placeholder {
		color: #B9B2A0;
	}
	.se-btn {
		font-size: 28rpx;
		font-weight: 700;
		color: $ti-primary;
		flex-shrink: 0;
	}

	.se-chips {
		display: flex;
		white-space: nowrap;
		padding: 24rpx $page-pad 0;
		box-sizing: border-box;
	}
	.se-chips.sub {
		padding-top: 18rpx;
	}
	.se-chip {
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
	.se-chip.soft {
		background: $ti-accent-light;
		border-color: transparent;
		color: #B4692E;
	}
	.se-chip.soft.on {
		background: linear-gradient(135deg, #F2A262, #EC9048);
		color: #FFFFFF;
	}

	.se-section {
		padding: 36rpx $page-pad 0;
	}
	.se-section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 22rpx;
	}
	.se-section-title {
		font-size: 30rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.se-clear {
		font-size: $font-small;
		color: $ti-text-3;
	}
	.se-recents {
		display: flex;
		flex-wrap: wrap;
		gap: 20rpx;
	}
	.se-recent {
		display: inline-flex;
		align-items: center;
		gap: 10rpx;
		background: $ti-accent-light;
		border-radius: 999rpx;
		padding: 14rpx 28rpx;
	}
	.se-recent-icon {
		font-size: 24rpx;
	}
	.se-recent-text {
		font-size: 26rpx;
		font-weight: 600;
		color: #B4692E;
	}
	.se-moods {
		display: flex;
		gap: 22rpx;
	}
	.se-mood {
		flex: 1;
		height: 150rpx;
		background: $ti-card;
		border-radius: 36rpx;
		box-shadow: $shadow-card;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10rpx;
	}
	.se-mood-emoji {
		font-size: 52rpx;
	}
	.se-mood-label {
		font-size: 22rpx;
		font-weight: 700;
		color: $ti-text-2;
	}

	.se-results {
		padding: 36rpx $page-pad 0;
	}
	.se-results-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 24rpx;
	}
	.se-results-title {
		font-size: 30rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.se-results-count {
		font-size: $font-small;
		color: $ti-text-3;
	}
	.se-item {
		background: $ti-card;
		border-radius: 40rpx;
		padding: 30rpx 32rpx;
		margin-bottom: 24rpx;
		box-shadow: $shadow-card;
	}
	.se-item-head {
		display: flex;
		align-items: center;
	}
	.se-item-title {
		flex: 1;
		min-width: 0;
		font-size: 28rpx;
		font-weight: 800;
		color: #1B1B1B;

		.hl {
			color: $ti-accent-deep;
		}
	}
	.se-item-star {
		margin-left: 16rpx;
		color: $ti-accent;
		font-size: 28rpx;
	}
	.se-item-snippet {
		display: block;
		margin-top: 12rpx;
		font-size: 24rpx;
		color: $ti-text-3;
		line-height: 1.7;
	}
	.se-item-tags {
		display: flex;
		gap: 12rpx;
		margin-top: 16rpx;
	}
	.se-tag {
		font-size: 22rpx;
		font-weight: 600;
		border-radius: 16rpx;
		padding: 4rpx 16rpx;
	}
	.se-tag.teal {
		background: $ti-primary-mist;
		color: $ti-primary-deep;
	}
	.se-tag.orange {
		background: $ti-accent-light;
		color: #B4692E;
	}
	.se-empty {
		margin-top: 40rpx;
	}
</style>
