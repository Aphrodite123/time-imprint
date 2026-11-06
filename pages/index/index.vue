<template>
	<view class="idx">
		<!-- 顶部导航 -->
		<view class="idx-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="idx-nav-row">
				<text class="idx-title">时光印记</text>
				<view class="idx-nav-icons">
					<picker v-if="years.length" mode="selector" :range="yearOptions" @change="onYearChange">
						<view class="idx-year">{{ year || '年份' }} ▾</view>
					</picker>
					<image class="idx-icon-img" src="/static/icon-search.png" @click="goSearch" />
					<image class="idx-icon-img" src="/static/icon-bell.png" @click="onNotify" />
				</view>
			</view>
		</view>

		<!-- 个人信息行 -->
		<view class="idx-profile" @click="goProfile">
			<image class="idx-avatar" :src="avatarUrl" mode="aspectFill" />
			<view class="idx-profile-info">
				<view class="idx-profile-row">
					<text class="idx-nickname">{{ nickname }}</text>
					<text v-if="myAge !== null" class="idx-age">{{ myAge }}岁</text>
				</view>
				<text class="idx-status">{{ statusText }}</text>
			</view>
		</view>

		<!-- 双列时间轴:左年龄胶囊 + 右内容卡 -->
		<view class="idx-timeline" v-if="renderList.length">
			<view v-for="(node, i) in renderList" :key="i" class="tl-row">
				<!-- 左侧年龄胶囊列 -->
				<view class="tl-rail">
					<view v-if="node.type === 'today'" class="tl-pill now-dash">
						{{ myAge !== null ? myAge + '岁' : '今天' }}
					</view>
					<view
						v-else-if="node.type === 'mark'"
						:class="['tl-pill', isFutureMark(node) ? 'future' : 'passed']"
					>
						{{ node.label }}
					</view>
				</view>
				<!-- 中间时间轴节点列 -->
				<view class="tl-nodecol">
					<view :class="['tl-node', node.type === 'today' ? 'heart' : '']">
						<text v-if="node.type === 'today'" class="tl-heart">♥</text>
					</view>
					<view class="tl-line"></view>
				</view>
				<!-- 右侧内容列 -->
				<view class="tl-content">
					<!-- 今日一签 -->
					<view v-if="node.type === 'today'" class="tl-quote">
						<view class="tl-quote-head">
							<text class="tl-quote-mark">❝</text>
							<text class="tl-quote-title">今日一签</text>
							<text class="tl-quote-date">{{ todayCN }}</text>
						</view>
						<text class="tl-quote-text">把日子过成值得被记住的样子，慢慢来，反而比较快。</text>
						<text class="tl-quote-tag">今天也值得被记住</text>
					</view>
					<!-- 印记卡片 -->
					<memory-card
						v-else-if="node.type === 'card'"
						:memory="node.memory"
						@click="goDetail"
						@longpress="onLongpress"
					/>
					<!-- 未记录占位 -->
					<view v-else-if="node.type === 'placeholder'" class="tl-placeholder">
						还没有留下这个阶段的故事
					</view>
				</view>
			</view>
			<view class="tl-loading">{{ loading ? '加载中...' : hasMore ? '上滑回溯更久远的时光' : '已经回到故事的开端' }}</view>
		</view>

		<!-- 空状态 -->
		<view v-else-if="!loading" class="idx-empty">
			<empty-state
				:text="year ? `${year} 年还没有留下故事` : '还没有留下人生的第一条印记'"
				sub="从现在开始,一切都值得被记住"
			>
				<template #action>
					<view class="ti-btn" @click="goCreate">创建第一条时光印记</view>
				</template>
			</empty-state>
		</view>

		<!-- 底部导航 -->
		<tab-bar current="home" />
	</view>
</template>

