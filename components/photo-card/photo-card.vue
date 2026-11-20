<template>
		<view :class="['pc', 'tpl-' + tpl, size === 'cover' ? 'pc-cover' : '']" :style="pcStyle">
			<view
				class="pc-frame"
				@touchstart.capture="onFrameTouch"
				@touchmove.capture="onFrameTouchMove"
				@touchend.capture="onFrameTouchEnd"
				@touchcancel.capture="onFrameTouchEnd"
			>
			<!-- 胶片齿孔 -->
			<view v-if="tpl === 'film'" class="pc-perf top"></view>
			<view v-if="tpl === 'film'" class="pc-perf bottom"></view>

			<!-- 照片区: 点选照片显示虚线框, 拖动换位/拖边框缩放 -->
			<view class="pc-photos">
				<!-- 相框内衬: 白边厚度跟随已保存的排版 -->
				<view class="pc-inner" :style="innerStyle">
					<view class="pc-canvas">
						<view
							v-for="(r, i) in rects"
							:key="i"
							:class="['pc-cell', editable && selIndex === i ? 'sel' : '']"
							:style="styleOf(r)"
						>
							<image v-if="images[i]" :src="images[i]" mode="aspectFill" class="pc-img" />
						</view>
					</view>

					<!-- 编辑模式: 只有选中的照片显示虚线框(纯视觉), 手势统一由卡片层处理 -->
					<view v-if="editable" class="pc-edit">
						<view
							v-for="(r, i) in rects"
							:key="'h' + i"
							:class="['pc-hit', selIndex === i ? 'on' : '', swapTarget === i ? 'tgt' : '', mode === 'resize' && selIndex === i ? 'rz' : '']"
							:style="hitStyle(r, i)"
						>
							<text class="pc-hit-n">{{ i + 1 }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 落款区占位: 保证照片不会铺到文字下方 -->
			<view v-if="size !== 'cover'" class="pc-space" :style="{ height: space + '%' }"></view>

			<!-- 落款: 标题 / 内容 / 星级 / 日期, 位置可在微调模式拖动 -->
			<block v-if="size !== 'cover'">
				<view class="pc-el pc-title" :style="elStyle('title')">{{ title || '一段闪闪发光的日子' }}</view>
				<view v-if="caption" class="pc-el pc-caption" :style="elStyle('caption')">{{ caption }}</view>
				<view class="pc-el pc-stars" :style="elStyle('stars')">
					<text v-for="i in maxLevel" :key="i" :class="['pc-star', i <= level ? 'on' : '']">★</text>
				</view>
				<view v-if="eventDate" class="pc-el pc-stamp" :style="elStyle('date')">
					<text class="pc-stamp-y">{{ yearText }}</text>
					<text class="pc-stamp-d">{{ mdText }}</text>
				</view>
			</block>
		</view>
	</view>
</template>

<script>
	// 纪念照卡片: 由 1~9 张照片 + 装帧模板 + 落款组成, 4:5 竖版
	// 照片以百分比矩形自由排版: 默认来自版式网格, 编辑模式拖动换位/拖边框缩放
	import {
		cardLevel, textPos, spaceOf, photoRectsOf, clampRect, frameOf, MAX_HL_LEVEL
	} from '../../utils/album'

	// 照片之间的缝隙(每个矩形每边收缩的百分比)
	const GAP = 0.28

	function clamp(v, min, max) {
		return Math.max(min, Math.min(max, v))
	}

	export default {
		name: 'photo-card',
		props: {
			card: { type: Object, default: () => ({}) },
			// cover: 只显示照片与装帧(册子封面/模板缩略图); 默认完整卡片
			size: { type: String, default: 'full' },
			// 编辑模式: 逐张照片可拖动/缩放, 变更后抛出 rects
			editable: { type: Boolean, default: false },
			// 卡片渲染宽度(设计基准 600rpx): 内部文字/装饰尺寸按此等比缩放
			w: { type: String, default: '600rpx' }
		},
		data() {
			return {
				waveBars: [14, 26, 40, 26, 14], // 声波切图的柱高
				// 照片编辑状态: selIndex = 选中的照片(-1 未选)
				// mode = move 长按激活的拖动换位 | resize 边框缩放 | '' 未激活
				photosRect: null,
				photosRectSpace: null, // 量取 photosRect 时的留白值(留白变化后按比例换算)
				cardRect: null, // 卡片矩形(不随留白变化, 用于换算)
				selIndex: -1,
				swapTarget: -1, // 拖动中压到的照片, 松手换位
				rzEdges: null, // 触点命中的边框 {l, r, t, b}
				pressTimer: null,
				mode: '',
				startX: 0,
				startY: 0,
				startRects: [],
				gestAbs: null, // 按下时各照片的绝对像素矩形(px), 留白变化时用于保持其他照片不动
				gestH: 0, // 按下时照片区的像素高度
				startSpace: 0 // 拖动开始时的底部留白(底边越界时压缩)
			}
		},
		computed: {
			tpl() {
				return this.card.template || 'polaroid'
			},
			images() {
				return (this.card.images || []).filter(Boolean)
			},
			count() {
				return Math.max(1, this.images.length)
			},
			// 每张照片的矩形: 用户自定义优先, 否则按版式网格
			rects() {
				return photoRectsOf(this.count, this.card.layout, this.card.meta)
			},
			// 底部留白高度(%): 装帧默认值或用户拖动后的值
			space() {
				return spaceOf(this.tpl, this.card.meta)
			},
			// 相框白边厚度(%): 默认 0 或用户拖动后的值, 负值为吃掉装帧基础留白(贴边)
			frameInsets() {
				return frameOf(this.tpl, this.card.meta)
			},
			// 相框内衬的偏移样式
			innerStyle() {
				const f = this.frameInsets
				return {
					left: f.left + '%',
					right: f.right + '%',
					top: f.top + '%'
				}
			},
			level() {
				return cardLevel(this.card)
			},
			maxLevel() {
				return MAX_HL_LEVEL
			},
			title() {
				return (this.card.title || '').trim()
			},
			caption() {
				return (this.card.caption || '').trim()
			},
			eventDate() {
				return this.card.eventDate || ''
			},
			yearText() {
				return this.eventDate.slice(0, 4)
			},
			mdText() {
				const m = this.eventDate.slice(5, 7)
				const d = this.eventDate.slice(8, 10)
				return m && d ? m + ' · ' + d : ''
			},
			// 设计宽度 CSS 变量: 内部装饰尺寸按此等比缩放
			pcStyle() {
				return '--pc-w: ' + this.w
			}
		},
		watch: {
			// 进入编辑模式即量取照片区矩形, 保证首次触摸就能识别边框带
			editable: {
				immediate: true,
				handler(v) {
					if (v) this.$nextTick(() => setTimeout(() => this.ensureRect(), 200))
				}
			}
		},
		beforeDestroy() {
			clearTimeout(this.pressTimer)
		},
		methods: {
			// 照片矩形 -> 绝对定位样式(含缝隙)
			styleOf(r) {
				return {
					left: r.x + GAP + '%',
					top: r.y + GAP + '%',
					width: Math.max(0, r.w - GAP * 2) + '%',
					height: Math.max(0, r.h - GAP * 2) + '%'
				}
			},
			// 命中框样式: 选中的置顶, 照片叠加时被盖住的照片点一下即可浮到最上层
			hitStyle(r, i) {
				return { ...this.styleOf(r), zIndex: this.selIndex === i ? 30 : 10 }
			},
			// 落款元素定位: 百分比 + 锚点对齐(日期额外旋转成印章)
			elStyle(field) {
				const p = textPos(this.tpl, field, this.card.meta)
				let transform = 'translate(0, -50%)'
				if (p.anchor === 'right') transform = 'translate(-100%, -50%)'
				else if (p.anchor === 'center') transform = 'translate(-50%, -50%)'
				if (field === 'date') transform += ' rotate(-12deg)'
				return {
					left: p.x + '%',
					top: p.y + '%',
					transform
				}
			},

			/* ============ 照片手势: 统一在卡片层处理 ============
			 * 所有触摸事件都在 .pc-frame 上接收, 手动做命中测试,
			 * 不依赖触摸落在哪个元素上(虚线内侧/线上/外侧一小圈行为一致)
			 */
			ensureRect() {
				if (this.photosRect) return
				const q = uni.createSelectorQuery().in(this)
				q.select('.pc-photos').boundingClientRect(rect => {
					if (rect && rect.width) {
						this.photosRect = rect
						this.photosRectSpace = this.space
					}
				})
				q.select('.pc').boundingClientRect(rect => {
					if (rect && rect.height) this.cardRect = rect
				})
				q.exec()
			},
			// 相框内衬的像素盒: 留白变化后照片区高度按比例换算, 无需重新量取
			innerBox() {
				const p = this.photosRect
				if (!p) return null
				const f = this.frameInsets
				const s0 = this.photosRectSpace == null ? this.space : this.photosRectSpace
				const grow = (1 - this.space / 100) / (1 - s0 / 100)
				const ph = p.height * grow
				return {
					left: p.left + (p.width * f.left) / 100,
					top: p.top + (ph * f.top) / 100,
					width: p.width * (1 - (f.left + f.right) / 100),
					height: ph * (1 - f.top / 100)
				}
			},
			// 照片矩形 -> 卡片内的像素盒
			rectPx(r, box) {
				return {
					x: box.left + (r.x / 100) * box.width,
					y: box.top + (r.y / 100) * box.height,
					w: (r.w / 100) * box.width,
					h: (r.h / 100) * box.height
				}
			},
			// 边框带宽度(px): 抓边的判定范围
			edgeBand(box) {
				return Math.max(14, Math.min(28, box.width * 0.06))
			},
			// 命中测试顺序: 选中的优先, 其余按层级从上到下
			hitOrder() {
				const order = []
				if (this.selIndex >= 0 && this.selIndex < this.rects.length) order.push(this.selIndex)
				for (let i = this.rects.length - 1; i >= 0; i--) {
					if (i !== this.selIndex) order.push(i)
				}
				return order
			},
			// 触点压在哪张照片矩形内, 没有则 -1
			photoAt(t) {
				const box = this.innerBox()
				if (!box) return -1
				for (const i of this.hitOrder()) {
					const p = this.rectPx(this.rects[i], box)
					if (t.clientX >= p.x && t.clientX <= p.x + p.w && t.clientY >= p.y && t.clientY <= p.y + p.h) {
						return i
					}
				}
				return -1
			},
			// 触点靠近哪张照片(边框带外扩一圈), 没有则 -1; 贴边照片线外一小圈也能抓
			edgePhotoAt(t) {
				const box = this.innerBox()
				if (!box) return -1
				const band = this.edgeBand(box)
				for (const i of this.hitOrder()) {
					const p = this.rectPx(this.rects[i], box)
					if (t.clientX >= p.x - band && t.clientX <= p.x + p.w + band &&
						t.clientY >= p.y - band && t.clientY <= p.y + p.h + band) {
						return i
					}
				}
				return -1
			},
			// 触点命中照片的哪些边, 供缩放拉伸
			edgeOf(i, t) {
				const box = this.innerBox()
				if (!box || !this.startRects[i]) return null
				const p = this.rectPx(this.startRects[i], box)
				const band = this.edgeBand(box)
				return {
					l: t.clientX - p.x <= band,
					r: p.x + p.w - t.clientX <= band,
					t: t.clientY - p.y <= band,
					b: p.y + p.h - t.clientY <= band
				}
			},
			// 按下: 点在照片上→选中(边框带=缩放, 内部=长按激活换位); 靠近边框→缩放; 空白→取消选中
			onFrameTouch(e) {
				if (!this.editable) return
				this.$emit('photo-touch')
				const t = e.touches && e.touches[0]
				if (!t) return
				this.ensureRect()
				const b0 = this.innerBox()
				if (!b0) return
				clearTimeout(this.pressTimer)
				this.mode = ''
				this.rzEdges = null
				this.swapTarget = -1
				let i = this.photoAt(t)
				if (i < 0) i = this.edgePhotoAt(t)
				if (i < 0) {
					this.selIndex = -1
					return
				}
				this.selIndex = i
				this.startX = t.clientX
				this.startY = t.clientY
				this.startRects = this.rects.map(r => ({ ...r }))
				this.startSpace = this.space
				this.gestH = b0.height
				this.gestAbs = this.startRects.map(r => ({
					x: (r.x / 100) * b0.width,
					y: (r.y / 100) * b0.height,
					w: (r.w / 100) * b0.width,
					h: (r.h / 100) * b0.height
				}))
				const e2 = this.edgeOf(i, t)
				if (e2 && (e2.l || e2.r || e2.t || e2.b)) {
					// 按在边框带: 拖动即缩放
					this.mode = 'resize'
					this.rzEdges = e2
				} else {
					// 按在内部: 长按激活换位, 唯一的震动时机
					this.pressTimer = setTimeout(() => {
						if (this.mode) return
						this.mode = 'move'
						try { uni.vibrateShort({}) } catch (err) {}
					}, 350)
				}
			},
			onFrameTouchMove(e) {
				if (!this.editable || this.selIndex < 0) return
				const t = e.touches && e.touches[0]
				if (!t) return
				const box = this.innerBox()
				if (!box) return
				const dx = ((t.clientX - this.startX) / box.width) * 100
				const dy = ((t.clientY - this.startY) / box.height) * 100
				// 未长按激活: 拖动只取消长按, 照片不动
				if (!this.mode) {
					if (Math.abs(t.clientX - this.startX) > 8 || Math.abs(t.clientY - this.startY) > 8) {
						clearTimeout(this.pressTimer)
					}
					return
				}
				const arr = this.startRects.map(r => ({ ...r }))
				const r = arr[this.selIndex]
				if (!r) return
				if (this.mode === 'resize' && (this.rzEdges || {}).b) {
					// 底边(可含角点): 绝对坐标处理; 越过照片区下界时边界跟随手指并压缩底部留白,
					// 留白变化后照片区高度变了, 所有矩形按新高度回算 -> 其他照片保持像素不动
					const e2 = this.rzEdges
					const MIN = 8
					const dyPx = t.clientY - this.startY
					const abs = this.gestAbs[this.selIndex]
					const absBottom = abs.y + abs.h + dyPx
					const F = this.gestH / (1 - this.startSpace / 100) // 相框内容高(px), 恒定
					let H = this.gestH
					if (absBottom > H) {
						H = Math.min(absBottom, F)
						let ns = Math.round((1 - H / F) * 1000) / 10
						ns = Math.max(0, Math.min(60, ns))
						H = F * (1 - ns / 100)
						if (ns !== this.space) this.$emit('space', ns)
					}
					// 留白压缩后照片区变高: 各矩形按新高度回算百分比, 绝对位置不变
					const k = H / this.gestH
					const arr2 = this.startRects.map(o => ({ x: o.x, w: o.w, y: o.y / k, h: o.h / k }))
					const rr = arr2[this.selIndex]
					const dxp = ((t.clientX - this.startX) / box.width) * 100
					const dyp = (dyPx / H) * 100
					if (e2.l) { const nx = clamp(rr.x + dxp, 0, rr.x + rr.w - MIN); rr.w += rr.x - nx; rr.x = nx }
					if (e2.r) { rr.w = clamp(rr.w + dxp, MIN, 100 - rr.x) }
					if (e2.t && e2.b) {
						// 上下角同按: 整体竖向移动
						rr.y = clamp(rr.y + dyp, 0, 100 - rr.h)
					} else if (e2.t) {
						const ny = clamp(rr.y + dyp, 0, rr.y + rr.h - MIN)
						rr.h += rr.y - ny
						rr.y = ny
					} else {
						rr.h = clamp((absBottom / H) * 100 - rr.y, MIN, 100 - rr.y)
					}
					this.$emit('rects', arr2.map(clampRect))
					return
				}
				if (this.mode === 'resize') {
					// 拖动边框(不含底边): 拉伸命中的边
					const e2 = this.rzEdges || {}
					const MIN = 8
					if (e2.l) { const nx = clamp(r.x + dx, 0, r.x + r.w - MIN); r.w += r.x - nx; r.x = nx }
					if (e2.r) { r.w = clamp(r.w + dx, MIN, 100 - r.x) }
					if (e2.t) { const ny = clamp(r.y + dy, 0, r.y + r.h - MIN); r.h += r.y - ny; r.y = ny }
					this.$emit('rects', arr.map(clampRect))
					return
				}
				// 换位拖动: 跟随手指, 中心压到哪张照片松手即换位
				r.x = clamp(r.x + dx, 0, 100 - r.w)
				r.y = clamp(r.y + dy, 0, 100 - r.h)
				const cx = r.x + r.w / 2
				const cy = r.y + r.h / 2
				let tgt = -1
				arr.forEach((o, j) => {
					if (j !== this.selIndex && cx >= o.x && cx <= o.x + o.w && cy >= o.y && cy <= o.y + o.h) tgt = j
				})
				this.swapTarget = tgt
				this.$emit('rects', arr.map(clampRect))
			},
			onFrameTouchEnd() {
				if (!this.editable) return
				clearTimeout(this.pressTimer)
				if (this.mode === 'move' && this.swapTarget >= 0 && this.selIndex >= 0) {
					// 换位: 交换两张照片的矩形
					const arr = this.startRects.map(r => ({ ...r }))
					const j = this.swapTarget
					const tmp = arr[this.selIndex]
					arr[this.selIndex] = arr[j]
					arr[j] = tmp
					this.$emit('rects', arr.map(clampRect))
				}
				this.mode = ''
				this.swapTarget = -1
				this.rzEdges = null
			}
		}
	}
</script>

<style lang="scss" scoped>
	.pc {
		position: relative;
		width: 100%;
		padding-bottom: 125%; /* 4:5 竖版 */
	}
	.pc-frame {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.pc-photos {
		position: relative;
		flex: 1;
		min-height: 0;
	}
	/* 相框内衬: 白边厚度由编辑结果决定, 照片都在这层内排版 */
	.pc-inner {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
	}
	.pc-canvas {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	.pc-cell {
		position: absolute;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.04);
	}
	.pc-cell.sel {
		z-index: 3;
	}
	.pc-img {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* 编辑模式: 命中框(未选中时完全隐藏, 只可点选) */
	.pc-edit {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 4;
	}
	.pc-hit {
		position: absolute;
		box-sizing: border-box;
		border: 4rpx dashed transparent;
		border-radius: 3rpx;
	}
	/* 选中: 虚线框, 可拖动换位/拖边框缩放 */
	.pc-hit.on {
		border: 4rpx dashed #4F8B8B;
		background: rgba(79, 139, 139, 0.08);
		box-shadow: 0 0 0 2rpx rgba(255, 255, 255, 0.85);
	}
	/* 拖动换位: 压到的目标照片高亮 */
	.pc-hit.tgt {
		border: 4rpx dashed #E09A56;
		background: rgba(224, 154, 86, 0.14);
		box-shadow: 0 0 0 2rpx rgba(255, 255, 255, 0.85);
	}
	/* 边框缩放中: 虚线加粗 */
	.pc-hit.rz {
		border: 6rpx dashed #4F8B8B;
		background: rgba(79, 139, 139, 0.14);
		box-shadow: 0 0 0 2rpx rgba(255, 255, 255, 0.85);
	}
	.pc-hit-n {
		position: absolute;
		left: 6rpx;
		top: 6rpx;
		min-width: 30rpx;
		height: 30rpx;
		line-height: 30rpx;
		text-align: center;
		border-radius: 8rpx;
		background: rgba(27, 59, 87, 0.55);
		color: #FFFFFF;
		font-size: 18rpx;
		font-weight: 700;
	}

	/* 落款区占位: 照片止于文字区上方, 保持相纸留白 */
	.pc-space {
		flex: 0 0 auto;
		min-height: 0;
	}

	/* 落款: 绝对定位, 位置由装帧默认值或微调结果决定; 尺寸随卡片宽度(--pc-w)等比缩放 */
	.pc-el {
		position: absolute;
		z-index: 2;
	}
	.pc-title {
		font-family: "Kaiti SC", "STKaiti", "KaiTi", serif;
		font-size: calc(var(--pc-w) * 0.065);
		font-weight: 700;
		color: #22201D;
		line-height: 1.3;
		max-width: 64%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pc-caption {
		font-size: calc(var(--pc-w) * 0.0434);
		color: #9A9184;
		line-height: 1.4;
		max-width: 64%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pc-stars {
		display: flex;
		gap: 2rpx;
	}
	.pc-star {
		font-size: calc(var(--pc-w) * 0.0467);
		color: rgba(27, 59, 87, 0.14);
	}
	.pc-star.on {
		color: $ti-accent;
	}

	/* 日期印章 */
	.pc-stamp {
		width: calc(var(--pc-w) * 0.1667);
		height: calc(var(--pc-w) * 0.1667);
		border: calc(var(--pc-w) * 0.005) solid rgba(217, 106, 91, 0.55);
		border-radius: 50%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		color: rgba(217, 106, 91, 0.82);
	}
	.pc-stamp-y {
		font-size: calc(var(--pc-w) * 0.0367);
		font-weight: 800;
		letter-spacing: 1rpx;
	}
	.pc-stamp-d {
		font-size: calc(var(--pc-w) * 0.0267);
		margin-top: 2rpx;
		letter-spacing: 1rpx;
	}

	/* ==================== 旧书页 ==================== */
	.tpl-book {
		background: #FBF6E8;
	}
	.tpl-book .pc-frame {
		padding: calc(var(--pc-w) * 0.0334);
	}
	.tpl-book .pc-photos {
		border: 2rpx solid #D9C9A4;
		padding: calc(var(--pc-w) * 0.0134);
		background: #FBF6E8;
	}
	/* 页边双线框, 强化「书页」的装帧感 */
	.tpl-book .pc-frame::after {
		content: "";
		position: absolute;
		left: calc(var(--pc-w) * 0.0167);
		top: calc(var(--pc-w) * 0.0167);
		right: calc(var(--pc-w) * 0.0167);
		bottom: calc(var(--pc-w) * 0.0167);
		border: 2rpx solid #E6D8B8;
		pointer-events: none;
	}

	/* ==================== 拍立得 ==================== */
	.tpl-polaroid {
		background: #FFFFFF;
	}
	.tpl-polaroid .pc-frame {
		padding: calc(var(--pc-w) * 0.0234) calc(var(--pc-w) * 0.0234) 0;
	}

	/* ==================== 胶片 ==================== */
	.tpl-film {
		background: #2C2C2C;
	}
	.tpl-film .pc-frame {
		padding: calc(var(--pc-w) * 0.0567) calc(var(--pc-w) * 0.02) 0;
	}
	.pc-perf {
		position: absolute;
		left: 0;
		right: 0;
		height: calc(var(--pc-w) * 0.03);
		background: repeating-linear-gradient(90deg, transparent 0 12rpx, #5A5A5A 12rpx 24rpx);
		opacity: 0.9;
	}
	.pc-perf.top {
		top: calc(var(--pc-w) * 0.01);
	}
	.pc-perf.bottom {
		bottom: calc(var(--pc-w) * 0.16);
	}
	.tpl-film .pc-title {
		color: #F0C08A;
	}
	.tpl-film .pc-caption {
		color: #B08A62;
	}
	.tpl-film .pc-star.on {
		color: #F2A262;
	}
	.tpl-film .pc-stamp {
		border-color: rgba(240, 153, 90, 0.6);
		color: rgba(240, 153, 90, 0.9);
	}

	/* ==================== 邮票 ==================== */
	.tpl-stamp {
		background: #FFFFFF;
	}
	.tpl-stamp .pc-frame {
		padding: calc(var(--pc-w) * 0.04);
	}
	.tpl-stamp .pc-photos {
		border: 3rpx dashed #D8C9A8;
		padding: calc(var(--pc-w) * 0.0134);
		background: #FFFFFF;
	}
	.tpl-stamp .pc-stamp {
		width: calc(var(--pc-w) * 0.1534);
		height: calc(var(--pc-w) * 0.1534);
	}

	/* ==================== 星芒 ==================== */
	.tpl-starburst {
		background: linear-gradient(160deg, #243A52 0%, #16283A 100%);
	}
	.tpl-starburst .pc-frame {
		padding: calc(var(--pc-w) * 0.03);
	}
	.tpl-starburst .pc-photos {
		border: 2rpx solid rgba(232, 185, 106, 0.4);
		padding: calc(var(--pc-w) * 0.01);
		background: transparent;
	}
	.tpl-starburst .pc-title {
		color: #F3D9A8;
	}
	.tpl-starburst .pc-caption {
		color: #C9B08A;
	}
	.tpl-starburst .pc-star.on {
		color: #E8B96A;
	}
	.tpl-starburst .pc-stamp {
		border-color: rgba(232, 185, 106, 0.6);
		color: rgba(232, 185, 106, 0.9);
	}
</style>
