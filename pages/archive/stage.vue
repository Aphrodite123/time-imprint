<template>
	<view class="st">
		<nav-bar title="" :back="true">
			<template #right></template>
		</nav-bar>

		<view class="st-head">
			<text class="st-title">人生阶段集</text>
			<text class="st-sub">按阶段回看你的故事</text>
		</view>

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
				:class="['st-card', i % 2 === 1 ? 'photo-card' : '']"
				@click="goDetail(m)"
				@longpress="onLongpress(m)"
			>
				<text class="st-card-date">{{ fmtCN(m.eventDate) }}</text>
				<text class="st-card-title">{{ m.title || '(未命名印记)' }}</text>
				<media-grid v-if="hasMedia(m)" :medias="m.medias" :max-images="1" class="st-card-media" />
				<view class="st-card-foot">
					<text v-if="emotionOf(m.emotion)" class="st-card-emo">{{ emotionOf(m.emotion).emoji }} {{ emotionOf(m.emotion).label }}</text>
					<text v-if="m.isHighlight" class="st-card-star">★</text>
				</view>
			</view>
		</view>
		<view v-else-if="!loading" class="st-empty">
			<empty-state :text="current ? `${current}还没有留下故事` : '还没有留下任何故事'" sub="创建印记后,会按人生阶段自动归组" />
		</view>
	</view>
</template>

<script>
	// 人生阶段集:按阶段自动分组查看(需求 2.5)
	import { listMemories, setHighlight, deleteMemory } from '../../utils/db'
	import { removeFile } from '../../utils/media'
	import { STAGES, emotionOf } from '../../utils/stage'
	import { fmtCN } from '../../utils/date'

	export default {
		data() {
			return {
				stages: STAGES,
				current: '',
				list: [],
				loading: false
			}
		},
		onShow() {
			this.load()
		},
		methods: {
			emotionOf,
			fmtCN,
			hasMedia(m) {
				return (m.medias || []).some(x => x.type === 'image')
			},
			setCurrent(label) {
				this.current = label
				this.load()
			},
			async load() {
				this.loading = true
				try {
					this.list = await listMemories({
						offset: 0,
						limit: 9999,
						stage: this.current || undefined,
						includeArchived: true
					})
				} finally {
					this.loading = false
				}
			},
			goDetail(m) {
				uni.navigateTo({ url: '/pages/memory/detail?id=' + m.memoryId })
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
		padding-bottom: 64rpx;
	}
	.st-head {
		padding: 4rpx $page-pad 0;
	}
	.st-title {
		display: block;
		font-size: 52rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.st-sub {
		display: block;
		margin-top: 10rpx;
		font-size: 26rpx;
		color: $ti-text-3;
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
		padding: 28rpx;
		box-sizing: border-box;
		box-shadow: $shadow-card;
		display: flex;
		flex-direction: column;
	}
	.st-card.photo-card {
		background: linear-gradient(160deg, #EAF3F1, #D7E8E5);
		box-shadow: none;
	}
	.st-card-date {
		font-size: 22rpx;
		font-weight: 600;
		color: $ti-text-3;
	}
	.st-card-title {
		margin-top: 10rpx;
		font-size: 28rpx;
		font-weight: 800;
		color: $ti-navy;
		line-height: 1.45;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}
	.st-card-media {
		margin-top: 18rpx;
	}
	.st-card-foot {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-top: 18rpx;
		min-height: 44rpx;
	}
	.st-card-emo {
		font-size: 22rpx;
		font-weight: 600;
		color: $ti-text-2;
	}
	.st-card-star {
		margin-left: auto;
		color: $ti-accent;
		font-size: 28rpx;
	}
	.st-empty {
		margin-top: 40rpx;
	}
</style>
