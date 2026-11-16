<template>
	<view class="wd">
		<!-- 顶部: 返回靠左 + 标题居中, 副标题居中, 搜索工具移到标题下方(避让小程序右上角胶囊) -->
		<nav-bar title="回忆漫游" subtitle="随机翻开一段旧时光">
			<template #tools>
				<view class="nb-tools-group">
					<view class="nb-tool" @click="goSearch">
						<image src="/static/icon-search.png" mode="aspectFit" />
					</view>
				</view>
			</template>
		</nav-bar>

		<!-- 漫游卡片 -->
		<view v-if="current" class="wd-card-wrap" :key="current.memoryId">
			<view class="wd-card-back left"></view>
			<view class="wd-card-back right"></view>
			<view class="wd-card">
				<!-- 有图片/视频: 网格全量铺开(多图点击翻看, 视频点击原地播放), 与详情页同一套 -->
				<media-grid v-if="avMedias.length" :medias="avMedias" :max-images="9" />
				<!-- 无图无视频: 按统一缩略图规则展示大图(语音声波/心情切图, 语音可点击播放) -->
				<view v-else class="wd-media">
					<memory-thumb :memory="current" size="lg" />
				</view>
				<view class="wd-meta">
					<text class="wd-date">{{ fmtCN(current.eventDate) }}</text>
				</view>
				<view class="wd-divider"></view>
				<!-- 无标题或标题复制自正文(旧数据)时不展示, 避免与正文重复 -->
				<text v-if="wdTitle" class="wd-m-title">{{ wdTitle }}</text>
				<text v-if="current.content" class="wd-content">{{ current.content }}</text>
				<view class="wd-bottom" v-if="voices.length || emotion">
					<view class="wd-voice-list" v-if="voices.length">
						<voice-bar v-for="(v, i) in voices" :key="v.url" :src="v.url" :duration="v.duration" />
					</view>
					<view v-if="emotion" class="wd-emotion">
						<text class="wd-emotion-emoji">{{ emotion.emoji }}</text>
						<text class="wd-emotion-label">{{ emotion.label }}</text>
					</view>
				</view>
			</view>
		</view>
		<view v-else-if="!loading" class="wd-empty">
			<empty-state text="还没有可以漫游的记忆" sub="先创建一条时光印记吧">
				<template #action>
					<view class="ti-btn" @click="goCreate">去创建印记</view>
				</template>
			</empty-state>
		</view>

		<!-- 操作按钮 -->
		<view class="wd-actions" v-if="current">
			<view class="wd-btn solid" @click="randomOne">再随机一条</view>
			<view class="wd-btn accent" @click="addHighlight">{{ current.isHighlight ? '已是高光' : '加入高光' }}</view>
		</view>

		<!-- 吸底 TabBar(按最新设计图, 回忆漫游页与档案馆同属一个标签流) -->
		<tab-bar current="archive" />
	</view>
</template>

