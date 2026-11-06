<template>
	<view class="ar">
		<!-- 顶部 -->
		<view class="ar-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="ar-nav-row">
				<text class="ar-back" @click="goMine">←</text>
				<image class="ar-bell" src="/static/icon-bell.png" @click="onNotify" />
			</view>
		</view>

		<view class="ar-head">
			<text class="ar-title">成长档案馆</text>
			<text class="ar-sub">看见自己的变化</text>
		</view>

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
			<canvas id="emotionChart" type="2d" class="ar-chart-canvas"></canvas>
			<view class="ar-chart-axis">
				<text v-for="d in chartData" :key="d.key" class="ar-chart-axis-label">{{ d.label }}</text>
			</view>
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
	import { getStats } from '../../utils/db'
	import { EMOTIONS } from '../../utils/stage'

	export default {
		data() {
			return {
				statusBarHeight: 20,
				stats: { total: 0, images: 0, voices: 0, emotions: {} }
			}
		},
		computed: {
			emotionCount() {
				return Object.values(this.stats.emotions).reduce((s, n) => s + n, 0)
			},
			chartData() {
				// 有记录的情绪才参与图表
				return EMOTIONS.filter(e => this.stats.emotions[e.key]).map(e => ({
					key: e.key,
					label: e.label,
					count: this.stats.emotions[e.key] || 0
				}))
			}
		},
		onLoad() {
			const sys = uni.getSystemInfoSync()
			this.statusBarHeight = sys.statusBarHeight || 20
		},
		onShow() {
			this.load()
		},
		methods: {
			async load() {
				this.stats = await getStats()
				this.$nextTick(() => this.drawChart())
			},
			// 柔和曲线:各情绪数量分布(暖橙面积 + 青绿描边 + 峰值圆点)
			drawChart() {
				const data = this.chartData
				if (!data.length) return
				const query = uni.createSelectorQuery().in(this)
				query.select('#emotionChart').fields({ node: true, size: true }).exec(res => {
					if (!res[0]) return
					const canvas = res[0].node
					const dpr = uni.getSystemInfoSync().pixelRatio || 2
					const width = res[0].width
					const height = res[0].height
					canvas.width = width * dpr
					canvas.height = height * dpr
					const ctx = canvas.getContext('2d')
					ctx.scale(dpr, dpr)

					const max = Math.max(...data.map(d => d.count))
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
					ctx.fillStyle = grad
					ctx.fill()

					// 曲线描边
					ctx.beginPath()
					traceCurve()
					ctx.strokeStyle = '#4F8B8B'
					ctx.lineWidth = 3
					ctx.stroke()

					// 峰值点
					const peak = pts.reduce((a, b) => (b.y < a.y ? b : a), pts[0])
					ctx.beginPath()
					ctx.arc(peak.x, peak.y, 6, 0, Math.PI * 2)
					ctx.fillStyle = '#FFFFFF'
					ctx.fill()
					ctx.strokeStyle = '#E88B45'
					ctx.lineWidth = 3.5
					ctx.stroke()
				})
			},
			onNotify() {
				uni.showToast({ title: '这里安静而安全,没有打扰', icon: 'none' })
			},
			goMine() {
				uni.reLaunch({ url: '/pages/mine/mine' })
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
		padding-bottom: 260rpx;
	}
	.ar-nav {
		background: $ti-bg;
	}
	.ar-nav-row {
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 $page-pad;
	}
	.ar-back {
		font-size: 44rpx;
		font-weight: 700;
		color: #1B1B1B;
		padding: 0 8rpx;
	}
	.ar-bell {
		width: 44rpx;
		height: 44rpx;
	}
	.ar-head {
		padding: 8rpx $page-pad 0;
	}
	.ar-title {
		display: block;
		font-size: 52rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.ar-sub {
		display: block;
		margin-top: 10rpx;
		font-size: 26rpx;
		color: $ti-text-3;
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
