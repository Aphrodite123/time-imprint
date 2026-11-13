<template>
	<view class="cp">
		<!-- 顶部: 返回靠左 + 标题居中, 副标题居中, 更多工具移到标题下方 -->
		<nav-bar title="成长对比" subtitle="看看不同阶段的自己">
			<template #tools>
				<view class="nb-tools-group">
					<view class="nb-tool" @click="onMore">
						<image src="/static/icon-more.png" mode="aspectFit" />
					</view>
				</view>
			</template>
		</nav-bar>

		<template v-if="birth">
			<!-- 时间点选择 -->
			<view class="cp-picker-row">
				<picker mode="selector" :range="ageOptions" @change="e => setAge('first', e.detail.value)">
					<view class="cp-picker half-a">
						<view class="cp-picker-dot a"></view>
						<text class="cp-picker-text">{{ firstAge }}岁</text>
						<text class="cp-picker-arrow">▾</text>
					</view>
				</picker>
				<picker mode="selector" :range="ageOptions" @change="e => setAge('second', e.detail.value)">
					<view class="cp-picker half-b">
						<view class="cp-picker-dot b"></view>
						<text class="cp-picker-text">{{ secondAge }}岁</text>
						<text class="cp-picker-arrow">▾</text>
					</view>
				</picker>
			</view>

			<!-- 对比卡片 -->
			<view class="cp-compare">
				<view class="cp-divider">
					<view class="cp-divider-dot top"></view>
					<view class="cp-divider-dot bottom"></view>
				</view>
				<view class="cp-side">
					<view class="cp-card a">
						<text class="cp-card-age">{{ firstAge }}岁</text>
						<text class="cp-card-theme">{{ firstData.theme }}</text>
						<image v-if="firstData.photo" :src="firstData.photo" mode="aspectFill" class="cp-card-photo" @click="previewPhoto(firstData.photo)" />
						<view v-else class="cp-card-photo-blank">
							<text>🌱</text>
						</view>
						<text class="cp-card-emotion">{{ firstData.emotion }}</text>
					</view>
				</view>
				<view class="cp-side">
					<view class="cp-card b">
						<text class="cp-card-age">{{ secondAge }}岁</text>
						<text class="cp-card-theme">{{ secondData.theme }}</text>
						<image v-if="secondData.photo" :src="secondData.photo" mode="aspectFill" class="cp-card-photo" @click="previewPhoto(secondData.photo)" />
						<view v-else class="cp-card-photo-blank">
							<text>🌿</text>
						</view>
						<text class="cp-card-emotion">{{ secondData.emotion }}</text>
					</view>
				</view>
				<view class="cp-vs">VS</view>
			</view>

			<!-- 成长总结 -->
			<view class="cp-summary">
				<view class="cp-summary-icon">
					<text class="cp-summary-check">✓</text>
				</view>
				<textarea
					v-model="summary"
					class="cp-summary-input"
					placeholder="写下这段成长路上你的总结……"
					placeholder-class="cp-summary-placeholder"
					maxlength="500"
					auto-height
				/>
			</view>
			<view class="cp-summary-save ti-btn" @click="saveSummary">保存成长总结</view>

			<!-- 已保存的总结 -->
			<view v-if="history.length" class="cp-history">
				<view class="cp-history-title">已保存的成长总结</view>
				<view v-for="h in history" :key="h.comparisonId" class="cp-history-item">
					<text class="cp-history-range">{{ h.firstDate }} vs {{ h.secondDate }}</text>
					<text class="cp-history-text">{{ h.summary }}</text>
				</view>
			</view>
		</template>

		<view v-else class="cp-nobirth">
			<empty-state text="请先完善出生日期" sub="成长对比需要知道你的人生阶段">
				<template #action>
					<view class="ti-btn" @click="goProfile">去完善档案</view>
				</template>
			</empty-state>
		</view>

		<!-- 吸底 TabBar(按最新设计图, 成长对比页与档案馆同属一个标签流) -->
		<tab-bar current="archive" />
	</view>
</template>

