<template>
	<view class="ar">
		<!-- 顶部: 标题居中(Tab 页无返回键), 副标题居中, 铃铛工具移到标题下方 -->
		<nav-bar title="成长档案馆" :back="false" subtitle="看见自己的变化">
			<template #tools>
				<view class="nb-tools-group">
					<view class="nb-tool" @click="onNotify">
						<!-- 图标资产自带橙点, 无需再叠加 CSS 圆点 -->
						<image src="/static/icon-bell.png" mode="aspectFit" />
					</view>
				</view>
			</template>
		</nav-bar>

		<!-- 成长快照统计卡 -->
		<view class="ar-snapshot" @click="goCalendar">
			<view class="ar-snap-head">
				<view>
					<text class="ar-snap-title">成长快照</text>
					<view class="ar-snap-bar"></view>
				</view>
				<text class="ar-snap-arrow">→</text>
			</view>
			<view class="ar-snap-grid">
				<view class="ar-snap-item">
					<text class="ar-snap-label">已记录</text>
					<view class="ar-snap-value-row">
						<text class="ar-snap-value">{{ stats.total }}</text>
						<text class="ar-snap-unit">条印记</text>
					</view>
				</view>
				<view class="ar-snap-item">
					<text class="ar-snap-label">照片</text>
					<view class="ar-snap-value-row">
						<text class="ar-snap-value">{{ stats.images }}</text>
						<text class="ar-snap-unit">张</text>
					</view>
				</view>
				<view class="ar-snap-item">
					<text class="ar-snap-label">语音</text>
					<view class="ar-snap-value-row">
						<text class="ar-snap-value">{{ stats.voices }}</text>
						<text class="ar-snap-unit">条</text>
					</view>
				</view>
				<view class="ar-snap-item">
					<text class="ar-snap-label">情绪标签</text>
					<view class="ar-snap-value-row">
						<text class="ar-snap-value">{{ emotionCount }}</text>
						<text class="ar-snap-unit">个</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 情绪柔和曲线 -->
		<view class="ar-chart" v-if="chartData.length">
			<!-- #ifdef MP-WEIXIN -->
			<canvas id="emotionChart" type="2d" class="ar-chart-canvas"></canvas>
			<!-- #endif -->
			<!-- #ifndef MP-WEIXIN -->
			<canvas id="emotionChart" canvas-id="emotionChart" class="ar-chart-canvas"></canvas>
			<!-- #endif -->
			<view class="ar-chart-axis">
				<text v-for="d in chartData" :key="d.key" class="ar-chart-axis-label">{{ d.label }}</text>
			</view>
		</view>

		<!-- 高光纪念册入口 -->
		<view class="ar-album" @click="goAlbum">
			<view class="ar-album-thumbs">
				<block v-for="(u, i) in albumThumbs" :key="i">
					<image v-if="u" :src="u" mode="aspectFill" class="ar-album-thumb" />
					<view v-else class="ar-album-thumb blank"></view>
				</block>
			</view>
			<view class="ar-album-info">
				<text class="ar-album-title">高光纪念册</text>
				<text class="ar-album-sub">把高光时刻，装订成册</text>
				<text class="ar-album-meta">{{ albumMeta }}</text>
			</view>
			<text v-if="albumCardCount" class="ar-album-new">NEW</text>
			<text class="ar-album-arrow">›</text>
		</view>

		<!-- 功能入口卡片组 -->
		<view class="ar-entries">
			<view class="ar-entry" @click="go('/pages/archive/stage')">
				<view class="ar-entry-icon teal">
					<image src="/static/entries/stage.png" mode="aspectFit" />
				</view>
				<text class="ar-entry-label">人生阶段集</text>
				<view class="ar-entry-dot orange"></view>
			</view>
			<view class="ar-entry" @click="go('/pages/archive/highlight')">
				<view class="ar-entry-icon orange">
					<image src="/static/entries/highlight.png" mode="aspectFit" />
				</view>
				<text class="ar-entry-label">高光回忆集</text>
				<view class="ar-entry-dot orange"></view>
			</view>
			<view class="ar-entry" @click="go('/pages/archive/compare')">
				<view class="ar-entry-icon orange">
					<image src="/static/entries/compare.png" mode="aspectFit" />
				</view>
				<text class="ar-entry-label">成长对比</text>
				<view class="ar-entry-dot blue"></view>
			</view>
			<view class="ar-entry" @click="go('/pages/archive/wander')">
				<view class="ar-entry-icon teal">
					<image src="/static/entries/wander.png" mode="aspectFit" />
				</view>
				<text class="ar-entry-label">回忆漫游</text>
				<view class="ar-entry-dot blue"></view>
			</view>
		</view>

		<tab-bar current="archive" />
	</view>
