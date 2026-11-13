<template>
	<view class="cl">
		<!-- 月历 -->
		<view class="ti-card cl-card">
			<view class="cl-head">
				<view class="cl-arrow" @click="changeMonth(-1)">‹</view>
				<text class="cl-month">{{ year }}年{{ month }}月</text>
				<view class="cl-arrow" @click="changeMonth(1)">›</view>
			</view>
			<view class="cl-week">
				<text v-for="w in weeks" :key="w" class="cl-week-label">{{ w }}</text>
			</view>
			<view class="cl-grid">
				<view v-for="(d, i) in cells" :key="i" class="cl-cell">
					<view v-if="d" :class="['cl-day', isMarked(d) ? 'marked' : '', isSelected(d) ? 'selected' : '']" @click="selectDay(d)">
						{{ d }}
						<view v-if="isMarked(d)" class="cl-dot"></view>
					</view>
				</view>
			</view>
		</view>

		<!-- 当日记录 -->
		<view class="cl-day-list" v-if="dayMemories.length">
			<view class="cl-day-title">{{ selectedCN }} 的印记</view>
			<view v-for="m in dayMemories" :key="m.memoryId" class="cl-day-item">
				<memory-card :memory="m" @click="goDetail" />
			</view>
		</view>
		<view v-else-if="selected" class="cl-day-empty">
			<text class="cl-day-empty-text">这一天还没有留下故事</text>
		</view>
	</view>
</template>

<script>
	// 日历回看:按日期回看记忆(P2)
	import { listMemories, listMemoriesByRange } from '../../utils/db'
	import { monthMatrix, fmtCN, fmtDate, today } from '../../utils/date'

	export default {
		data() {
			const now = new Date()
			return {
				weeks: ['一', '二', '三', '四', '五', '六', '日'],
				year: now.getFullYear(),
				month: now.getMonth() + 1,
				cells: [],
				markSet: {}, // 'YYYY-MM-DD' -> true
				selected: today(), // 进入页面默认选中当天
				dayMemories: []
			}
		},
		computed: {
			selectedCN() {
				return this.selected ? fmtCN(this.selected) : ''
			}
		},
		onShow() {
			this.loadMarks()
			this.loadSelected()
		},
		methods: {
			async loadMarks() {
				const all = await listMemories({ offset: 0, limit: 9999, noMedia: true })
				const set = {}
				for (const m of all) if (m.eventDate) set[m.eventDate] = true
				this.markSet = set
				this.renderMonth()
			},
			renderMonth() {
				this.cells = monthMatrix(this.year, this.month)
			},
			changeMonth(delta) {
				let m = this.month + delta
				let y = this.year
				if (m < 1) { m = 12; y-- }
				if (m > 12) { m = 1; y++ }
				this.year = y
				this.month = m
				this.renderMonth()
			},
			dayStr(d) {
				return fmtDate(new Date(this.year, this.month - 1, d))
			},
			isMarked(d) {
				return !!this.markSet[this.dayStr(d)]
			},
			isSelected(d) {
				return this.selected === this.dayStr(d)
			},
			async selectDay(d) {
				this.selected = this.dayStr(d)
				await this.loadSelected()
			},
			// 当日全部记录(含归档),带媒体供卡片展示
			async loadSelected() {
				if (!this.selected) return
				this.dayMemories = await listMemoriesByRange(this.selected, this.selected)
			},
			goDetail(m) {
				uni.navigateTo({ url: '/pages/memory/detail?id=' + m.memoryId })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.cl {
		min-height: 100vh;
		background: $ti-bg;
		padding: 24rpx $page-pad 60rpx;
		box-sizing: border-box;
	}
	.cl-card {
		padding: 24rpx 16rpx;
	}
	.cl-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16rpx;
	}
	.cl-arrow {
		width: 64rpx;
		height: 64rpx;
		line-height: 64rpx;
		text-align: center;
		font-size: 48rpx;
		color: $ti-text-2;
	}
	.cl-month {
		font-size: $font-sub;
		font-weight: 500;
		color: $ti-text;
	}
	.cl-week {
		display: flex;
		margin-top: 24rpx;
	}
	.cl-week-label {
		flex: 1;
		text-align: center;
		font-size: $font-small;
		color: $ti-text-3;
	}
	.cl-grid {
		display: flex;
		flex-wrap: wrap;
		margin-top: 8rpx;
	}
	.cl-cell {
		width: calc(100% / 7);
		display: flex;
		justify-content: center;
		padding: 8rpx 0;
	}
	.cl-day {
		position: relative;
		width: 72rpx;
		height: 72rpx;
		line-height: 72rpx;
		text-align: center;
		font-size: $font-body;
		color: $ti-text;
		border-radius: 50%;

		&.marked {
			background: $ti-primary-light;
			color: $ti-primary;
			font-weight: 500;
		}
		&.selected {
			background: $ti-primary;
			color: #FFFFFF;
		}
	}
	.cl-dot {
		position: absolute;
		bottom: 2rpx;
		left: 50%;
		transform: translateX(-50%);
		width: 10rpx;
		height: 10rpx;
		border-radius: 50%;
		background: $ti-accent;
	}
	.cl-day-list {
		margin-top: 32rpx;
	}
	.cl-day-title {
		font-size: $font-sub;
		font-weight: 500;
		color: $ti-text;
		margin-bottom: 20rpx;
	}
	.cl-day-item {
		margin-bottom: 20rpx;
	}
	.cl-day-empty {
		margin-top: 40rpx;
		text-align: center;
	}
	.cl-day-empty-text {
		font-size: $font-body;
		color: $ti-text-3;
	}
</style>