<script>
	// 成长对比:双时间节点对比 + 成长总结(PRD 3.3.3)
	import { listMemoriesByRange, addComparison, listComparisons } from '../../utils/db'
	import { fmtDate } from '../../utils/date'
	import { emotionOf } from '../../utils/stage'
	import { store } from '../../store'

	const MAX_AGE = 100

	export default {
		data() {
			return {
				firstAge: 18,
				secondAge: 30,
				firstData: { theme: '...', photo: '', emotion: '—' },
				secondData: { theme: '...', photo: '', emotion: '—' },
				summary: '',
				history: []
			}
		},
		computed: {
			birth() {
				return store.user && store.user.birthDate
			},
			ageOptions() {
				const arr = []
				for (let i = 0; i <= MAX_AGE; i++) arr.push(i)
				return arr
			}
		},
		onLoad() {
			if (!this.birth) return
			const age = Math.min(this.myAge() || 18, MAX_AGE)
			this.firstAge = age
			this.secondAge = Math.max(age, 30)
			this.loadAll()
		},
		methods: {
			myAge() {
				if (!this.birth) return null
				const now = new Date()
				const b = new Date(this.birth.replace(/-/g, '/'))
				let age = now.getFullYear() - b.getFullYear()
				if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--
				return age
			},
			setAge(which, val) {
				const age = Number(val)
				if (which === 'first') this.firstAge = age
				else this.secondAge = age
				this.loadAll()
			},
			// 某一年龄对应的日期区间
			ageRange(age) {
				const b = new Date(this.birth.replace(/-/g, '/'))
				const s = new Date(b.getFullYear() + age, b.getMonth(), b.getDate())
				const e = new Date(b.getFullYear() + age + 1, b.getMonth(), b.getDate())
				e.setDate(e.getDate() - 1)
				return [fmtDate(s), fmtDate(e)]
			},
			async loadAll() {
				this.loadSide('first', this.firstAge)
				this.loadSide('second', this.secondAge)
				this.history = await listComparisons()
			},
			async loadSide(which, age) {
				const [s, e] = this.ageRange(age)
				const rows = await listMemoriesByRange(s, e)
				if (!rows.length) {
					this[which + 'Data'] = { theme: '这段时光还没有故事', photo: '', emotion: '—' }
					return
				}
				// 主题:优先高光记录标题,否则第一条记录标题
				const hl = rows.find(r => r.isHighlight) || rows[0]
				// 照片:第一条含图记录
				const withPhoto = rows.find(r => (r.medias || []).some(m => m.type === 'image'))
				// 情绪:出现最多
				const count = {}
				for (const r of rows) if (r.emotion) count[r.emotion] = (count[r.emotion] || 0) + 1
				const topKey = Object.keys(count).sort((a, b) => count[b] - count[a])[0]
				const emo = topKey ? emotionOf(topKey) : null
				this[which + 'Data'] = {
					theme: hl.title || hl.content.slice(0, 18) || '一段时光',
					photo: withPhoto ? withPhoto.medias.find(m => m.type === 'image').url : '',
					emotion: emo ? emo.label : '—'
				}
			},
			previewPhoto(url) {
				uni.previewImage({ urls: [url] })
			},
			async saveSummary() {
				if (!this.summary.trim()) return uni.showToast({ title: '请填写总结内容', icon: 'none' })
				await addComparison({
					firstDate: `${this.firstAge}岁`,
					secondDate: `${this.secondAge}岁`,
					summary: this.summary.trim()
				})
				this.history = await listComparisons()
				this.summary = ''
				uni.showToast({ title: '已保存', icon: 'success' })
			},
			goProfile() {
				uni.navigateTo({ url: '/pages/mine/profile' })
			},
			onMore() {
				uni.showActionSheet({
					itemList: ['重新选择阶段', '查看成长快照'],
					success: r => {
						if (r.tapIndex === 0) {
							this.firstAge = Math.max(this.firstAge - 10, 0)
							this.secondAge = Math.min(this.secondAge + 10, MAX_AGE)
							this.loadAll()
						} else {
							uni.reLaunch({ url: '/pages/archive/archive' })
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.cp {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 200rpx;
	}
	.cp-picker-row {
		display: flex;
		background: $ti-card;
		border-radius: 999rpx;
		padding: 12rpx;
		margin: 36rpx $page-pad 0;
		box-shadow: $shadow-card;
	}
	.cp-picker {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16rpx;
		padding: 24rpx 0;
		border-radius: 999rpx;
	}
	.cp-picker.half-a {
		background: #FFFFFF;
	}
	.cp-picker.half-b {
		background: #FBF4E4;
	}
	.cp-picker-dot {
		width: 22rpx;
		height: 22rpx;
		border-radius: 50%;
	}
	.cp-picker-dot.a {
		background: $ti-primary;
	}
	.cp-picker-dot.b {
		background: #BFDBD8;
	}
	.cp-picker-text {
		font-size: 32rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.cp-picker-arrow {
		font-size: 26rpx;
		color: $ti-text-3;
	}
	.cp-nobirth {
		margin-top: 60rpx;
	}

	/* 对比卡片区 */
	.cp-compare {
		position: relative;
		display: flex;
		gap: 24rpx;
		margin: 36rpx $page-pad 0;
	}
	.cp-divider {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 0;
		transform: translateX(-50%);
	}
	.cp-divider-dot {
		position: absolute;
		left: -9rpx;
		width: 18rpx;
		height: 18rpx;
		border-radius: 50%;
		background: #7FA3B8;
	}
	.cp-divider-dot.top {
		top: 20rpx;
	}
	.cp-divider-dot.bottom {
		bottom: 20rpx;
	}
	.cp-side {
		flex: 1;
	}
	.cp-card {
		height: 100%;
		border-radius: 48rpx;
		padding: 40rpx 28rpx 36rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		box-sizing: border-box;
	}
	.cp-card.a {
		background: linear-gradient(180deg, #DCE9F4 0%, #EAF1F7 100%);
	}
	.cp-card.b {
		background: linear-gradient(180deg, #619C9C 0%, #548E8E 100%);
		color: #FFFFFF;
		box-shadow: $shadow-card;
	}
	.cp-card-age {
		font-size: 48rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.cp-card.b .cp-card-age {
		color: #FFFFFF;
	}
	.cp-card-theme {
		margin-top: 14rpx;
		font-size: 26rpx;
		font-weight: 600;
		color: #5A6B7C;
		min-height: 76rpx;
		line-height: 1.5;
	}
	.cp-card.b .cp-card-theme {
		color: rgba(255, 255, 255, 0.9);
	}
	.cp-card-photo {
		width: 100%;
		height: 320rpx;
		border-radius: 36rpx;
		margin: 24rpx 0 12rpx;
	}
	.cp-card-photo-blank {
		width: 100%;
		height: 320rpx;
		border-radius: 36rpx;
		margin: 24rpx 0 12rpx;
		background: rgba(255, 255, 255, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 84rpx;
	}
	.cp-card.b .cp-card-photo-blank {
		background: rgba(255, 255, 255, 0.22);
	}
	.cp-card-emotion {
		margin-top: auto;
		font-size: 32rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.cp-card.b .cp-card-emotion {
		color: #FFFFFF;
	}
	.cp-vs {
		position: absolute;
		left: 50%;
		top: 44%;
		transform: translate(-50%, -50%);
		width: 92rpx;
		height: 92rpx;
		border-radius: 50%;
		background: $ti-navy;
		border: 8rpx solid $ti-bg;
		color: #FFFFFF;
		font-size: 28rpx;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		box-shadow: 0 8rpx 18rpx rgba(27, 59, 87, 0.3);
	}

	/* 成长总结 */
	.cp-summary {
		display: flex;
		align-items: center;
		gap: 28rpx;
		background: $ti-card;
		border-radius: 44rpx;
		padding: 32rpx;
		margin: 36rpx $page-pad 0;
		box-shadow: $shadow-card;
	}
	.cp-summary-icon {
		width: 88rpx;
		height: 88rpx;
		border-radius: 50%;
		background: linear-gradient(135deg, #F2A262, #EC9048);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		box-shadow: $shadow-accent;
	}
	.cp-summary-check {
		color: #FFFFFF;
		font-size: 40rpx;
		font-weight: 800;
	}
	.cp-summary-input {
		flex: 1;
		min-height: 110rpx;
		font-size: 28rpx;
		font-weight: 600;
		line-height: 1.75;
		color: $ti-navy;
	}
	.cp-summary-placeholder {
		color: $ti-text-3;
		font-weight: 400;
	}
	.cp-summary-save {
		margin: 32rpx $page-pad 0;
	}
	.cp-history {
		margin: 44rpx $page-pad 0;
	}
	.cp-history-title {
		font-size: 34rpx;
		font-weight: 800;
		color: $ti-navy;
		margin-bottom: 24rpx;
	}
	.cp-history-item {
		background: $ti-card;
		border-radius: 40rpx;
		padding: 28rpx 32rpx;
		margin-bottom: 24rpx;
		box-shadow: $shadow-card;
	}
	.cp-history-range {
		font-size: $font-small;
		font-weight: 700;
		color: $ti-accent;
	}
	.cp-history-text {
		display: block;
		margin-top: 12rpx;
		font-size: $font-body;
		color: $ti-text-2;
		line-height: 1.7;
	}
</style>