<script>
	// 回忆漫游:随机抽取一条历史记录(需求 2.5)
	import { listMemories, setHighlight } from '../../utils/db'
	import { fmtCN } from '../../utils/date'
	import { emotionOf } from '../../utils/stage'

	export default {
		data() {
			return {
				all: [],
				current: null,
				loading: false
			}
		},
		computed: {
			// 图片+视频全量交给 media-grid 铺开(多图点击翻看, 视频点击原地播放)
			avMedias() {
				return ((this.current && this.current.medias) || []).filter(x => x.type === 'image' || x.type === 'video')
			},
			// 语音全部列出, 逐条播放
			voices() {
				return ((this.current && this.current.medias) || []).filter(x => x.type === 'voice')
			},
			emotion() {
				return this.current ? emotionOf(this.current.emotion) : null
			},
			// 卡片标题: 没有标题不展示; 旧数据里标题复制自正文首行(内容以其开头)时也不重复展示
			wdTitle() {
				const m = this.current
				if (!m) return ''
				const t = (m.title || '').trim()
				const c = (m.content || '').trim()
				if (!t) return ''
				if (c && (c.startsWith(t) || t.startsWith(c))) return ''
				return t
			}
		},
		onShow() {
			// 注意: 图片预览/原生弹层关闭也会触发 onShow, 这里只刷新数据不重随机, 保持当前展示的那条
			this.refresh()
		},
		methods: {
			fmtCN,
			goSearch() {
				uni.navigateTo({ url: '/pages/search/search' })
			},
			goCreate() {
				uni.navigateTo({ url: '/pages/memory/create' })
			},
			async refresh() {
				this.loading = true
				try {
					this.all = await listMemories({ offset: 0, limit: 9999 })
					if (!this.all.length) {
						this.current = null
					} else if (!this.current || !this.all.some(m => m.memoryId === this.current.memoryId)) {
						// 首次进入, 或当前那条已被删除: 重新随机
						this.randomOne()
					} else {
						// 保持当前那条, 仅同步最新数据(编辑后返回可见更新)
						this.current = this.all.find(m => m.memoryId === this.current.memoryId)
					}
				} finally {
					this.loading = false
				}
			},
			randomOne() {
				if (!this.all.length) return
				let pick = this.all[Math.floor(Math.random() * this.all.length)]
				// 避免与当前展示重复
				if (this.current && this.all.length > 1) {
					let guard = 0
					while (pick.memoryId === this.current.memoryId && guard++ < 10) {
						pick = this.all[Math.floor(Math.random() * this.all.length)]
					}
				}
				this.current = pick
			},
			async addHighlight() {
				if (!this.current || this.current.isHighlight) return
				await setHighlight(this.current.memoryId, true, this.current.title)
				this.current.isHighlight = 1
				uni.showToast({ title: '已加入高光回忆集', icon: 'none' })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.wd {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 200rpx;
	}
	.wd-card-wrap {
		position: relative;
		margin: 28rpx $page-pad 0;
	}
	.wd-card-back {
		position: absolute;
		top: 44rpx;
		width: 88%;
		height: 96%;
		border-radius: 52rpx;
		z-index: 0;
	}
	.wd-card-back.left {
		left: -18rpx;
		background: linear-gradient(180deg, #FAE8D2, #F5D9AE);
		transform: rotate(-5deg);
		box-shadow: 0 14rpx 34rpx rgba(240, 153, 90, 0.25);
	}
	.wd-card-back.right {
		right: -18rpx;
		background: linear-gradient(180deg, #DCEBEA, #C4DEDA);
		transform: rotate(5deg);
		box-shadow: 0 14rpx 34rpx rgba(79, 139, 139, 0.25);
	}
	.wd-card {
		position: relative;
		z-index: 1;
		background: $ti-card;
		border-radius: 52rpx;
		padding: 30rpx;
		box-shadow: $shadow-float;
	}
	.wd-media {
		height: 400rpx;
	}
	.wd-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 28rpx;
		padding: 0 6rpx;
	}
	.wd-date {
		font-size: 28rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.wd-divider {
		border-top: 4rpx dashed $ti-line;
		margin-top: 24rpx;
	}
	.wd-m-title {
		display: block;
		margin-top: 28rpx;
		font-size: 38rpx;
		font-weight: 800;
		color: #1B1B1B;
		text-align: center;
	}
	.wd-content {
		display: block;
		margin-top: 16rpx;
		font-size: 26rpx;
		color: $ti-text-2;
		line-height: 1.8;
		text-align: center;
	}
	.wd-bottom {
		display: flex;
		align-items: center;
		margin-top: 28rpx;
		gap: 24rpx;
		padding: 0 6rpx 6rpx;
	}
	.wd-voice-list {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}
	.wd-emotion {
		display: flex;
		align-items: center;
		gap: 10rpx;
	}
	.wd-emotion-emoji {
		font-size: 40rpx;
	}
	.wd-emotion-label {
		font-size: 26rpx;
		font-weight: 700;
		color: $ti-navy;
	}
	.wd-empty {
		margin-top: 60rpx;
	}
	.wd-actions {
		display: flex;
		gap: 28rpx;
		margin: 44rpx $page-pad 0;
		padding: 0 4rpx;
	}
	.wd-btn {
		flex: 1;
		height: 100rpx;
		line-height: 100rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 28rpx;
		font-weight: 700;
		letter-spacing: 2rpx;
	}
	.wd-btn.solid {
		background: linear-gradient(135deg, #579292, #4A8282);
		color: #FFFFFF;
		box-shadow: $shadow-primary;
	}
	.wd-btn.accent {
		background: linear-gradient(135deg, #F2A262, #EC9048);
		color: #FFFFFF;
		box-shadow: $shadow-accent;
	}
</style>
