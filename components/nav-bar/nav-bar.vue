<template>
	<view class="nb-wrap">
		<!-- 固定导航栏: 不随页面滚动, 始终吸顶 -->
		<view class="nb" :style="{ paddingTop: statusBarHeight + 'px' }">
			<!-- 标题行: 返回键固定靠左, 标题绝对居中(不受返回键/工具宽度影响);
			     小程序端行高按胶囊实时计算(行中心=胶囊中心, 标题与胶囊同行垂直居中);
			     工具放得下时与标题/胶囊同行, 放不下时自动移到标题下方 -->
			<view class="nb-row" :style="{ height: rowHeight + 'px' }">
				<view v-if="back" class="nb-side" @click="onBack">
					<image class="nb-back" src="/static/icon-back.png" mode="aspectFit" />
				</view>
				<text class="nb-title">{{ title }}</text>
				<!-- 工具与标题同行: 右缘避让小程序胶囊, 垂直在行内居中(行心=胶囊心) -->
				<view v-if="hasTools && !toolsBelow" class="nb-tools-inline" :style="toolsInlineStyle">
					<slot name="tools"></slot>
				</view>
			</view>
			<!-- 副标题: 标题下方居中 -->
			<text v-if="subtitle" class="nb-sub">{{ subtitle }}</text>
			<!-- 工具行: 同一行放不下时移到标题下方(避让小程序右上角胶囊) -->
			<view v-if="hasTools && toolsBelow" class="nb-tools-below">
				<slot name="tools"></slot>
			</view>
			<!-- 标题下橙色短划线点缀(详情页样式), 居中 -->
			<view v-if="accent" class="nb-accent"></view>
		</view>
		<!-- 文档流占位: 高度与固定导航栏一致, 页面内容自然排在导航栏下方 -->
		<view class="nb-placeholder" :style="{ height: barHeight + 'px' }"></view>
	</view>
</template>

