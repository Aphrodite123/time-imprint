<template>
	<view class="mn">
		<!-- 顶部标题 + 设置入口 -->
		<view class="mn-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
			<text class="mn-title">我的</text>
			<image class="mn-gear" src="/static/icon-settings.png" @click="goSettings" />
		</view>

		<!-- 个人资料卡 -->
		<view class="mn-profile" @click="goProfile">
			<view class="mn-profile-top">
				<image class="mn-avatar" :src="avatarUrl" mode="aspectFill" />
				<view class="mn-profile-info">
					<view class="mn-name-row">
						<text class="mn-nickname">{{ nickname }}</text>
						<text v-if="myAge !== null" class="mn-age-pill">{{ myAge }}岁</text>
					</view>
					<text class="mn-sign">{{ signature }}</text>
					<text class="mn-edit">编辑资料 ›</text>
				</view>
			</view>
			<!-- 数据统计 -->
			<view class="mn-stats">
				<view class="mn-stat">
					<text class="mn-stat-num teal">{{ stats.total }}</text>
					<text class="mn-stat-label">印记</text>
				</view>
				<view class="mn-stat-divider"></view>
				<view class="mn-stat">
					<text class="mn-stat-num teal">{{ stats.images }}</text>
					<text class="mn-stat-label">照片</text>
				</view>
				<view class="mn-stat-divider"></view>
				<view class="mn-stat">
					<text class="mn-stat-num orange">{{ streak }}</text>
					<text class="mn-stat-label">连续记录天数</text>
				</view>
			</view>
		</view>

		<!-- 功能列表 -->
		<view class="mn-card">
			<view v-for="item in menus" :key="item.key" class="mn-item" @click="go(item.url)">
				<view :class="['mn-item-icon', item.tone]">
					<image :src="item.icon" mode="aspectFit" />
				</view>
				<text class="mn-item-label">{{ item.label }}</text>
				<text v-if="item.val" class="mn-item-val">{{ item.val }}</text>
				<text class="mn-item-arrow">›</text>
			</view>
		</view>

		<!-- 关于 -->
		<view class="mn-card">
			<view class="mn-item" @click="go('/pages/mine/privacy')">
				<view class="mn-item-icon teal">
					<image src="/static/menus/privacy.png" mode="aspectFit" />
				</view>
				<text class="mn-item-label">隐私设置</text>
				<text class="mn-item-arrow">›</text>
			</view>
			<view class="mn-item" @click="go('/pages/mine/about')">
				<view class="mn-item-icon teal">
					<image src="/static/menus/about.png" mode="aspectFit" />
				</view>
				<text class="mn-item-label">关于时光印记</text>
				<text class="mn-item-arrow">›</text>
			</view>
			<view class="mn-item" @click="onRate">
				<view class="mn-item-icon orange">
					<image src="/static/menus/rate.png" mode="aspectFit" />
				</view>
				<text class="mn-item-label">给时光印记评个分</text>
				<text class="mn-item-val">⭐⭐⭐⭐⭐</text>
			</view>
		</view>

		<tab-bar current="mine" />
	</view>
</template>

