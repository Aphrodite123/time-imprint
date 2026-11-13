<template>
	<view class="st">
		<!-- 顶部: 返回靠左 + 标题居中, 副标题居中, 找一找工具移到标题下方 -->
		<nav-bar title="人生阶段集" subtitle="按阶段回看你的故事">
			<template #tools>
				<view class="nb-tools-group">
					<view class="nb-tool" @click="goSearch">
						<image src="/static/icon-search.png" mode="aspectFit" />
					</view>
				</view>
			</template>
		</nav-bar>

		<!-- 阶段筛选 -->
		<scroll-view scroll-x class="st-chips">
			<view :class="['st-chip', !current ? 'on-teal' : '']" @click="setCurrent('')">全部</view>
			<view
				v-for="s in stages"
				:key="s.key"
				:class="['st-chip', current === s.label ? 'on-orange' : '']"
				@click="setCurrent(s.label)"
			>
				{{ s.label }}
			</view>
		</scroll-view>

		<!-- 双列卡片流 -->
		<view class="st-grid" v-if="list.length">
			<view
				v-for="(m, i) in list"
				:key="m.memoryId"
				class="st-card"
				@click="goDetail(m)"
				@longpress="onLongpress(m)"
			>
				<!-- 头行: 紧凑日期 + 更多(与首页卡片同款三点) -->
				<view class="st-card-head">
					<text class="st-card-date">{{ shortDate(m) }}</text>
					<view class="st-card-more" @click.stop="onLongpress(m)">
						<view class="st-more-dot"></view>
						<view class="st-more-dot"></view>
						<view class="st-more-dot"></view>
					</view>
				</view>

				<!-- 封面: 首图 / 视频首帧缩略(▶); 无图无视频则不渲染封面, 直接展示文本 -->
				<view v-if="coverImage(m) || firstVideo(m)" class="st-cover">
					<image v-if="coverImage(m)" :src="coverImage(m)" mode="aspectFill" class="st-cover-img" />
					<view v-else class="st-cover-video">
						<image
							v-if="firstVideo(m).thumbnailUrl"
							:src="firstVideo(m).thumbnailUrl"
							mode="aspectFill"
							class="st-cover-img"
						/>
						<view v-else class="st-cover-video-bg"></view>
						<view class="st-cover-playbadge">
							<view class="st-cover-play-tri"></view>
						</view>
					</view>
					<!-- 媒体计数徽章: 图/视频/音频数量一目了然 -->
					<view v-if="mediaBadges(m).length" class="st-cover-badges">
						<text v-for="(b, bi) in mediaBadges(m)" :key="bi" class="st-cover-badge">{{ b }}</text>
					</view>
				</view>
				<!-- 纯音频: 通用声音磁贴(声波样式, 与记录列表一致) + 数量徽章 -->
				<view v-else-if="firstVoice(m)" class="st-cover st-cover-audio">
					<view class="st-cover-wave">
						<view v-for="(h, wi) in waveBars" :key="wi" class="st-wave-bar" :style="{ height: h + 'rpx' }"></view>
					</view>
					<view class="st-cover-playbtn">
						<view class="st-cover-play-tri"></view>
					</view>
					<view v-if="mediaBadges(m).length" class="st-cover-badges">
						<text v-for="(b, bi) in mediaBadges(m)" :key="bi" class="st-cover-badge">{{ b }}</text>
					</view>
				</view>

				<!-- 标题 / 正文摘录 -->
				<text v-if="m.title" class="st-card-title">{{ m.title }}</text>
				<text v-if="m.content" :class="['st-card-desc', m.title ? '' : 'more']">{{ m.content }}</text>

				<!-- 底部: 收藏 ♥ / 高光 ★ / 情绪 + 阶段(未出生/年龄) -->
				<view class="st-card-foot">
					<view class="st-card-foot-left">
						<text v-if="m.isFavorite" class="st-foot-fav">♥</text>
						<text v-if="m.isHighlight" class="st-foot-star">★</text>
						<view v-if="emotionOf(m.emotion)" class="st-foot-emo">
							<text class="st-foot-emo-emoji">{{ emotionOf(m.emotion).emoji }}</text>
							<text class="st-foot-emo-label">{{ emotionOf(m.emotion).label }}</text>
						</view>
					</view>
					<text v-if="stageText(m)" class="st-foot-age">{{ stageText(m) }}</text>
				</view>
			</view>
		</view>
		<view v-else-if="!loading" class="st-empty">
			<empty-state :text="current ? `${current}还没有留下故事` : '还没有留下任何故事'" sub="创建印记后,会按人生阶段自动归组" />
		</view>

		<!-- 吸底 TabBar(按最新设计图, 阶段集页与档案馆同属一个标签流) -->
		<tab-bar current="archive" />
	</view>
