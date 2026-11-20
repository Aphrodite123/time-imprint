<template>
	<view class="ac">
		<nav-bar
			:title="step === 3 ? '落款' : '做一张纪念照'"
			:subtitle="stepSub"
			:back-auto="false"
			@back="onBack"
		/>

		<view class="ac-body">
			<!-- 步骤条 -->
			<view class="ac-stepper">
				<view :class="['ac-st', step === 1 ? 'on' : step > 1 ? 'done' : '']">
					<text class="ac-st-n">{{ step > 1 ? '✓' : '1' }}</text><text>选照片</text>
				</view>
				<view class="ac-ln"></view>
				<view :class="['ac-st', step === 2 ? 'on' : step > 2 ? 'done' : '']">
					<text class="ac-st-n">{{ step > 2 ? '✓' : '2' }}</text><text>选装帧</text>
				</view>
				<view class="ac-ln"></view>
				<view :class="['ac-st', step === 3 ? 'on' : '']">
					<text class="ac-st-n">3</text><text>落款</text>
				</view>
			</view>

			<!-- ========== 第一步: 选照片 ========== -->
			<view v-if="step === 1" class="ac-step">
				<view class="ac-preview">
					<view class="ac-preview-head">
						<text class="ac-preview-title">版式预览</text>
						<text class="ac-preview-hint">{{ currentLayout.name }}</text>
					</view>
					<view class="ac-preview-card">
						<photo-card :card="previewCard" w="300rpx" />
					</view>
				</view>

				<view class="ac-row">
					<text class="ac-row-title">{{ memoryId ? '从这条印记里选' : '选择照片' }}</text>
					<text class="ac-row-link" @click="addFromAlbum">＋ 从相册添加</text>
				</view>

				<view class="ac-grid">
					<view
						v-for="(p, i) in photos"
						:key="p.url + i"
						:class="['ac-cell', p.selected ? 'on' : '']"
						@click="toggle(p)"
					>
						<image :src="p.url" mode="aspectFill" class="ac-cell-img" />
						<text v-if="p.selected" class="ac-cell-num">{{ p.order }}</text>
					</view>
					<view v-if="photos.length < 9" class="ac-cell ac-cell-add" @click="addFromAlbum">
						<text class="ac-add-plus">＋</text>
					</view>
				</view>

				<view v-if="!photos.length" class="ac-tip">
					这条印记还没有照片，点「从相册添加」选几张吧
				</view>
			</view>

			<!-- ========== 第二步: 选装帧 ========== -->
			<view v-else-if="step === 2" class="ac-step">
				<view class="ac-big-stage">
					<view class="ac-big-card">
						<photo-card :card="previewCard" w="430rpx" />
					</view>
					<view class="ac-adjust" @click="openEditor">调整位置</view>
				</view>
				<view class="ac-tpl-name">{{ currentTemplate.name }}</view>
				<view class="ac-tpl-desc">{{ currentTemplate.desc }}</view>

				<scroll-view scroll-x class="ac-tpl-scroll">
					<view class="ac-tpl-row">
						<view
							v-for="t in tplList"
							:key="t.id"
							:class="['ac-tpl', template === t.id ? 'on' : '']"
							@click="pickTemplate(t)"
						>
							<view class="ac-tpl-thumb">
								<photo-card :card="chipCard(t.id)" size="cover" w="128rpx" />
								<view v-if="isLocked(t)" class="ac-tpl-lock">{{ t.minLevel }}★</view>
							</view>
							<text class="ac-tpl-label">{{ t.name }}</text>
						</view>
					</view>
				</scroll-view>

				<!-- 版式: 手动选择, 只列出当前张数可用的 -->
				<view class="ac-sec-head">
					<text class="ac-sec-title">版式</text>
					<text class="ac-sec-hint">{{ layoutOptions.length - 1 }} 种可选</text>
				</view>
				<scroll-view scroll-x class="ac-lay-scroll">
					<view class="ac-lay-row">
						<view
							v-for="l in layoutOptions"
							:key="l.id"
							:class="['ac-lay', layoutId === l.id ? 'on' : '']"
							@click="pickLayout(l)"
						>
							<view class="ac-lay-thumb">
								<view class="ac-lay-grid">
									<view
										v-for="(cell, i) in cellsFor(l)"
										:key="i"
										class="ac-lay-cell"
										:style="cellStyle(cell)"
									></view>
								</view>
							</view>
							<text class="ac-lay-name">{{ l.name }}</text>
						</view>
					</view>
				</scroll-view>
			</view>

			<!-- ========== 第三步: 落款 ========== -->
			<view v-else class="ac-step">
				<view class="ac-small-stage">
					<view class="ac-small-card">
						<photo-card :card="previewCard" w="300rpx" />
					</view>
				</view>

				<view class="ac-form">
					<view class="ac-frow">
						<text class="ac-label">标题</text>
						<input
							v-model="title"
							class="ac-input"
							placeholder="不填则用「一段闪闪发光的日子」"
							placeholder-class="ac-ph"
							maxlength="16"
						/>
					</view>
					<view class="ac-frow">
						<text class="ac-label">一句话</text>
						<input
							v-model="caption"
							class="ac-input"
							placeholder="写下当时最想记住的"
							placeholder-class="ac-ph"
							maxlength="30"
						/>
					</view>
					<view class="ac-frow">
						<text class="ac-label">日期印章</text>
						<picker mode="date" :value="eventDate" start="1900-01-01" end="2100-12-31" @change="onDateChange">
							<text class="ac-stamp-line">{{ stampText }}</text>
						</picker>
					</view>
					<view class="ac-frow">
						<text class="ac-label">高光星级</text>
						<view class="ac-stars-wrap">
							<view class="ac-stars">
								<text
									v-for="i in 5"
									:key="i"
									:class="['ac-star', i <= level ? 'on' : '']"
									@click="level = i"
								>★</text>
							</view>
							<text class="ac-lv">{{ levelLabel }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部操作条 -->
		<view class="ac-bottom">
			<text v-if="step === 1" class="ac-count">已选 <text class="ac-count-n">{{ selected.length }}</text> / 9</text>
			<text v-else class="ac-count">{{ step === 2 ? currentTemplate.name : '共 ' + selected.length + ' 张' }}</text>
			<view :class="['ac-next', canNext ? '' : 'disabled']" @click="onNext">
				{{ step === 3 ? '生成纪念照' : '下一步' }}
			</view>
		</view>

		<!-- 隐藏的导出画布 -->
		<canvas canvas-id="cardCanvas" class="ac-canvas"></canvas>

		<!-- 生成成功弹层 -->
		<view v-if="success" class="ac-mask">
			<view class="ac-sheet">
				<view class="ac-grab"></view>
				<view class="ac-ok">✓</view>
				<text class="ac-ok-title">已收进纪念册</text>
				<text class="ac-ok-sub">{{ savedYear }} 年 · 第 {{ savedCount }} 张</text>

				<view class="ac-res">
					<view class="ac-res-thumb">
						<photo-card :card="previewCard" size="cover" w="104rpx" />
					</view>
					<view class="ac-res-info">
						<text class="ac-res-title">{{ title || '一段闪闪发光的日子' }}</text>
						<text class="ac-res-meta">{{ currentTemplate.name }} · {{ selected.length }} 张照片</text>
						<text class="ac-res-stars">{{ starText }}</text>
					</view>
				</view>

				<view class="ac-sheet-actions">
					<view class="ac-sa ghost" @click="saveImage">保存到相册</view>
					<view class="ac-sa pri" @click="shareImage">分享给朋友</view>
				</view>
				<text class="ac-done" @click="done">完成</text>
			</view>
		</view>

		<!-- 版面微调: 点选照片 · 长按拖动换位 · 边框缩放 · 点标签选中文字后拖动 -->
		<view v-if="editor" class="ed" @touchmove.stop.prevent="noop">
			<view class="ed-head" :style="headStyle">
				<text class="ed-title">调整版面</text>
				<text class="ed-sub">点选照片 · 长按拖动换位 · 拖边框调大小</text>
			</view>
			<view class="ed-stage">
				<view class="ed-card">
					<photo-card :card="previewCard" editable @rects="onRects" @space="onSpace" @photo-touch="onPhotoTouch" />
					<view
						v-for="f in textFields"
						:key="f.key"
						:class="['ed-handle-slot', 's-' + f.key]"
						:style="handleStyle(f.key)"
					>
						<!-- 选中/未选中是同一元素只切换样式: 保证长按选中后同一触摸可继续拖动 -->
						<view
							:class="['ed-handle', selText === f.key ? 'on' : 'free']"
							@touchstart.stop="onTextStart(f.key, $event)"
							@touchmove.stop.prevent="onTextMove"
							@touchend.stop="onTextEnd"
							@touchcancel.stop="onTextEnd"
						>
							<text class="ed-tag">{{ f.name }}</text>
						</view>
					</view>
				</view>
			</view>
			<view class="ed-foot">
				<view class="ed-btns">
					<view class="ed-fbtn ghost" @click="closeEditor">取消</view>
					<view class="ed-fbtn reset" @click="resetMeta">恢复默认</view>
					<view class="ed-fbtn pri" @click="closeEditor">完成</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	// 做一张纪念照: 选照片 → 选装帧 → 落款, 生成后收进年度纪念册
	import { getMemory, addPhotoCard, updatePhotoCard, getPhotoCard, listPhotoCards, setHighlight } from '../../utils/db'
	import { chooseImages, persistFile } from '../../utils/media'
	import { today } from '../../utils/date'
	import { levelOf } from '../../utils/highlight'
	import {
		TEMPLATES, templateOf, isTemplateLocked, layoutsFor, layoutOf, cellsOf, MAX_CARDS,
		TEXT_FIELDS, textPos
	} from '../../utils/album'
	import { exportCardImage, saveImageToAlbum, CARD_CANVAS_ID } from '../../utils/card-canvas'
	import { getNavMetrics } from '../../utils/nav'

	import { appShare, appShareTimeline } from '../../utils/share'
	export default {
		onShareAppMessage() {
			return appShare()
		},
		onShareTimeline() {
			return appShareTimeline()
		},
		data() {
			return {
				step: 1,
				memoryId: '',
				cardId: '',
				memory: null,
				photos: [], // {url, selected, order, isNew, owned}
				template: 'polaroid',
				layoutId: 'auto',
				meta: {}, // 落款自定义位置 { title/caption/date/stars: {x,y} }
				title: '',
				caption: '',
				eventDate: today(),
				level: 3,
				tplList: TEMPLATES,
				textFields: TEXT_FIELDS,
				saving: false,
				success: false,
				savedYear: '',
				savedCount: 0,
				// 版面微调
				editor: false,
				selText: '', // 选中的落款文字(虚线框可拖动); 空 = 未选中
				nav: getNavMetrics(),
				ed: { mode: '', field: '', startX: 0, startY: 0, startPos: { x: 0, y: 0 }, rect: null }
			}
		},
		computed: {
			stepSub() {
				return ['第一步 · 选照片', '第二步 · 排版与装帧', '第三步 · 写下日期与一句话'][this.step - 1]
			},
			selected() {
				return this.photos.filter(p => p.selected).sort((a, b) => a.order - b.order)
			},
			selectedCount() {
				return this.selected.length
			},
			selectedUrls() {
				return this.selected.map(p => p.url)
			},
			previewCard() {
				return {
					template: this.template,
					layout: this.layoutId,
					meta: this.meta,
					title: this.title,
					caption: this.caption,
					eventDate: this.eventDate,
					level: this.level,
					images: this.selectedUrls
				}
			},
			// 当前张数可选的版式(自动 + 对应张数的命名版式)
			layoutOptions() {
				return layoutsFor(Math.max(1, this.selectedCount))
			},
			currentLayout() {
				return layoutOf(this.layoutId)
			},
			currentTemplate() {
				return templateOf(this.template)
			},
			levelLabel() {
				const map = { 1: '心动一瞬', 2: '温暖小事', 3: '难忘时刻', 4: '人生大事', 5: '一生珍藏' }
				return map[this.level] || '难忘时刻'
			},
			stampText() {
				if (!this.eventDate) return '选择日期'
				return this.eventDate.replace(/-/g, ' · ')
			},
			starText() {
				return '★'.repeat(this.level)
			},
			// 标题落在状态栏与胶囊下方, 居中显示
			headStyle() {
				const n = this.nav
				const top = n.rightInset > 0
					? n.statusBarHeight + (n.capsuleHeight || 32) + 14
					: n.statusBarHeight + 16
				return { paddingTop: Math.max(top, 24) + 'px' }
			},
			canNext() {
				if (this.step === 1) return this.selected.length > 0
				if (this.step === 3) return this.selected.length > 0 && !this.saving
				return true
			}
		},
		onLoad(opt) {
			this.memoryId = opt.memoryId || ''
			this.cardId = opt.cardId || ''
			this.init()
		},
		watch: {
			// 落款时把星级调低后, 已选的锁定装帧需降级(解锁门槛以当前星级为准)
			level(v) {
				const t = templateOf(this.template)
				if (v < t.minLevel) {
					this.template = 'polaroid'
					uni.showToast({ title: '「' + t.name + '」需 ' + t.minLevel + ' 星，已切换为拍立得', icon: 'none' })
				}
			},
			// 照片张数变化后, 原先手选的版式/自定义照片位置可能不再适用
			selectedCount(n) {
				if (this.meta.photoRects && this.meta.photoRects.length !== Math.max(1, n)) {
					delete this.meta.photoRects
				}
				if (this.layoutId === 'auto') return
				const l = layoutOf(this.layoutId)
				if (!l.counts.includes(Math.max(1, n))) this.layoutId = 'auto'
			}
		},
		methods: {
			async init() {
				uni.showLoading({ title: '载入中', mask: true })
				try {
					if (this.cardId) {
						const c = await getPhotoCard(this.cardId)
						if (c) {
							this.memoryId = c.memoryId || ''
							this.template = c.template || 'polaroid'
							this.layoutId = layoutOf(c.layout).id
							this.meta = c.meta || {}
							this.title = c.title || ''
							this.caption = c.caption || ''
							this.eventDate = c.eventDate || today()
							this.level = levelOf({ highlightLevel: c.level })
							this.photos = (c.images || []).map((url, i) => ({
								url, selected: true, order: i + 1, isNew: false, owned: true
							}))
						} else {
							this.cardId = ''
						}
					} else if (this.memoryId) {
						const m = await getMemory(this.memoryId)
						this.memory = m
						if (m) {
							this.title = m.title || ''
							this.eventDate = m.eventDate || today()
							this.level = levelOf(m)
							const imgs = (m.medias || []).filter(x => x.type === 'image').map(x => x.url)
							this.photos = imgs.map((url, i) => ({
								url,
								selected: i < MAX_CARDS,
								order: i + 1,
								isNew: false,
								owned: false // 来自印记, 生成时复制一份, 印记删除不影响纪念照
							}))
							// 超出的照片不选中, 序号需重排
							this.renumber()
						}
					}
				} finally {
					uni.hideLoading()
				}
			},
			renumber() {
				// 保留点击顺序: 按原 order 排序后重排 1..n
				const sel = this.photos.filter(p => p.selected).sort((a, b) => a.order - b.order)
				sel.forEach((p, i) => { p.order = i + 1 })
				this.photos.filter(p => !p.selected).forEach(p => { p.order = 0 })
			},
			async addFromAlbum() {
				const left = MAX_CARDS - this.selected.length
				if (left <= 0) return uni.showToast({ title: '最多选 9 张', icon: 'none' })
				try {
					const paths = await chooseImages(left)
					if (!paths || !paths.length) return
					for (const url of paths) {
						this.photos.push({
							url,
							selected: true,
							order: this.selected.length + 1,
							isNew: true,
							owned: false
						})
					}
					this.renumber()
				} catch (e) {
					uni.showToast({ title: e.message || '选择照片失败', icon: 'none' })
				}
			},
			toggle(p) {
				if (p.selected) {
					p.selected = false
					this.renumber()
					return
				}
				if (this.selected.length >= MAX_CARDS) {
					return uni.showToast({ title: '最多选 9 张', icon: 'none' })
				}
				p.selected = true
				// 新选中的排在已选末尾
				const maxOrder = this.photos.reduce((m, x) => (x.selected && x.order > m ? x.order : m), 0)
				p.order = maxOrder + 1
				this.renumber()
			},
			isLocked(t) {
				return isTemplateLocked(t.id, this.level)
			},
			pickTemplate(t) {
				if (!this.isLocked(t)) {
					this.template = t.id
					return
				}
				uni.showModal({
					title: '解锁「' + t.name + '」',
					content: '这套装帧需要 ' + t.minLevel + ' 星高光。把这条印记设为 ' + t.minLevel + ' 星并解锁吗？',
					confirmText: '设为 ' + t.minLevel + ' 星',
					confirmColor: '#4F8B8B',
					success: r => {
						if (!r.confirm) return
						this.level = t.minLevel
						this.template = t.id
					}
				})
			},
			chipCard(tplId) {
				return {
					template: tplId,
					layout: this.layoutId,
					title: '',
					caption: '',
					eventDate: '',
					level: this.level,
					images: this.selectedUrls.slice(0, 4)
				}
			},
			// 版式缩略图: 用 12×12 网格画出单元格
			cellsFor(l) {
				return cellsOf(Math.max(1, this.selectedCount), l.id)
			},
			cellStyle(cell) {
				return {
					'grid-column': cell.c + ' / span ' + cell.cs,
					'grid-row': cell.r + ' / span ' + cell.rs
				}
			},

			/* ============ 版面微调 ============ */
			openEditor() {
				this.editor = true
				this.$nextTick(() => {
					setTimeout(() => this.measureEditor(), 150)
				})
			},
			closeEditor() {
				this.editor = false
				this.ed.mode = ''
				this.ed.field = ''
				this.selText = ''
			},
			// 照片或卡片空白被按下时, 取消文字选中(虚线框收起为小标签)
			onPhotoTouch() {
				this.selText = ''
			},
			// 量取编辑卡片尺寸, 作为文字拖动百分比的换算基准
			measureEditor() {
				uni.createSelectorQuery()
					.in(this)
					.select('.ed-card')
					.boundingClientRect(rect => {
						if (rect && rect.width) this.ed.rect = rect
					})
					.exec()
			},
			// 文字拖动手柄的位置与大小: 宽度贴合实际文字(按字数估算), 点文字即可选中拖动
			handleStyle(field) {
				const p = textPos(this.template, field, this.meta)
				let transform = 'translate(0, -50%)'
				if (p.anchor === 'right') transform = 'translate(-100%, -50%)'
				else if (p.anchor === 'center') transform = 'translate(-50%, -50%)'
				if (field === 'date') transform += ' rotate(-12deg)'
				const titleLen = (this.title || '一段闪闪发光的日子').length
				const w = {
					title: Math.min(72, 12 + titleLen * 6.8),
					caption: this.caption ? Math.min(64, 12 + this.caption.length * 4.4) : 12,
					stars: 28,
					date: 18
				}[field]
				const h = { title: '8%', caption: '6%', stars: '6%', date: '16%' }[field]
				return {
					left: p.x + '%',
					top: p.y + '%',
					width: w + '%',
					height: h,
					transform
				}
			},
			onTextStart(field, e) {
				const t = e.touches && e.touches[0]
				if (!t) return
				this.selText = field
				this.ed.mode = 'text'
				this.ed.field = field
				this.ed.startX = t.clientX
				this.ed.startY = t.clientY
				const p = textPos(this.template, field, this.meta)
				this.ed.startPos = { x: p.x, y: p.y }
			},
			onTextMove(e) {
				if (this.ed.mode !== 'text' || !this.ed.rect) return
				const t = e.touches && e.touches[0]
				if (!t) return
				const dx = ((t.clientX - this.ed.startX) / this.ed.rect.width) * 100
				const dy = ((t.clientY - this.ed.startY) / this.ed.rect.height) * 100
				const x = Math.max(2, Math.min(98, this.ed.startPos.x + dx))
				const y = Math.max(4, Math.min(96, this.ed.startPos.y + dy))
				this.meta[this.ed.field] = {
					x: Math.round(x * 10) / 10,
					y: Math.round(y * 10) / 10
				}
			},
			onTextEnd() {
				this.ed.mode = ''
				this.ed.field = ''
			},
			resetMeta() {
				this.meta = {}
				uni.showToast({ title: '已恢复默认排版', icon: 'none' })
			},
			// 换版式: 照片布局回到该版式的默认网格
			pickLayout(l) {
				if (this.layoutId === l.id) return
				this.layoutId = l.id
				if (this.meta.photoRects) delete this.meta.photoRects
			},
			// 逐张照片的矩形变更(拖动换位/拖边框缩放)
			onRects(rects) {
				this.meta.photoRects = rects
			},
			// 照片底边越过照片区下界时, 压缩底部留白
			onSpace(v) {
				this.meta.space = v
			},
			noop() {},
			onDateChange(e) {
				this.eventDate = e.detail.value
			},
			// 从路径推断扩展名, 避免 PNG 被存成 .jpg
			extOf(url) {
				const m = String(url || '').match(/\.(\w+)(?:\?|$)/)
				return m ? m[1].toLowerCase() : 'jpg'
			},
			onBack() {
				if (this.step > 1) {
					this.step--
					return
				}
				uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/archive/album' }) })
			},
			onNext() {
				if (!this.canNext) return
				if (this.step < 3) {
					this.step++
					return
				}
				this.generate()
			},
			async generate() {
				if (!this.selected.length) {
					return uni.showToast({ title: '至少选 1 张照片', icon: 'none' })
				}
				if (this.saving) return
				this.saving = true
				uni.showLoading({ title: '生成中', mask: true })
				try {
					// 照片复制为纪念照自己的副本(印记删除后仍可查看); 已归属本卡的直接复用
					const urls = []
					for (const p of this.selected) {
						urls.push(p.owned ? p.url : await persistFile(p.url, this.extOf(p.url)))
					}
					const data = {
						memoryId: this.memoryId || '',
						template: this.template,
						layout: this.layoutId || 'auto',
						title: (this.title || '').trim(),
						caption: (this.caption || '').trim(),
						eventDate: this.eventDate,
						level: this.level,
						images: urls,
						meta: this.meta
					}
					if (this.cardId) {
						await updatePhotoCard(this.cardId, data)
					} else {
						const c = await addPhotoCard(data)
						this.cardId = c.cardId
					}
					// 星级同步回印记(纪念照本身就是高光时刻)
					if (this.memoryId) {
						await setHighlight(this.memoryId, true, data.title, this.level)
					}
					// 生成后图片已经是持久化路径, 供立即导出
					this.photos = urls.map((url, i) => ({
						url, selected: true, order: i + 1, isNew: false, owned: true
					}))

					const all = await listPhotoCards()
					this.savedYear = String(this.eventDate).slice(0, 4)
					this.savedCount = all.filter(c => String(c.eventDate || '').slice(0, 4) === this.savedYear).length

					uni.hideLoading()
					this.success = true
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: '生成失败：' + (e.message || e), icon: 'none' })
				} finally {
					this.saving = false
				}
			},
			// 导出当前卡片图片(成功后才有持久化路径)
			async buildImage() {
				return exportCardImage(this.previewCard, CARD_CANVAS_ID, this)
			},
			async saveImage() {
				uni.showLoading({ title: '生成图片', mask: true })
				try {
					const path = await this.buildImage()
					const ok = await saveImageToAlbum(path)
					uni.hideLoading()
					if (ok) {
						uni.showToast({ title: '已保存到相册', icon: 'success' })
					} else {
						// H5: 预览后长按保存
						uni.previewImage({ urls: [path], current: 0 })
						uni.showToast({ title: '长按图片可保存', icon: 'none' })
					}
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: e.message || '保存失败', icon: 'none' })
				}
			},
			async shareImage() {
				// #ifdef MP-WEIXIN
				if (typeof wx.showShareImageMenu !== 'function') {
					return this.saveImage()
				}
				uni.showLoading({ title: '生成图片', mask: true })
				try {
					const path = await this.buildImage()
					uni.hideLoading()
					wx.showShareImageMenu({
						path,
						fail: () => uni.showToast({ title: '请使用右上角转发', icon: 'none' })
					})
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: e.message || '分享失败', icon: 'none' })
				}
				// #endif
				// #ifndef MP-WEIXIN
				this.saveImage()
				// #endif
			},
			done() {
				this.success = false
				setTimeout(() => {
					uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/archive/album' }) })
				}, 160)
			}
		}
	}