<script>
	// 我的:个人档案 / 数据统计 / 功能入口(需求 2.6)
	import { calcAge } from '../../utils/date'
	import { myStage } from '../../utils/stage'
	import { getStats, listMemories } from '../../utils/db'
	import { store, loadUser } from '../../store'

	export default {
		data() {
			return {
				statusBarHeight: 20,
				stats: { total: 0, images: 0, voices: 0 },
				streak: 0,
				menus: [
					{ key: 'capsule', label: '我的时光胶囊', icon: '/static/menus/capsule.png', tone: 'teal', val: '回看', url: '/pages/mine/calendar' },
					{ key: 'backup', label: '数据备份与导出', icon: '/static/menus/backup.png', tone: 'orange', val: '', url: '/pages/mine/backup' },
					{ key: 'export', label: '导出回忆录', icon: '/static/menus/export.png', tone: 'teal', val: '', url: '/pages/mine/export' },
					{ key: 'settings', label: '记录提醒与偏好', icon: '/static/menus/reminder.png', tone: 'teal', val: '', url: '/pages/mine/settings' }
				]
			}
		},
		computed: {
			user() {
				return store.user || {}
			},
			avatarUrl() {
				return this.user.avatar || '/static/logo.png'
			},
			nickname() {
				return this.user.nickname || '未设置昵称'
			},
			myAge() {
				return this.user.birthDate ? calcAge(this.user.birthDate) : null
			},
			signature() {
				if (!this.user.birthDate) return '补填生日,开启你的人生刻度 ✨'
				const s = myStage(this.user.birthDate)
				const names = {
					infant: '婴儿时期', child: '幼年', childhood: '童年', teen: '少年',
					youth: '青年奋斗', middle: '中年岁月', elder: '暮年时光', future: '未来计划'
				}
				return (this.user.status || '今天也值得被记住') + (s ? ` · ${names[s.key] || s.label}` : '')
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
				if (!store.ready) await loadUser()
				this.stats = await getStats()
				this.streak = await this.calcStreak()
			},
			// 连续记录天数:从今天(或昨天)往前数,每天至少一条印记
			async calcStreak() {
				const rows = await listMemories({ offset: 0, limit: 9999, noMedia: true })
				const days = new Set()
				for (const r of rows) if (r.eventDate) days.add(r.eventDate)
				if (!days.size) return 0
				const ONE = 24 * 3600 * 1000
				const fmt = ts => {
					const d = new Date(ts)
					const p = n => (n < 10 ? '0' + n : '' + n)
					return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
				}
				let cur = Date.now()
				// 今天没记也不断签,从昨天起算
				if (!days.has(fmt(cur))) cur -= ONE
				let n = 0
				while (days.has(fmt(cur))) {
					n++
					cur -= ONE
				}
				return n
			},
			go(url) {
				uni.navigateTo({ url })
			},
			goProfile() {
				uni.navigateTo({ url: '/pages/mine/profile' })
			},
			goSettings() {
				uni.navigateTo({ url: '/pages/mine/settings' })
			},
			onRate() {
				uni.showToast({ title: '谢谢你的喜爱,这是我们最大的动力 ❤', icon: 'none' })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.mn {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 260rpx;
	}
	.mn-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16rpx $page-pad 0;
	}
	.mn-title {
		font-size: 52rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.mn-gear {
		width: 48rpx;
		height: 48rpx;
	}

	/* 资料卡 */
	.mn-profile {
		margin: 32rpx $page-pad 0;
		background: $ti-card;
		border-radius: 48rpx;
		padding: 40rpx 36rpx;
		box-shadow: $shadow-card;
	}
	.mn-profile-top {
		display: flex;
		align-items: center;
		gap: 30rpx;
	}
	.mn-avatar {
		width: 128rpx;
		height: 128rpx;
		border-radius: 50%;
		background: $ti-accent-light;
		flex-shrink: 0;
	}
	.mn-profile-info {
		flex: 1;
		min-width: 0;
	}
	.mn-name-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}
	.mn-nickname {
		font-size: 40rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.mn-age-pill {
		font-size: $font-small;
		font-weight: 700;
		color: #B4692E;
		background: $ti-accent-light;
		border-radius: 20rpx;
		padding: 6rpx 20rpx;
	}
	.mn-sign {
		display: block;
		margin-top: 12rpx;
		font-size: 24rpx;
		color: $ti-text-3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mn-edit {
		display: block;
		margin-top: 10rpx;
		font-size: 24rpx;
		font-weight: 700;
		color: $ti-primary;
	}

	/* 数据统计 */
	.mn-stats {
		display: flex;
		align-items: center;
		margin-top: 36rpx;
		background: $ti-bg;
		border-radius: 36rpx;
		padding: 28rpx 0;
	}
	.mn-stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
	}
	.mn-stat-num {
		font-size: 44rpx;
		font-weight: 800;
		line-height: 1.1;
	}
	.mn-stat-num.teal {
		color: $ti-primary-deep;
	}
	.mn-stat-num.orange {
		color: $ti-accent-deep;
	}
	.mn-stat-label {
		font-size: 22rpx;
		color: $ti-text-3;
	}
	.mn-stat-divider {
		width: 2rpx;
		height: 56rpx;
		background: #E8E0CE;
	}

	/* 功能卡片 */
	.mn-card {
		margin: 28rpx $page-pad 0;
		background: $ti-card;
		border-radius: 44rpx;
		padding: 8rpx 36rpx;
		box-shadow: $shadow-card;
	}
	.mn-item {
		display: flex;
		align-items: center;
		gap: 26rpx;
		padding: 30rpx 0;
		border-bottom: 2rpx solid $ti-bg;

		&:last-child {
			border-bottom: none;
		}
	}
	.mn-item-icon {
		width: 76rpx;
		height: 76rpx;
		border-radius: 24rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		image {
			width: 40rpx;
			height: 40rpx;
		}
	}
	.mn-item-icon.teal {
		background: $ti-primary-light;
	}
	.mn-item-icon.orange {
		background: $ti-accent-light;
	}
	.mn-item-label {
		flex: 1;
		font-size: 30rpx;
		font-weight: 700;
		color: $ti-navy;
	}
	.mn-item-val {
		font-size: 24rpx;
		color: $ti-text-3;
	}
	.mn-item-arrow {
		font-size: 36rpx;
		color: #C9CEC9;
	}
</style>