</template>

<script>
	// 人生阶段集:按阶段自动分组查看(需求 2.5)
	import { listMemories, setHighlight, deleteMemory } from '../../utils/db'
	import { removeFile } from '../../utils/media'
	import { STAGES, UNBORN_STAGE, emotionOf, stageLabelOf } from '../../utils/stage'
	import { calcAge } from '../../utils/date'
	import { store } from '../../store'

	export default {
		data() {
			return {
				stages: STAGES.concat([UNBORN_STAGE]),
				current: '',
				list: [],
				loading: false,
				waveBars: [14, 26, 40, 26, 14] // 音频磁贴声波柱高
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			emotionOf,
			setCurrent(label) {
				this.current = label
				this.load()
			},
			// ===== 卡片展示辅助 =====
			// 紧凑日期: 今年显示 M月D日, 非今年显示完整年月日
			shortDate(m) {
				const d = m.eventDate || ''
				const parts = d.split('-')
				if (parts.length < 3) return d
				const [y, mo, day] = parts
				const cur = new Date().getFullYear()
				return parseInt(y) === cur
					? `${parseInt(mo)}月${parseInt(day)}日`
					: `${y}年${parseInt(mo)}月${parseInt(day)}日`
			},
			// 底部阶段文案: 未出生(事件早于出生) / N岁 / 空(未填生日)
			stageText(m) {
				const birth = store.user && store.user.birthDate
				if (!birth || !m.eventDate) return ''
				const a = calcAge(birth, m.eventDate)
				return a < 0 ? '未出生' : `${a}岁`
			},
			coverImage(m) {
				const img = (m.medias || []).find(x => x.type === 'image')
				return img ? img.url : ''
			},
			firstVideo(m) {
				return (m.medias || []).find(x => x.type === 'video') || null
			},
			firstVoice(m) {
				return (m.medias || []).find(x => x.type === 'voice') || null
			},
			totalVoiceDur(m) {
				return (m.medias || []).filter(x => x.type === 'voice').reduce((s, x) => s + (x.duration || 0), 0)
			},
			// 媒体计数徽章: 同类媒体多于 1 个时展示
			mediaBadges(m) {
				const medias = m.medias || []
				const n = t => medias.filter(x => x.type === t).length
				const badges = []
					if (n('image') > 1) badges.push(`图片 ${n('image')}`)
					if (n('video') > 1) badges.push(`视频 ${n('video')}`)
					if (n('voice') > 1) badges.push(`音频 ${n('voice')}`)
				return badges
			},
			fmtDur(s) {
				s = Math.max(0, Math.round(s || 0))
				return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60)
			},
			async load() {
				this.loading = true
				try {
					const rows = await listMemories({ offset: 0, limit: 9999, includeArchived: true })
					// 按展示用阶段归组: 出生前的印记统一归入「未出生」
					const birth = store.user && store.user.birthDate
					this.list = this.current
						? rows.filter(m => stageLabelOf(birth, m.eventDate, m.lifeStage) === this.current)
						: rows
				} finally {
					this.loading = false
				}
			},
			goDetail(m) {
				uni.navigateTo({ url: '/pages/memory/detail?id=' + m.memoryId })
			},
			goSearch() {
				uni.navigateTo({ url: '/pages/search/search' })
			},
			onLongpress(m) {
				uni.showActionSheet({
					itemList: ['编辑', '删除', m.isHighlight ? '取消高光' : '加入高光'],
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
							await setHighlight(m.memoryId, !m.isHighlight, m.title)
							this.load()
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.st {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 200rpx;
	}
	.st-chips {
		display: flex;
		white-space: nowrap;
		padding: 30rpx $page-pad 6rpx;
		box-sizing: border-box;
	}
	.st-chip {
		display: inline-flex;
		align-items: center;
		height: 76rpx;
		padding: 0 38rpx;
		margin-right: 20rpx;
		border-radius: 999rpx;
		font-size: 28rpx;
		font-weight: 600;
		color: $ti-text-2;
		background: #FFFFFF;
		border: 2rpx solid #E6E0D2;
		box-sizing: border-box;
	}
	.st-chip.on-teal {
		background: linear-gradient(135deg, #579292, #4A8282);
		border-color: transparent;
		color: #FFFFFF;
	}
	.st-chip.on-orange {
		background: linear-gradient(135deg, #F2A262, #EC9048);
		border-color: transparent;
		color: #FFFFFF;
	}
	.st-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 24rpx;
		padding: 28rpx $page-pad 0;
	}
	.st-card {
		width: calc((100% - 24rpx) / 2);
		background: $ti-card;
		border-radius: 40rpx;
		padding: 24rpx;
		box-sizing: border-box;
		box-shadow: $shadow-card;
		display: flex;
		flex-direction: column;
	}

	/* ===== 头行 ===== */
	.st-card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.st-card-date {
		font-size: 22rpx;
		font-weight: 600;
		color: $ti-text-3;
	}
	.st-card-more {
		display: flex;
		align-items: center;
		gap: 6rpx;
		padding: 6rpx;
	}
	.st-more-dot {
		width: 8rpx;
		height: 8rpx;
		border-radius: 50%;
		background: #B9B2A0;
	}

	/* ===== 封面 ===== */
	.st-cover {
		position: relative;
		margin-top: 16rpx;
		height: 220rpx;
		border-radius: 28rpx;
		overflow: hidden;
		background: $ti-bg;
	}
	.st-cover-img {
		width: 100%;
		height: 100%;
		display: block;
	}
	.st-cover-video {
		position: relative;
		width: 100%;
		height: 100%;
		background: #26394B;
	}
	.st-cover-video-bg {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(150deg, #3E566C, #26394B);
	}
	.st-cover-playbadge {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 56rpx;
		height: 56rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 2rpx 8rpx rgba(79, 139, 139, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.st-cover-play-tri {
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 10rpx 0 10rpx 16rpx;
		border-color: transparent transparent transparent #4F8B8B;
		margin-left: 6rpx;
	}
	.st-cover-badges {
		position: absolute;
		left: 12rpx;
		bottom: 12rpx;
		display: flex;
		gap: 10rpx;
	}
	.st-cover-badge {
		font-size: 20rpx;
		color: #FFFFFF;
		background: rgba(27, 43, 57, 0.55);
		border-radius: 10rpx;
		padding: 2rpx 12rpx;
	}
	/* 纯音频: 通用声音磁贴(薄荷底 + 声波, 数量徽章与图片一致) */
	.st-cover-audio {
		background: linear-gradient(150deg, #E3F0EC, #C7E3DD);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.st-cover-wave {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}
	.st-wave-bar {
		width: 8rpx;
		border-radius: 4rpx;
		background: #4F8B8B;
	}
	.st-cover-playbtn {
		position: absolute;
		right: 14rpx;
		bottom: 14rpx;
		width: 44rpx;
		height: 44rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 2rpx 8rpx rgba(79, 139, 139, 0.25);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.st-cover-play-tri {
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 9rpx 0 9rpx 14rpx;
		border-color: transparent transparent transparent #4F8B8B;
		margin-left: 5rpx;
	}

	/* ===== 标题 / 正文 ===== */
	.st-card-title {
		display: block;
		margin-top: 18rpx;
		font-size: 30rpx;
		font-weight: 800;
		color: $ti-navy;
		line-height: 1.45;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}
	.st-card-desc {
		display: -webkit-box;
		margin-top: 10rpx;
		font-size: $font-body;
		color: $ti-text-2;
		line-height: 1.6;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}
	.st-card-desc.more {
		-webkit-line-clamp: 3;
	}

	/* ===== 底部 meta ===== */
	.st-card-foot {
		display: flex;
		align-items: center;
		margin-top: auto;
		padding-top: 16rpx;
		min-height: 48rpx;
	}
	.st-card-foot-left {
		display: flex;
		align-items: center;
		gap: 14rpx;
		flex: 1;
		min-width: 0;
	}
	.st-foot-fav {
		font-size: 30rpx;
		line-height: 1;
		color: #E8705F;
	}
	.st-foot-star {
		font-size: 28rpx;
		line-height: 1;
		color: $ti-accent;
	}
	.st-foot-emo {
		display: inline-flex;
		align-items: center;
		gap: 6rpx;
		background: #EDF3F1;
		border-radius: 999rpx;
		padding: 6rpx 18rpx;
	}
	.st-foot-emo-emoji {
		font-size: 24rpx;
		line-height: 1;
	}
	.st-foot-emo-label {
		font-size: 22rpx;
		font-weight: 600;
		color: #3E7373;
	}
	.st-foot-age {
		font-size: 24rpx;
		color: $ti-text-3;
	}
	.st-empty {
		margin-top: 40rpx;
	}
</style>