<script>
	import { getNavMetrics } from '../../utils/nav'

	// 各页面工具行布局缓存(应用级, 页面间切换不丢失):
	// 首次测量后按路由缓存, 再次挂载时同步取值, 保证切页首帧高度正确、不弹跳
	const toolsBelowCache = {}

	// 自定义导航栏: 标题居中 + 返回靠左 + 副标题 + 自适应工具行(按最新 UI 设计图头部规范)
	// 工具布局策略: 先测量标题与工具宽度, 与胶囊能同行放下则同行垂直居中; 放不下才移到标题下方
	// 注意: 插槽内容请用 .nb-tools-group 包一层(全局样式), 保证小程序端多工具横向排列
	export default {
		name: 'nav-bar',
		props: {
			title: { type: String, default: '' },
			subtitle: { type: String, default: '' }, // 标题下方居中的灰色副标题
			back: { type: Boolean, default: true },
			accent: { type: Boolean, default: false } // 标题下橙色短划线点缀(详情页样式)
		},
		data() {
			// 同步初始化全部度量(系统 API 同步可用): 首帧即为真实高度, 不等异步测量
			const nav = getNavMetrics()
			const rowHeight = nav.rightInset > 0 && nav.capsuleHeight > 0
				? (nav.capsuleTop - nav.statusBarHeight) * 2 + nav.capsuleHeight
				: uni.upx2px(96)
			const route = (getCurrentPages().slice(-1)[0] || {}).route || ''
			return {
				statusBarHeight: nav.statusBarHeight,
				navInset: nav.rightInset, // 右侧胶囊避让宽度(px), App/H5 为 0
				rowHeight,
				route,
				toolsBelow: !!toolsBelowCache[route], // true: 工具移到标题下方; 首次访问默认同行, 测量后缓存
				barHeight: 0 // 导航栏高度(px), 文档流占位用, created 里同步赋值
			}
		},
		computed: {
			hasTools() {
				return !!(this.$slots && this.$slots.tools)
			},
			// 占位高度: 全部由同步度量推导(状态栏 + 标题行 + 副标题/工具行/点缀), created 里赋初值
			barEstimate() {
				let h = this.statusBarHeight + this.rowHeight
				if (this.subtitle) h += uni.upx2px(40)
				if (this.hasTools && this.toolsBelow) h += uni.upx2px(90)
				if (this.accent) h += uni.upx2px(14)
				return h
			},
			toolsInlineStyle() {
				// 右缘: 小程序端贴胶囊左侧再留 4px, App/H5 端保持页面边距; 垂直在行内居中(行心=胶囊心)
				return {
					right: (this.navInset > 0 ? this.navInset + 4 : uni.upx2px(32)) + 'px',
					top: '50%',
					transform: 'translateY(-50%)'
				}
			}
		},
		created() {
			// 首帧渲染前同步确定占位高度, 切换页面不再弹跳
			this.barHeight = this.barEstimate
		},
		watch: {
			// 动态标题(如个人档案页)变化后复测
			title() {
				this.$nextTick(() => {
					this.decideToolsLayout()
					this.measureHeight()
				})
			},
			// 副标题/工具换行/点缀变化都会影响总高度
			subtitle() {
				this.measureHeight()
			},
			toolsBelow() {
				toolsBelowCache[this.route] = this.toolsBelow
				this.measureHeight()
			},
			// 导航栏实际高度变化时通知页面(如首页需要把后续模块固定在导航栏下方)
			barHeight(h) {
				this.$emit('height', h)
			}
		},
		mounted() {
			this.$nextTick(() => {
				this.decideToolsLayout()
				this.measureHeight()
			})
			// 异步工具内容(如首页年份筛选)出现后复测一次
			setTimeout(() => {
				this.decideToolsLayout()
				this.measureHeight()
			}, 800)
		},
		methods: {
			onBack() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack()
				} else {
					// 无上级页面时(如分享/推送直达)回落到首页
					uni.reLaunch({ url: '/pages/index/index' })
				}
			},
			// 实测固定导航栏高度, 驱动占位高度(避免内容被导航栏遮挡)
			measureHeight() {
				const query = uni.createSelectorQuery().in(this)
				query.select('.nb').boundingClientRect()
				query.exec(res => {
					const rect = res && res[0]
					if (rect && rect.height) this.barHeight = rect.height
				})
			},
			// 判断工具与标题能否在同一行放下(小程序端需避让右上角胶囊); 放不下则移到标题下方
			decideToolsLayout() {
				if (!this.hasTools) return
				const query = uni.createSelectorQuery().in(this)
				query.select('.nb-title').boundingClientRect()
				query.select('.nb-tools-inline').boundingClientRect()
				query.exec(res => {
					const titleRect = res && res[0]
					const toolsRect = res && res[1]
					// 测量失败时默认与胶囊同行
					if (!titleRect || !toolsRect || !toolsRect.width) return
					const W = uni.getSystemInfoSync().windowWidth
					const rightOffset = this.navInset > 0 ? this.navInset + 4 : uni.upx2px(32)
					const toolsLeft = W - rightOffset - toolsRect.width
					const titleRight = W / 2 + titleRect.width / 2
					// 与标题间距不足 12px 视为放不下
					this.toolsBelow = toolsLeft - titleRight < 12
					toolsBelowCache[this.route] = this.toolsBelow
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.nb-wrap {
		width: 100%;
	}
	/* 固定吸顶: 不随页面滚动, 背景不透明遮住滚过的内容; 层级低于弹层(999) */
	.nb {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 900;
		background: $ti-bg;
	}
	.nb-placeholder {
		width: 100%;
	}
	.nb-row {
		position: relative;
	}
	.nb-side {
		position: absolute;
		left: $page-pad;
		top: 50%;
		transform: translateY(-50%);
		width: 72rpx;
		height: 72rpx;
		display: flex;
		align-items: center;
	}
	.nb-back {
		width: 44rpx;
		height: 44rpx;
	}
	.nb-title {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		font-size: 38rpx;
		font-weight: 800;
		color: $ti-navy;
		white-space: nowrap;
	}
	.nb-tools-inline {
		position: absolute;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 24rpx;
	}
	.nb-sub {
		display: block;
		text-align: center;
		font-size: 26rpx;
		color: $ti-text-3;
		padding: 4rpx $page-pad 0;
	}
	.nb-tools-below {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-end;
		gap: 24rpx;
		min-height: 84rpx;
		padding: 6rpx $page-pad 0;
		box-sizing: border-box;
	}
	.nb-accent {
		width: 72rpx;
		height: 10rpx;
		border-radius: 6rpx;
		background: $ti-accent;
		margin: 4rpx auto 0;
	}
</style>
