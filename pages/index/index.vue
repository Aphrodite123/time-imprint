<template>
	<view class="idx">
	<!-- 导航栏(组件内固定吸顶), 外层用于实测导航占位高度 -->
		<view class="idx-nav">
			<nav-bar title="时光印记" :back="false" @height="onNavHeight">
				<template #tools>
					<view class="nb-tools-group">
						<picker v-if="years.length" mode="selector" :range="yearOptions" @change="onYearChange">
							<view class="idx-year">{{ year || '全部年份' }} ▾</view>
						</picker>
						<view class="nb-tool" @click="goSearch">
							<image src="/static/icon-search.png" mode="aspectFit" />
						</view>
						<view class="nb-tool" @click="onNotify">
							<!-- 图标资产自带橙点, 无需再叠加 CSS 圆点 -->
							<image src="/static/icon-bell.png" mode="aspectFit" />
						</view>
					</view>
				</template>
			</nav-bar>
		</view>

		<!-- 个人信息行: 固定在导航栏下方, 不随页面滚动 -->
		<view class="idx-profile" :style="{ top: navH + 'px' }" @click="goProfile">
			<image class="idx-avatar" :src="avatarUrl" mode="aspectFill" />
			<view class="idx-profile-info">
				<view class="idx-profile-row">
					<text class="idx-nickname">{{ nickname }}</text>
					<text v-if="myAgeLabel" class="idx-age">{{ myAgeLabel }}</text>
				</view>
				<text class="idx-status">{{ statusText }}</text>
			</view>
		</view>
		<!-- 文档流占位: 高度与固定个人信息行一致 -->
		<view class="idx-profile-ph" :style="{ height: profileH + 'px' }"></view>

		<!-- 双列时间轴: 年龄正序排列, 默认定位到「今天」(左年龄胶囊 + 右内容卡) -->
		<view class="idx-timeline" v-if="renderList.length">
			<view
				v-for="(node, i) in renderList"
				:key="i"
				:id="node.type === 'today' ? 'tl-today' : ''"
				class="tl-row"
			>
				<!-- 左侧年龄胶囊列 -->
				<view class="tl-rail">
					<view v-if="node.type === 'today'" class="tl-pill now-dash">
						{{ myAgeLabel || '今天' }}
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
					<!-- 今天: 有当天印记则展示用户自己的印记(替换今日一签), 没有则展示默认今日一签 -->
					<template v-if="node.type === 'today'">
						<view v-if="!node.memories || !node.memories.length" class="tl-quote">
							<view class="tl-quote-head">
								<text class="tl-quote-mark">❝</text>
								<text class="tl-quote-title">今日一签</text>
								<text class="tl-quote-date">{{ todayCN }}</text>
							</view>
							<text class="tl-quote-text">把日子过成值得被记住的样子，慢慢来，反而比较快。</text>
							<text class="tl-quote-tag">今天也值得被记住</text>
						</view>
						<memory-card
							v-for="m in node.memories"
							:key="m.memoryId"
							:memory="m"
							@click="goDetail"
							@longpress="onLongpress"
							@more="onLongpress"
						/>
					</template>
					<!-- 印记卡片 -->
					<memory-card
						v-else-if="node.type === 'card'"
						:memory="node.memory"
						@click="goDetail"
						@longpress="onLongpress"
						@more="onLongpress"
					/>
					<!-- 未记录占位 -->
					<view v-else-if="node.type === 'placeholder'" class="tl-placeholder">
						还没有留下这个阶段的故事
					</view>
				</view>
			</view>
			<view class="tl-loading">{{ loading ? '加载中...' : hasMore ? '上滑加载更多时光' : '已经到最新的时光啦' }}</view>
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
	import { AGE_MARKS, FUTURE_STAGE, UNBORN_STAGE } from '../../utils/stage'
	import { getNavMetrics } from '../../utils/nav'
	import { store, loadUser } from '../../store'

	const PAGE_SIZE = 20

	export default {
		data() {
			return {
				memories: [],
				renderList: [],
				year: '',
				years: [],
				loading: false,
				hasMore: true,
				myAge: null,
				navH: 0, // 固定导航栏高度(px), 个人信息行吸顶定位用
				profileH: 0 // 固定个人信息行高度(px), 文档流占位用
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
			// 当前年龄文案: 出生前(生日在未来)统一显示「未出生」
			myAgeLabel() {
				if (this.myAge === null) return null
				return this.myAge < 0 ? UNBORN_STAGE.label : this.myAge + '岁'
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
		created() {
			// 个人信息行吸顶 top 的初始估算(挂载后实测校正): 状态栏 + 标题行
			const nav = getNavMetrics()
			const rowH = nav.rightInset > 0 && nav.capsuleHeight > 0
				? (nav.capsuleTop - nav.statusBarHeight) * 2 + nav.capsuleHeight
				: uni.upx2px(96)
			this.navH = nav.statusBarHeight + rowH
			this.profileH = uni.upx2px(140)
		},
		mounted() {
			this.measureHeader()
		},
		onShow() {
			this.reload()
		},
		onReachBottom() {
			this.loadMore()
		},
		methods: {
			// 实测固定个人信息行高度, 供文档流占位使用; 导航栏高度由 nav-bar 的 height 事件推送
			measureHeader() {
				this.$nextTick(() => {
					const q = uni.createSelectorQuery().in(this)
					q.select('.idx-profile').boundingClientRect()
					q.exec(res => {
						const rect = res && res[0]
						if (rect && rect.height) this.profileH = rect.height
					})
				})
			},
			onNavHeight(h) {
				this.navH = h
			},
			isFutureMark(node) {
				// 档位无年龄(未来计划)或档位年龄大于当前年龄, 均视为未来(暖色样式)
				return this.myAge !== null && (node.age === null || node.age > this.myAge)
			},
			async reload() {
				if (!store.ready) await loadUser()
				this.myAge = store.user && store.user.birthDate ? calcAge(store.user.birthDate) : null
				// 昵称/签名等档案信息就位后复测固定头高度
				this.measureHeader()
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
					// 首屏渲染完成后默认定位到「今天」
					if (!this._scrolled && this.renderList.length) {
						this._scrolled = true
						this.scrollToToday()
					}
				} finally {
					this.loading = false
				}
			},
			loadMore() {
				this.loadPage()
			},
			// 构建渲染结构(年龄正序): 过往印记升序 → 今天 → 未来印记。
			// 今天节点: 仅在「全部年份」或选中年份为当前年份时展示; 当天有印记则展示用户自己的印记(替换今日一签), 没有则展示默认今日一签
			buildRenderList() {
				const birth = store.user && store.user.birthDate
				const todayStr = today()
				// 年份筛选含今天(「全部年份」或选中的是当前年份)才展示今天节点, 否则只展示所选年份的印记
				const showToday = !this.year || this.year === todayStr.slice(0, 4)
				// 当前年龄所处的档位(用于在今天节点前补齐年龄刻度)
				let todayIdx = -1
				if (this.myAge !== null && this.myAge >= 0) {
					for (let i = 0; i < AGE_MARKS.length; i++) {
						if (AGE_MARKS[i] <= this.myAge) todayIdx = i
					}
				}
				const list = []
				let lastMarkIdx = -1
				let futureMarkPushed = false
				let unbornMarkPushed = false
				let todayPushed = false
				const pushToday = () => {
					if (todayPushed || !showToday) return
					todayPushed = true
					// 今天节点前补齐未跨过的年龄刻度: 不含今天所在档位(由今天的虚线年龄胶囊表达, 避免重复)
					for (let j = lastMarkIdx + 1; j < todayIdx; j++) {
						list.push({ type: 'mark', label: `${AGE_MARKS[j]}岁`, age: AGE_MARKS[j] })
					}
					// 紧邻的档位胶囊若与今天年龄相同(如 0 岁宝宝), 移除重复刻度
					if (this.myAge !== null && list.length && list[list.length - 1].type === 'mark') {
						const last = list[list.length - 1]
						if (last.label === this.myAgeLabel) list.pop()
					}
					if (todayIdx > lastMarkIdx) lastMarkIdx = todayIdx
					list.push({ type: 'today', memories: this.memories.filter(m => m.eventDate === todayStr) })
				}
				for (const m of this.memories) {
					if (m.eventDate === todayStr) continue // 今天的印记已在今天节点展示
					if (m.eventDate > todayStr && !todayPushed) pushToday()
					const age = birth ? calcAge(birth, m.eventDate) : null
					if (age !== null && age >= 0) {
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
						if (curIdx > lastMarkIdx) lastMarkIdx = curIdx
					} else if (age !== null && age < 0) {
						// 出生前的印记: 统一归入「未出生」档
						if (!unbornMarkPushed) {
							list.push({ type: 'mark', label: UNBORN_STAGE.label, age: null })
							unbornMarkPushed = true
						}
					} else if (m.eventDate > todayStr && !futureMarkPushed) {
						// 未填写出生日期的未来印记: 归入「未来计划」档
						list.push({ type: 'mark', label: FUTURE_STAGE.label, age: null })
						futureMarkPushed = true
					}
					list.push({ type: 'card', memory: m })
				}
				if (!todayPushed) pushToday()
				this.renderList = list
			},
			// 默认定位到「今天」节点(仅首屏执行一次)
			scrollToToday() {
				this.$nextTick(() => {
					setTimeout(() => {
						const query = uni.createSelectorQuery()
						query.select('#tl-today').boundingClientRect()
						query.selectViewport().scrollOffset()
						query.exec(res => {
							const rect = res && res[0]
							const vp = res && res[1]
							if (!rect || !vp) return
							const offset = this.navH + this.profileH
							uni.pageScrollTo({
								scrollTop: Math.max(vp.scrollTop + rect.top - (offset > 0 ? offset + 8 : 110), 0),
								duration: false
							})
						})
					}, 300)
				})
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
		padding-bottom: 200rpx;
	}
	.idx-year {
		font-size: $font-small;
		font-weight: 600;
		color: $ti-text-2;
		background: #FFFFFF;
		border-radius: 999rpx;
		padding: 10rpx 24rpx;
		box-shadow: 0 2rpx 8rpx rgba(27, 59, 87, 0.05);
	}

	.idx-nav {
		width: 100%;
	}

	.idx-profile {
		position: fixed;
		left: 0;
		right: 0;
		z-index: 900; /* 与导航栏同层: 吸顶不随页面滚动, 背景不透明遮住滚过的内容 */
		background: $ti-bg;
		display: flex;
		align-items: center;
		gap: 24rpx;
		padding: 16rpx $page-pad 12rpx;
		box-sizing: border-box;
	}
	.idx-profile-ph {
		width: 100%;
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
	/* 时间轴: 紧跟固定头之后, 顶部仅留少量间距 */
	.idx-timeline {
		display: flex;
		flex-direction: column;
		padding: 8rpx $page-pad 0;
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