</script>

<style lang="scss" scoped>
	.ac {
		min-height: 100vh;
		background: $ti-bg;
		padding-bottom: 220rpx;
	}
	.ac-body {
		padding: 8rpx $page-pad 0;
	}
	.ac-step {
		padding-top: 4rpx;
	}

	/* 步骤条 */
	.ac-stepper {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12rpx;
		padding: 12rpx 0 26rpx;
	}
	.ac-st {
		display: flex;
		align-items: center;
		gap: 8rpx;
		font-size: 22rpx;
		color: $ti-text-3;
	}
	.ac-st-n {
		width: 34rpx;
		height: 34rpx;
		border-radius: 50%;
		background: #FFFFFF;
		box-shadow: $shadow-card;
		font-size: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		color: $ti-text-3;
	}
	.ac-st.on {
		color: $ti-primary-deep;
		font-weight: 800;
	}
	.ac-st.on .ac-st-n {
		background: $ti-primary;
		color: #FFFFFF;
	}
	.ac-st.done .ac-st-n {
		background: $ti-primary-light;
		color: $ti-primary-deep;
	}
	.ac-ln {
		width: 32rpx;
		height: 2rpx;
		background: #DBD3C2;
	}

	/* 预览卡 */
	.ac-preview {
		background: $ti-card;
		border-radius: 40rpx;
		box-shadow: $shadow-card;
		padding: 22rpx;
		margin-bottom: 26rpx;
	}
	.ac-preview-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 4rpx 16rpx;
	}
	.ac-preview-title {
		font-size: 24rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.ac-preview-hint {
		font-size: 22rpx;
		color: $ti-text-3;
	}
	.ac-preview-card {
		width: 300rpx;
		margin: 0 auto;
		box-shadow: 0 14rpx 30rpx rgba(27, 59, 87, 0.16);
		border-radius: 8rpx;
		overflow: hidden;
	}

	/* 照片网格 */
	.ac-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 6rpx 18rpx;
	}
	.ac-row-title {
		font-size: 26rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.ac-row-link {
		font-size: 24rpx;
		color: $ti-primary;
		font-weight: 700;
	}
	.ac-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16rpx;
	}
	.ac-cell {
		position: relative;
		padding-bottom: 100%;
		border-radius: 24rpx;
		overflow: hidden;
		background: #EFE9DC;
		box-shadow: 0 6rpx 14rpx rgba(27, 59, 87, 0.1);
	}
	.ac-cell.on {
		box-shadow: 0 0 0 5rpx $ti-primary, 0 8rpx 18rpx rgba(79, 139, 139, 0.28);
	}
	.ac-cell-img {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}
	.ac-cell-num {
		position: absolute;
		right: 10rpx;
		bottom: 10rpx;
		width: 36rpx;
		height: 36rpx;
		border-radius: 50%;
		background: $ti-primary;
		color: #FFFFFF;
		font-size: 20rpx;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.2);
	}
	.ac-cell-add {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #FFFFFF;
		border: 3rpx dashed #D8D0BE;
		box-shadow: none;
	}
	.ac-add-plus {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		font-size: 54rpx;
		font-weight: 300;
		color: #C9C2B2;
	}
	.ac-tip {
		padding: 26rpx 8rpx;
		font-size: 23rpx;
		color: $ti-text-3;
		line-height: 1.8;
	}

	/* 选装帧 */
	.ac-big-stage {
		position: relative;
		width: 430rpx;
		margin: 0 auto;
		padding: 6rpx 0 26rpx;
	}
	.ac-big-card {
		width: 100%;
		box-shadow: 0 22rpx 48rpx rgba(27, 59, 87, 0.2);
		border-radius: 8rpx;
		overflow: hidden;
		transform: rotate(-0.8deg);
	}
	.ac-adjust {
		position: absolute;
		right: 8rpx;
		bottom: 40rpx;
		padding: 10rpx 22rpx;
		border-radius: 999rpx;
		background: rgba(27, 59, 87, 0.72);
		color: #FFFFFF;
		font-size: 21rpx;
		font-weight: 700;
		letter-spacing: 1rpx;
		box-shadow: 0 6rpx 16rpx rgba(27, 59, 87, 0.24);
	}
	.ac-tpl-name {
		text-align: center;
		font-size: 32rpx;
		font-weight: 800;
		color: $ti-navy;
		letter-spacing: 2rpx;
	}
	.ac-tpl-desc {
		text-align: center;
		font-size: 22rpx;
		color: $ti-text-3;
		line-height: 1.7;
		padding: 10rpx 60rpx 0;
	}
	.ac-tpl-scroll {
		white-space: nowrap;
		margin-top: 26rpx;
		box-sizing: border-box;
	}
	.ac-tpl-row {
		display: inline-flex;
		gap: 20rpx;
		padding: 4rpx 2rpx 8rpx;
	}
	.ac-tpl {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		width: 128rpx;
	}
	.ac-tpl-thumb {
		position: relative;
		width: 128rpx;
		border-radius: 14rpx;
		overflow: hidden;
		box-shadow: 0 8rpx 18rpx rgba(27, 59, 87, 0.12);
	}
	.ac-tpl.on .ac-tpl-thumb {
		box-shadow: 0 0 0 5rpx $ti-primary, 0 10rpx 20rpx rgba(79, 139, 139, 0.26);
	}
	.ac-tpl-lock {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(27, 59, 87, 0.55);
		color: #FFFFFF;
		font-size: 20rpx;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		letter-spacing: 1rpx;
	}
	.ac-tpl-label {
		margin-top: 12rpx;
		font-size: 20rpx;
		color: $ti-text-3;
	}
	.ac-tpl.on .ac-tpl-label {
		color: $ti-primary-deep;
		font-weight: 800;
	}

	/* 版式选择 */
	.ac-sec-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 30rpx 6rpx 14rpx;
	}
	.ac-sec-title {
		font-size: 26rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.ac-sec-hint {
		font-size: 21rpx;
		color: $ti-text-3;
	}
	.ac-lay-scroll {
		white-space: nowrap;
		box-sizing: border-box;
	}
	.ac-lay-row {
		display: inline-flex;
		gap: 18rpx;
		padding: 2rpx 2rpx 8rpx;
	}
	.ac-lay {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		width: 104rpx;
	}
	.ac-lay-thumb {
		width: 104rpx;
		height: 130rpx;
		background: #FFFFFF;
		border-radius: 12rpx;
		box-shadow: 0 6rpx 14rpx rgba(27, 59, 87, 0.1);
		padding: 8rpx;
		box-sizing: border-box;
	}
	.ac-lay.on .ac-lay-thumb {
		box-shadow: 0 0 0 4rpx $ti-primary, 0 8rpx 16rpx rgba(79, 139, 139, 0.24);
	}
	.ac-lay-grid {
		width: 100%;
		height: 100%;
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		grid-template-rows: repeat(12, 1fr);
		gap: 1rpx;
	}
	.ac-lay-cell {
		background: #DCEBEA;
		border-radius: 1rpx;
	}
	.ac-lay.on .ac-lay-cell {
		background: #BFDBD8;
	}
	.ac-lay-name {
		margin-top: 10rpx;
		font-size: 19rpx;
		color: $ti-text-3;
		white-space: nowrap;
	}
	.ac-lay.on .ac-lay-name {
		color: $ti-primary-deep;
		font-weight: 800;
	}

	/* 落款 */
	.ac-small-stage {
		display: flex;
		justify-content: center;
		padding: 4rpx 0 26rpx;
	}
	.ac-small-card {
		width: 300rpx;
		box-shadow: 0 16rpx 34rpx rgba(27, 59, 87, 0.18);
		border-radius: 8rpx;
		overflow: hidden;
		transform: rotate(-1.2deg);
	}
	.ac-form {
		background: $ti-card;
		border-radius: 40rpx;
		box-shadow: $shadow-card;
		padding: 4rpx 30rpx;
	}
	.ac-frow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24rpx;
		padding: 26rpx 0;
		border-bottom: 2rpx solid $ti-line;
		&:last-child {
			border-bottom: none;
		}
	}
	.ac-label {
		font-size: 26rpx;
		color: $ti-text-2;
		flex-shrink: 0;
	}
	.ac-input {
		flex: 1;
		text-align: right;
		font-size: 26rpx;
		font-weight: 700;
		color: $ti-navy;
	}
	.ac-ph {
		color: #B9B2A0;
		font-weight: 400;
	}
	.ac-stamp-line {
		font-size: 22rpx;
		color: $ti-danger;
		border: 2rpx solid rgba(217, 106, 91, 0.5);
		border-radius: 8rpx;
		padding: 4rpx 14rpx;
		transform: rotate(-2deg);
		display: inline-block;
	}
	.ac-stars-wrap {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}
	.ac-stars {
		display: flex;
		gap: 4rpx;
	}
	.ac-star {
		font-size: 34rpx;
		color: #E3DCCB;
		padding: 0 2rpx;
	}
	.ac-star.on {
		color: $ti-accent;
	}
	.ac-lv {
		font-size: 20rpx;
		font-weight: 700;
		color: $ti-accent-deep;
		background: $ti-accent-light;
		border-radius: 999rpx;
		padding: 4rpx 14rpx;
	}

	/* 底部条 */
	.ac-bottom {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 20rpx $page-pad calc(28rpx + env(safe-area-inset-bottom));
		background: linear-gradient(180deg, rgba(247, 241, 227, 0) 0%, $ti-bg 34%);
		display: flex;
		align-items: center;
		gap: 24rpx;
		z-index: 90;
	}
	.ac-count {
		font-size: 24rpx;
		color: $ti-text-3;
		white-space: nowrap;
	}
	.ac-count-n {
		font-size: 32rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.ac-next {
		flex: 1;
		height: 96rpx;
		line-height: 96rpx;
		text-align: center;
		border-radius: 999rpx;
		background: linear-gradient(135deg, #579292, #4A8282);
		color: #FFFFFF;
		font-size: 28rpx;
		font-weight: 800;
		letter-spacing: 3rpx;
		box-shadow: $shadow-primary;
	}
	.ac-next.disabled {
		opacity: 0.45;
		box-shadow: none;
	}

	/* 隐藏画布 */
	.ac-canvas {
		position: fixed;
		left: -2000px;
		top: 0;
		width: 750px;
		height: 938px;
	}

	/* ============ 版面微调 ============ */
	.ed {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		background: #F3EDDE;
		display: flex;
		flex-direction: column;
	}
	.ed-head {
		padding-bottom: 10rpx;
	}
	.ed-title {
		display: block;
		text-align: center;
		font-size: 32rpx;
		font-weight: 800;
		color: $ti-navy;
		letter-spacing: 2rpx;
	}
	/* 提示语: 紧跟标题下方, 一行说完 */
	.ed-sub {
		display: block;
		text-align: center;
		font-size: 21rpx;
		color: $ti-text-3;
		margin-top: 10rpx;
		letter-spacing: 1rpx;
	}
	.ed-stage {
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 14px;
		box-sizing: border-box;
	}
	.ed-card {
		position: relative;
		width: 600rpx;
		box-shadow: 0 24rpx 56rpx rgba(27, 59, 87, 0.24);
	}
	.ed-handle-slot {
		position: absolute;
		z-index: 12;
	}
	/* 文字把手: 未选中(free)=小标签, 选中(on)=虚线框可拖动; 同一元素只切样式 */
	.ed-handle {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		box-sizing: border-box;
		border: 3rpx dashed rgba(79, 139, 139, 0.85);
		border-radius: 8rpx;
		background: rgba(79, 139, 139, 0.08);
	}
	.s-date .ed-handle {
		border-radius: 50%;
	}
	.ed-handle.free {
		border-color: transparent;
		background: transparent;
	}
	.ed-tag {
		font-size: 18rpx;
		line-height: 1.4;
		color: #FFFFFF;
		background: $ti-primary;
		border-radius: 6rpx;
		padding: 2rpx 8rpx;
		white-space: nowrap;
	}
	/* 选中态: 标签浮在虚线框上沿 */
	.ed-handle.on .ed-tag {
		position: absolute;
		left: 0;
		top: -26rpx;
	}
	/* 未选中态: 标签即整个把手, 贴在锚点上 */
	.ed-handle.free .ed-tag {
		display: inline-block;
		padding: 6rpx 12rpx;
		box-shadow: 0 4rpx 10rpx rgba(27, 59, 87, 0.22);
	}
	/* 底部操作栏 */
	.ed-foot {
		padding: 0 32rpx calc(26rpx + env(safe-area-inset-bottom));
	}
	.ed-btns {
		display: flex;
		align-items: center;
		gap: 18rpx;
	}
	.ed-fbtn {
		height: 88rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26rpx;
		font-weight: 700;
	}
	.ed-fbtn.ghost {
		flex: 0 0 150rpx;
		background: #FFFFFF;
		color: $ti-text-3;
		box-shadow: $shadow-card;
	}
	.ed-fbtn.reset {
		flex: 1;
		background: transparent;
		color: $ti-text-3;
		font-size: 23rpx;
	}
	.ed-fbtn.pri {
		flex: 0 0 200rpx;
		background: linear-gradient(135deg, #579292, #4A8282);
		color: #FFFFFF;
		letter-spacing: 2rpx;
		box-shadow: $shadow-primary;
	}

	/* 成功弹层 */
	.ac-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(27, 59, 87, 0.45);
		z-index: 999;
		display: flex;
		align-items: flex-end;
	}
	.ac-sheet {
		width: 100%;
		background: #FFFDF7;
		border-radius: 56rpx 56rpx 0 0;
		padding: 24rpx 44rpx calc(40rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
		box-shadow: 0 -14rpx 40rpx rgba(27, 59, 87, 0.2);
	}
	.ac-grab {
		width: 80rpx;
		height: 8rpx;
		border-radius: 6rpx;
		background: #E3DCCB;
		margin: 0 auto 26rpx;
	}
	.ac-ok {
		width: 92rpx;
		height: 92rpx;
		border-radius: 50%;
		background: $ti-primary-mist;
		color: $ti-primary-deep;
		font-size: 44rpx;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
	}
	.ac-ok-title {
		display: block;
		text-align: center;
		font-size: 36rpx;
		font-weight: 800;
		color: $ti-navy;
		margin-top: 24rpx;
		letter-spacing: 2rpx;
	}
	.ac-ok-sub {
		display: block;
		text-align: center;
		font-size: 22rpx;
		color: $ti-text-3;
		margin-top: 12rpx;
	}
	.ac-res {
		display: flex;
		align-items: center;
		gap: 24rpx;
		background: #FFFFFF;
		border-radius: 32rpx;
		box-shadow: $shadow-card;
		padding: 20rpx;
		margin-top: 32rpx;
	}
	.ac-res-thumb {
		width: 104rpx;
		flex: 0 0 104rpx;
		border-radius: 8rpx;
		overflow: hidden;
	}
	.ac-res-info {
		flex: 1;
		min-width: 0;
	}
	.ac-res-title {
		display: block;
		font-size: 26rpx;
		font-weight: 800;
		color: $ti-navy;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ac-res-meta {
		display: block;
		font-size: 21rpx;
		color: $ti-text-3;
		margin-top: 8rpx;
	}
	.ac-res-stars {
		display: block;
		font-size: 21rpx;
		color: $ti-accent;
		letter-spacing: 3rpx;
		margin-top: 8rpx;
	}
	.ac-sheet-actions {
		display: flex;
		gap: 22rpx;
		margin-top: 30rpx;
	}
	.ac-sa {
		flex: 1;
		height: 92rpx;
		line-height: 92rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 26rpx;
		font-weight: 700;
	}
	.ac-sa.ghost {
		background: #FFFFFF;
		color: $ti-primary-deep;
		box-shadow: $shadow-card;
	}
	.ac-sa.pri {
		background: linear-gradient(135deg, #579292, #4A8282);
		color: #FFFFFF;
		box-shadow: $shadow-primary;
	}
	.ac-done {
		display: block;
		text-align: center;
		font-size: 24rpx;
		color: $ti-text-3;
		padding: 28rpx 0 6rpx;
	}
</style>