</template>

<script>
	// 成长档案馆:快照统计 + 情绪图表 + 功能入口(需求 2.5)
	import { getStats, listMemories, listPhotoCards } from '../../utils/db'
	import { groupByYear } from '../../utils/album'
	import { EMOTIONS } from '../../utils/stage'
	import { today } from '../../utils/date'

	import { appShare, appShareTimeline } from '../../utils/share'
	export default {
		// 微信转发/朋友圈分享(统一应用推广, 见 utils/share.js)
		onShareAppMessage() {
			return appShare()
		},
		onShareTimeline() {
			return appShareTimeline()
		},
		data() {
			return {
				stats: { total: 0, images: 0, voices: 0, emotions: {} },
				currentEmotion: '', // 当前情绪状态(今天最新一条带情绪的印记), 无则不画状态圆点
				albumCardCount: 0,
				albumCount: 0,
				albumThumbs: ['', '', '']
			}
		},
		computed: {
			albumMeta() {
				if (!this.albumCardCount) return '还没有纪念照 · 去做第一张'
				return `${this.albumCardCount} 张纪念照 · ${this.albumCount} 册`
			},
			emotionCount() {
				return Object.values(this.stats.emotions).reduce((s, n) => s + n, 0)
			},
			chartData() {
				// 始终绘制全部情绪(数量为 0 的也参与), 避免数据少时曲线退化成孤点
				return EMOTIONS.map(e => ({
					key: e.key,
					label: e.label,
					count: this.stats.emotions[e.key] || 0
				}))
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			async load() {
				this.stats = await getStats()
				this.currentEmotion = await this.latestEmotion()
				await this.loadAlbum()
				this.$nextTick(() => this.drawChart())
			},
			// 纪念册入口数据: 总张数、册数、封面缩略图
			async loadAlbum() {
				const cards = await listPhotoCards()
				const albums = groupByYear(cards)
				this.albumCardCount = cards.length
				this.albumCount = albums.length
				this.albumThumbs = [0, 1, 2].map(i => {
					const a = albums[i]
					return a && a.cover && a.cover.images && a.cover.images[0] ? a.cover.images[0] : ''
				})
			},
			goAlbum() {
				uni.navigateTo({ url: '/pages/archive/album' })
			},
			// 当前情绪状态: 今天最新一条带情绪的印记; 今天没有则无当前状态(圆点不显示)
			async latestEmotion() {
				const todayStr = today()
				const rows = await listMemories({ offset: 0, limit: 9999, noMedia: true })
				for (let i = rows.length - 1; i >= 0; i--) {
					if (rows[i].eventDate === todayStr && rows[i].emotion) return rows[i].emotion
				}
				return ''
			},
			// 柔和曲线:各情绪数量分布(暖橙面积 + 青绿描边 + 当前状态圆点)
			drawChart() {
				const data = this.chartData
				if (!data.length) return
				// #ifdef MP-WEIXIN
				// 小程序: canvas 2d node 方式
				const query = uni.createSelectorQuery().in(this)
				query.select('#emotionChart').fields({ node: true, size: true }).exec(res => {
					const canvas = res && res[0] && res[0].node
					// App 端拿不到原生 canvas, 由下方旧版接口分支处理
					if (!canvas || !canvas.getContext) return
					const dpr = uni.getSystemInfoSync().pixelRatio || 2
					const width = res[0].width
					const height = res[0].height
					canvas.width = width * dpr
					canvas.height = height * dpr
					const ctx = canvas.getContext('2d')
					ctx.scale(dpr, dpr)
					this.paintChart(ctx, width, height, data, false)
				})
				// #endif
				// #ifndef MP-WEIXIN
				// App/H5: type=2d 的 node 查询拿不到原生 canvas, 走兼容性最好的旧版 canvas 接口
				const ctx = uni.createCanvasContext('emotionChart', this)
				const query = uni.createSelectorQuery().in(this)
				query.select('#emotionChart').boundingClientRect()
				query.exec(res => {
					const rect = res && res[0]
					if (!rect || !rect.width) return
					this.paintChart(ctx, rect.width, rect.height, data, true)
				})
				// #endif
			},
			// 曲线绘制主体(两套 canvas 接口通用); legacy=true 为旧版接口: 颜色需 setXxx 方法, 结束需 draw() 提交
			paintChart(ctx, width, height, data, legacy) {
				const setFill = v => (legacy ? ctx.setFillStyle(v) : (ctx.fillStyle = v))
				const setStroke = v => (legacy ? ctx.setStrokeStyle(v) : (ctx.strokeStyle = v))
				const setLineWidth = v => (legacy ? ctx.setLineWidth(v) : (ctx.lineWidth = v))

				// 最大值兜底为 1: 全部情绪都是 0 时避免除零产生 NaN
				const max = Math.max(1, ...data.map(d => d.count))
				const padX = 10
				const padTop = 16
				const padBottom = 8
				const n = data.length
				const stepX = (width - padX * 2) / (n - 1 || 1)
				const chartH = height - padTop - padBottom
				const pts = data.map((d, i) => ({
					x: padX + stepX * i,
					y: padTop + chartH - (d.count / max) * chartH * 0.82
				}))

				// 平滑贝塞尔曲线绘制函数
				const traceCurve = () => {
					ctx.moveTo(pts[0].x, pts[0].y)
					for (let i = 1; i < pts.length; i++) {
						const cx = (pts[i - 1].x + pts[i].x) / 2
						ctx.bezierCurveTo(cx, pts[i - 1].y, cx, pts[i].y, pts[i].x, pts[i].y)
					}
				}

				// 面积填充
				const grad = ctx.createLinearGradient(0, padTop, 0, height)
				grad.addColorStop(0, 'rgba(240, 153, 90, 0.55)')
				grad.addColorStop(1, 'rgba(240, 153, 90, 0.02)')
				ctx.beginPath()
				traceCurve()
				ctx.lineTo(pts[pts.length - 1].x, height - padBottom)
				ctx.lineTo(pts[0].x, height - padBottom)
				ctx.closePath()
				setFill(grad)
				ctx.fill()

				// 曲线描边
				ctx.beginPath()
				traceCurve()
				setStroke('#4F8B8B')
				setLineWidth(3)
				ctx.stroke()

				// 当前状态圆点: 落在最近一次记录的情绪上, 没有当前状态则不显示
				const curIdx = data.findIndex(d => d.key === this.currentEmotion)
				const cur = curIdx > -1 ? pts[curIdx] : null
				if (cur) {
					ctx.beginPath()
					ctx.arc(cur.x, cur.y, 6, 0, Math.PI * 2)
					setFill('#FFFFFF')
					ctx.fill()
					setStroke('#E88B45')
					setLineWidth(3.5)
					ctx.stroke()
				}

				if (legacy) ctx.draw()
			},
			onNotify() {
				uni.showToast({ title: '这里安静而安全,没有打扰', icon: 'none' })
			},
			goCalendar() {
				uni.navigateTo({ url: '/pages/mine/calendar' })
			},
			go(url) {
				uni.navigateTo({ url })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.ar {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 200rpx;
	}
	/* 统计卡 */
	.ar-snapshot {
		margin: 32rpx $page-pad 0;
		background: linear-gradient(135deg, #5F9898 0%, #4A8282 100%);
		border-radius: 48rpx;
		padding: 40rpx 36rpx 44rpx;
		color: #FFFFFF;
		box-shadow: $shadow-primary;
	}
	.ar-snap-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.ar-snap-title {
		font-size: 34rpx;
		font-weight: 800;
	}
	.ar-snap-bar {
		width: 60rpx;
		height: 8rpx;
		border-radius: 6rpx;
		background: #F5B27E;
		margin-top: 14rpx;
	}
	.ar-snap-arrow {
		font-size: 40rpx;
		opacity: 0.85;
	}
	.ar-snap-grid {
		display: flex;
		margin-top: 40rpx;
	}
	.ar-snap-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 10rpx;
		&:not(:first-child) {
			border-left: 2rpx solid rgba(255, 255, 255, 0.25);
			padding-left: 20rpx;
		}
	}
	.ar-snap-label {
		font-size: $font-small;
		opacity: 0.88;
	}
	.ar-snap-value-row {
		display: flex;
		align-items: baseline;
		gap: 4rpx;
		white-space: nowrap;
	}
	.ar-snap-value {
		font-size: 54rpx;
		font-weight: 800;
		line-height: 1.1;
	}
	.ar-snap-unit {
		font-size: 22rpx;
		opacity: 0.88;
	}

	/* 情绪曲线 */
	.ar-chart {
		margin: 28rpx $page-pad 0;
		padding: 16rpx 8rpx 0;
	}
	.ar-chart-canvas {
		width: 100%;
		height: 300rpx;
	}
	.ar-chart-axis {
		display: flex;
		justify-content: space-around;
		padding: 8rpx 8rpx 0;
	}
	.ar-chart-axis-label {
		font-size: 28rpx;
		font-weight: 700;
		color: $ti-text-2;
	}

	/* 高光纪念册入口 */
	.ar-album {
		position: relative;
		display: flex;
		align-items: center;
		gap: 24rpx;
		margin: 36rpx $page-pad 0;
		background: $ti-card;
		border-radius: 40rpx;
		padding: 26rpx 28rpx;
		box-shadow: $shadow-card;
		overflow: hidden;
	}
	.ar-album::after {
		content: "";
		position: absolute;
		right: -60rpx;
		top: -60rpx;
		width: 200rpx;
		height: 200rpx;
		border-radius: 50%;
		background: $ti-accent-light;
		opacity: 0.55;
	}
	.ar-album-thumbs {
		position: relative;
		width: 124rpx;
		height: 140rpx;
		flex: 0 0 124rpx;
	}
	.ar-album-thumb {
		position: absolute;
		width: 88rpx;
		height: 112rpx;
		border-radius: 12rpx;
		border: 4rpx solid #FFFFFF;
		box-shadow: 0 6rpx 16rpx rgba(27, 59, 87, 0.2);
		box-sizing: border-box;
	}
	.ar-album-thumb:nth-child(1) {
		left: 0;
		top: 16rpx;
		transform: rotate(-9deg);
	}
	.ar-album-thumb:nth-child(2) {
		left: 22rpx;
		top: 8rpx;
		transform: rotate(4deg);
	}
	.ar-album-thumb:nth-child(3) {
		left: 44rpx;
		top: 18rpx;
		transform: rotate(11deg);
	}
	/* 空状态: 粉/绿/蓝三张彩色拍立得, 对应高保真插画 */
	.ar-album-thumb.blank:nth-child(1) {
		background: linear-gradient(160deg, #F8D8D0, #EAA9A0);
	}
	.ar-album-thumb.blank:nth-child(2) {
		background: linear-gradient(160deg, #D3E7D2, #93C29B);
	}
	.ar-album-thumb.blank:nth-child(3) {
		background: linear-gradient(160deg, #CCD9EA, #93AFCE);
	}
	.ar-album-info {
		flex: 1;
		min-width: 0;
		position: relative;
		z-index: 2;
	}
	.ar-album-title {
		display: block;
		font-size: 32rpx;
		font-weight: 800;
		color: $ti-navy;
		letter-spacing: 1rpx;
	}
	.ar-album-sub {
		display: block;
		margin-top: 8rpx;
		font-size: 22rpx;
		color: $ti-text-3;
	}
	.ar-album-meta {
		display: inline-block;
		margin-top: 14rpx;
		font-size: 20rpx;
		font-weight: 700;
		color: $ti-primary-deep;
		background: $ti-primary-mist;
		border-radius: 999rpx;
		padding: 6rpx 18rpx;
	}
	.ar-album-new {
		position: absolute;
		right: 24rpx;
		top: 22rpx;
		font-size: 18rpx;
		font-weight: 800;
		letter-spacing: 2rpx;
		color: #FFFFFF;
		background: $ti-accent;
		border-radius: 999rpx;
		padding: 4rpx 14rpx;
		z-index: 2;
	}
	.ar-album-arrow {
		position: relative;
		z-index: 2;
		font-size: 34rpx;
		color: $ti-primary;
		padding-right: 4rpx;
	}

	/* 功能入口 */
	.ar-entries {
		margin: 36rpx $page-pad 0;
		display: flex;
		flex-wrap: wrap;
		gap: 26rpx;
	}
	.ar-entry {
		position: relative;
		width: calc((100% - 26rpx) / 2);
		background: $ti-card;
		border-radius: 40rpx;
		padding: 30rpx 28rpx;
		box-shadow: $shadow-card;
		display: flex;
		align-items: center;
		gap: 22rpx;
		box-sizing: border-box;
	}
	.ar-entry-icon {
		width: 76rpx;
		height: 76rpx;
		border-radius: 24rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		image {
			width: 44rpx;
			height: 44rpx;
		}
	}
	.ar-entry-icon.teal {
		background: $ti-primary-light;
	}
	.ar-entry-icon.orange {
		background: $ti-accent-light;
	}
	.ar-entry-label {
		font-size: 29rpx;
		font-weight: 800;
		color: $ti-navy;
		white-space: nowrap;
	}
	.ar-entry-dot {
		position: absolute;
		top: 20rpx;
		right: 20rpx;
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
	}
	.ar-entry-dot.orange {
		background: #F0A96E;
	}
	.ar-entry-dot.blue {
		background: #8FB4C6;
	}
</style>
