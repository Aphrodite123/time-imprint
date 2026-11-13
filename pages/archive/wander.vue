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
				<image v-if="photo" :src="photo" mode="aspectFill" class="wd-photo" @click="previewPhoto" />
				<view v-else class="wd-photo wd-photo-blank">
					<text class="wd-photo-blank-icon">🕰️</text>
				</view>
				<view class="wd-meta">
					<text class="wd-date">{{ fmtCN(current.eventDate) }}</text>
					<text v-if="voice" class="wd-voice-icon">🎙</text>
				</view>
				<view class="wd-divider"></view>
				<text class="wd-m-title">{{ current.title || '一段旧时光' }}</text>
				<text v-if="current.content" class="wd-content">{{ current.content }}</text>
				<view class="wd-bottom">
					<voice-bar v-if="voice" :src="voice.url" :duration="voice.duration" class="wd-voice" />
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
			photo() {
				const m = (this.current && this.current.medias || []).find(x => x.type === 'image')
				return m ? m.url : ''
			},
			voice() {
				return ((this.current && this.current.medias) || []).find(x => x.type === 'voice') || null
			},
			emotion() {
				return this.current ? emotionOf(this.current.emotion) : null
			}
		},
		onShow() {
			this.init()
		},
		methods: {
			fmtCN,
			goSearch() {
				uni.navigateTo({ url: '/pages/search/search' })
			},
			goCreate() {
				uni.navigateTo({ url: '/pages/memory/create' })
			},
			async init() {
				this.loading = true
				try {
					this.all = await listMemories({ offset: 0, limit: 9999 })
					this.randomOne()
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
			},
			previewPhoto() {
				uni.previewImage({ urls: [this.photo] })
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
	.wd-photo {
		width: 100%;
		height: 400rpx;
		border-radius: 40rpx;
	}
	.wd-photo-blank {
		background: linear-gradient(150deg, #DCEBEA, #C4DEDA);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.wd-photo-blank-icon {
		font-size: 100rpx;
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
	.wd-voice-icon {
		font-size: 28rpx;
		color: $ti-text-3;
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

		.wd-voice {
			flex: 1;
		}
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