<script>
	// 首页:人生时间轴(核心页面)
	import { listMemories, deleteMemory, setHighlight, updateMemory } from '../../utils/db'
	import { removeFile } from '../../utils/media'
	import { calcAge, fmtCN, today } from '../../utils/date'
	import { AGE_MARKS, FUTURE_STAGE } from '../../utils/stage'
	import { store, loadUser } from '../../store'

	const PAGE_SIZE = 20

	export default {
		data() {
			return {
				statusBarHeight: 20,
				memories: [],
				renderList: [],
				year: '',
				years: [],
				loading: false,
				hasMore: true,
				myAge: null
			}
		},
		computed: {
			yearOptions() {
				return ['全部年份'].concat(this.years)
			},
			todayCN() {
				const [y, m, d] = today().split('-')
				return `${parseInt(m)}月${parseInt(d)}日`
			},
			// 当前年龄所处的时间轴刻度(心形节点所在档)
			currentMarkAge() {
				if (this.myAge === null || this.myAge < 0) return null
				let cur = null
				for (const m of AGE_MARKS) if (m <= this.myAge) cur = m
				return cur
			},
			avatarUrl() {
				return (store.user && store.user.avatar) || '/static/logo.png'
			},
			nickname() {
				return (store.user && store.user.nickname) || '未设置昵称'
			},
			statusText() {
				if (!store.user || !store.user.birthDate) return '点击完善你的个人档案'
				return store.user.status || '今天也值得被记住'
			}
		},
		onLoad() {
			const sys = uni.getSystemInfoSync()
			this.statusBarHeight = sys.statusBarHeight || 20
		},
		onShow() {
			this.reload()
		},
		onReachBottom() {
			this.loadMore()
		},
		methods: {
			isFutureMark(node) {
				return this.myAge !== null && node.age !== null && node.age > this.myAge
			},
			async reload() {
				if (!store.ready) await loadUser()
				this.myAge = store.user && store.user.birthDate ? calcAge(store.user.birthDate) : null
				await this.refreshYears()
				this.memories = []
				this.hasMore = true
				this.renderList = []
				await this.loadPage()
			},
			async refreshYears() {
				// 有记录的年份集合(供年份筛选)
				const all = await listMemories({ offset: 0, limit: 9999, noMedia: true })
				const set = new Set()
				for (const m of all) if (m.eventDate) set.add(m.eventDate.slice(0, 4))
				this.years = [...set].sort()
			},
			async loadPage() {
				if (this.loading || !this.hasMore) return
				this.loading = true
				try {
					const rows = await listMemories({
						offset: this.memories.length,
						limit: PAGE_SIZE,
						year: this.year || undefined,
						includeArchived: false
					})
					this.memories = this.memories.concat(rows)
					this.hasMore = rows.length >= PAGE_SIZE
					this.buildRenderList()
				} finally {
					this.loading = false
				}
			},
			loadMore() {
				this.loadPage()
			},
			// 构建渲染结构:今日一签 / 年龄分割线 / 空区间占位 / 印记卡片
			buildRenderList() {
				const birth = store.user && store.user.birthDate
				const list = [{ type: 'today' }]
				let lastMarkIdx = -1
				for (const m of this.memories) {
					const age = birth ? calcAge(birth, m.eventDate) : null
					if (age !== null && age < 0) {
						// 未来日期:归入「未来计划」
						if (lastMarkIdx < AGE_MARKS.length) {
							list.push({ type: 'mark', label: FUTURE_STAGE.label, age: null })
							lastMarkIdx = AGE_MARKS.length
						}
						list.push({ type: 'card', memory: m })
						continue
					}
					if (age === null) {
						// 未设置出生日期:直接展示卡片
						list.push({ type: 'card', memory: m })
						continue
					}
					let curIdx = -1
					for (let i = 0; i < AGE_MARKS.length; i++) {
						if (AGE_MARKS[i] <= age) curIdx = i
					}
					for (let j = lastMarkIdx + 1; j <= curIdx; j++) {
						list.push({ type: 'mark', label: `${AGE_MARKS[j]}岁`, age: AGE_MARKS[j] })
						// 分割线与下一条记录之间无记录的区间,插入灰色占位
						if (j < curIdx) {
							list.push({ type: 'placeholder', from: AGE_MARKS[j], to: AGE_MARKS[j + 1] })
						}
					}
					lastMarkIdx = Math.max(lastMarkIdx, curIdx)
					list.push({ type: 'card', memory: m })
				}
				this.renderList = list
			},
			onYearChange(e) {
				const idx = Number(e.detail.value)
				this.year = idx === 0 ? '' : this.yearOptions[idx]
				this.reload()
			},
			onNotify() {
				uni.showToast({ title: '这里安静而安全,没有打扰', icon: 'none' })
			},
			goSearch() {
				uni.navigateTo({ url: '/pages/search/search' })
			},
			goProfile() {
				uni.navigateTo({ url: '/pages/mine/profile' })
			},
			goCreate() {
				uni.navigateTo({ url: '/pages/memory/create' })
			},
			goDetail(memory) {
				uni.navigateTo({ url: '/pages/memory/detail?id=' + memory.memoryId })
			},
			// 长按菜单:编辑、删除、加入高光、归档(需求 2.3)
			onLongpress(memory) {
				const actions = ['编辑', '删除', memory.isHighlight ? '取消高光' : '加入高光', memory.isArchived ? '取消归档' : '归档']
				uni.showActionSheet({
					itemList: actions,
					success: async r => {
						const id = memory.memoryId
						switch (r.tapIndex) {
							case 0:
								uni.navigateTo({ url: '/pages/memory/edit?id=' + id })
								break
							case 1:
								this.confirmDelete(memory)
								break
							case 2:
								await setHighlight(id, !memory.isHighlight, memory.title)
								uni.showToast({ title: memory.isHighlight ? '已取消高光' : '已加入高光回忆集', icon: 'none' })
								this.reload()
								break
							case 3:
								await updateMemory(id, { isArchived: memory.isArchived ? 0 : 1 })
								uni.showToast({ title: memory.isArchived ? '已取消归档' : '已归档', icon: 'none' })
								this.reload()
								break
						}
					}
				})
			},
			confirmDelete(memory) {
				uni.showModal({
					title: '删除这条印记?',
					content: '删除后无法恢复,关联的媒体文件将一并删除',
					confirmColor: '#D96A5B',
					success: async r => {
						if (!r.confirm) return
						for (const md of memory.medias || []) removeFile(md.url)
						await deleteMemory(memory.memoryId)
						uni.showToast({ title: '已删除', icon: 'none' })
						this.reload()
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.idx {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 260rpx;
	}
	.idx-nav {
		background: $ti-bg;
	}
	.idx-nav-row {
		height: 96rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 $page-pad;
	}
	.idx-title {
		font-size: 48rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.idx-nav-icons {
		display: flex;
		align-items: center;
		gap: 24rpx;
	}
	.idx-year {
		font-size: $font-small;
		font-weight: 600;
		color: $ti-text-2;
		background: #FFFFFF;
		border-radius: 999rpx;
		padding: 8rpx 22rpx;
		box-shadow: 0 2rpx 8rpx rgba(27, 59, 87, 0.05);
	}
	.idx-icon-img {
		width: 44rpx;
		height: 44rpx;
	}

	.idx-profile {
		display: flex;
		align-items: center;
		gap: 24rpx;
		padding: 16rpx $page-pad 0;
	}
	.idx-avatar {
		width: 104rpx;
		height: 104rpx;
		border-radius: 50%;
		background: $ti-accent-light;
		flex-shrink: 0;
	}
	.idx-profile-info {
		flex: 1;
	}
	.idx-profile-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}
	.idx-nickname {
		font-size: 38rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.idx-age {
		font-size: $font-small;
		font-weight: 700;
		color: #B4692E;
		background: $ti-accent-light;
		border-radius: 20rpx;
		padding: 6rpx 20rpx;
	}
	.idx-status {
		display: block;
		margin-top: 10rpx;
		font-size: $font-body;
		color: $ti-text-3;
	}

	/* ============ 双列时间轴 ============ */
	.idx-timeline {
		display: flex;
		flex-direction: column;
		padding: 28rpx $page-pad 0;
	}
	.tl-row {
		display: flex;
		align-items: stretch;
	}
	.tl-rail {
		width: 168rpx;
		flex-shrink: 0;
		padding-top: 24rpx;
	}
	.tl-pill {
		display: inline-block;
		height: 84rpx;
		line-height: 84rpx;
		padding: 0 32rpx;
		border-radius: 999rpx;
		font-size: 32rpx;
		font-weight: 800;
		color: $ti-navy;
		box-sizing: border-box;
		white-space: nowrap;
	}
	.tl-pill.passed {
		background: linear-gradient(135deg, #DCEBEA, #CFE4E2);
	}
	.tl-pill.future {
		background: linear-gradient(135deg, #FAE9D3, #F8E2C4);
	}
	.tl-pill.now-dash {
		background: #FBF4E4;
		border: 3rpx dashed $ti-accent;
		color: #B4692E;
		font-size: 30rpx;
	}
	.tl-nodecol {
		width: 72rpx;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 40rpx;
	}
	.tl-node {
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		border: 7rpx solid $ti-primary;
		background: #FFFFFF;
		box-sizing: border-box;
		flex-shrink: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.tl-node.heart {
		width: 64rpx;
		height: 64rpx;
		border: none;
		background: $ti-primary;
		margin-top: -8rpx;
	}
	.tl-heart {
		color: #FFFFFF;
		font-size: 30rpx;
		line-height: 1;
	}
	.tl-line {
		flex: 1;
		width: 8rpx;
		min-height: 80rpx;
		margin-top: 10rpx;
		border-radius: 6rpx;
		background: linear-gradient(180deg, #F0C79B, #6FA3A3 30%, #4F8B8B);
		opacity: 0.75;
	}
	.tl-content {
		flex: 1;
		min-width: 0;
		margin-left: 20rpx;
		margin-bottom: 32rpx;
	}
	.tl-quote {
		background: $ti-card;
		border-radius: 40rpx;
		padding: 30rpx 30rpx 26rpx;
		box-shadow: $shadow-card;
	}
	.tl-quote-head {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}
	.tl-quote-mark {
		color: $ti-primary;
		font-size: 32rpx;
		font-weight: 800;
	}
	.tl-quote-title {
		font-size: 30rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.tl-quote-date {
		margin-left: auto;
		font-size: $font-small;
		color: $ti-text-3;
	}
	.tl-quote-text {
		display: block;
		margin-top: 16rpx;
		font-size: $font-body;
		color: $ti-text-2;
		line-height: 1.75;
	}
	.tl-quote-tag {
		display: inline-block;
		margin-top: 18rpx;
		font-size: $font-small;
		font-weight: 600;
		color: $ti-primary-deep;
		background: $ti-primary-mist;
		border-radius: 20rpx;
		padding: 8rpx 20rpx;
	}
	.tl-placeholder {
		border: 2rpx dashed $ti-line;
		border-radius: 40rpx;
		padding: 40rpx 32rpx;
		color: $ti-text-3;
		font-size: $font-body;
		background: rgba(255, 255, 255, 0.5);
	}
	.tl-loading {
		text-align: center;
		padding: 24rpx 0;
		font-size: $font-small;
		color: $ti-text-3;
	}

	.idx-empty {
		margin-top: 80rpx;
	}
</style>
