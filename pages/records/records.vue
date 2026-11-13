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
				<!-- 缩略图: 第一张照片 > 视频首帧 > 语音声波 > 心情切图(未选心情用默认) -->
				<image v-if="firstImage(m)" :src="firstImage(m)" mode="aspectFill" class="rc-thumb" />
				<!-- 视频: 组件默认展示第一帧, 点击进详情播放 -->
				<view v-else-if="firstVideo(m)" class="rc-thumb rc-thumb-media">
					<video
						class="rc-thumb-video"
						:src="firstVideo(m).url"
						object-fit="cover"
						:controls="false"
						:autoplay="false"
						:muted="true"
						:show-center-play-btn="false"
						:show-play-btn="false"
					/>
					<view class="rc-thumb-play center"><view class="rc-play-tri lg"></view></view>
				</view>
				<!-- 语音: 声波切图 + 播放按钮, 点击内联播放/停止 -->
				<view
					v-else-if="firstVoice(m)"
					:class="['rc-thumb', 'rc-thumb-media', 'rc-thumb-face', 'tbg-' + faceOf(m)]"
					@click.stop="toggleVoice(m)"
				>
					<view class="rc-wave">
						<view v-for="(h, i) in waveBars" :key="i" class="rc-wave-bar" :style="{ height: h + 'rpx' }"></view>
					</view>
					<view class="rc-thumb-play">
						<view v-if="playingId !== m.memoryId" class="rc-play-tri"></view>
						<template v-else>
							<view class="rc-pause-bar"></view>
							<view class="rc-pause-bar"></view>
						</template>
					</view>
				</view>
				<!-- 心情表情切图 -->
				<view v-else :class="['rc-thumb', 'rc-thumb-face', 'tbg-' + faceOf(m)]">
					<view v-if="faceSpec(m).sprout" class="fc-sprout">
						<view class="sp-leaf l"></view>
						<view class="sp-leaf r"></view>
						<view class="sp-stem"></view>
					</view>
					<view v-else class="fc">
						<view v-if="faceSpec(m).brow" class="fc-brow l"></view>
						<view v-if="faceSpec(m).brow" class="fc-brow r"></view>
						<view :class="['fc-eye', 'l', 'is-' + faceSpec(m).eyes]"></view>
						<view :class="['fc-eye', 'r', 'is-' + faceSpec(m).eyes]"></view>
						<view :class="['fc-mouth', 'is-' + faceSpec(m).mouth]"></view>
						<view v-if="faceSpec(m).accent === 'drop'" class="fc-drop"></view>
						<text v-else-if="faceSpec(m).accent === 'heart'" class="fc-accent">♥</text>
						<text v-else-if="faceSpec(m).accent === 'q'" class="fc-accent">?</text>
					</view>
				</view>
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

	export default {
		data() {
			return {
				total: 0,
				rows: [],
				filter: '',
				loading: false,
				hasMore: true,
				playingId: '', // 正在内联播放语音的记录 id
				waveBars: [14, 26, 40, 26, 14] // 声波切图的柱高
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
		beforeUnmount() {
			if (this._audio) {
				this._audio.destroy()
				this._audio = null
			}
		},
		methods: {
			emotionOf,
			fmtCN,
			// 展示用人生阶段: 出生前的印记统一显示「未出生」
			stageLabel(m) {
				const birth = store.user && store.user.birthDate
				return stageLabelOf(birth, m.eventDate, m.lifeStage)
			},
			// 缩略图素材: 第一张照片 / 视频 / 语音
			firstImage(m) {
				const img = (m.medias || []).find(x => x.type === 'image')
				return img ? img.url : ''
			},
			firstVideo(m) {
				return (m.medias || []).find(x => x.type === 'video') || null
			},
			firstVoice(m) {
				return (m.medias || []).find(x => x.type === 'voice') || null
			},
			// 心情切图: 未选心情回退到默认嫩芽
			faceOf(m) {
				return m.emotion || 'default'
			},
			faceSpec(m) {
				return FACE_MAP[this.faceOf(m)] || FACE_MAP.default
			},
			// 切图上的语音播放: 点击播放/停止, 同一时间只播一条
			toggleVoice(m) {
				const v = this.firstVoice(m)
				if (!v) return
				if (!this._audio) {
					this._audio = uni.createInnerAudioContext()
					this._audio.onEnded(() => { this.playingId = '' })
					this._audio.onError(() => {
						this.playingId = ''
						uni.showToast({ title: '语音播放失败', icon: 'none' })
					})
				}
				if (this.playingId === m.memoryId) {
					this._audio.stop()
					this.playingId = ''
					return
				}
				this._audio.stop()
				this._audio.src = v.url
				this._audio.play()
				this.playingId = m.memoryId
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
	.rc-thumb {
		width: 124rpx;
		height: 124rpx;
		border-radius: 32rpx;
		flex-shrink: 0;
		background: $ti-bg;
	}
	.rc-thumb-media {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.rc-thumb-video {
		width: 100%;
		height: 100%;
	}
	.rc-thumb-face {
		display: flex;
		align-items: center;
		justify-content: center;
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
	.rc-wave {
		display: flex;
		align-items: center;
		gap: 7rpx;
	}
	.rc-wave-bar {
		width: 7rpx;
		border-radius: 4rpx;
		background: var(--fc);
	}

	/* ===== 切图上的播放按钮 ===== */
	.rc-thumb-play {
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
	.rc-thumb-play.center {
		right: auto;
		bottom: auto;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 56rpx;
		height: 56rpx;
		background: rgba(255, 255, 255, 0.85);
	}
	.rc-play-tri {
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 8rpx 0 8rpx 13rpx;
		border-color: transparent transparent transparent #4F8B8B;
		margin-left: 5rpx;
	}
	.rc-play-tri.lg {
		border-width: 11rpx 0 11rpx 18rpx;
		margin-left: 7rpx;
	}
	.rc-pause-bar {
		width: 6rpx;
		height: 16rpx;
		border-radius: 2rpx;
		background: #4F8B8B;
		margin: 0 3rpx;
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
