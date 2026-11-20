/**
 * 高光纪念册规则: 装帧模板、版式排布、年度分册
 * 星级沿用 utils/highlight 的 1~5 星体系
 */
import { levelOf, MAX_HL_LEVEL } from './highlight'

// 装帧模板(与 UI 高保真原型一一对应)
export const TEMPLATES = [
	{ id: 'book', name: '旧书页', desc: '米杏纸底与细线框，像夹进书里的一页', minLevel: 1 },
	{ id: 'polaroid', name: '拍立得', desc: '宽白边与手写标题，像刚洗出来的相纸', minLevel: 1 },
	{ id: 'film', name: '胶片', desc: '齿孔与橙色日期码，留住胶片的颗粒感', minLevel: 1 },
	{ id: 'stamp', name: '邮票', desc: '齿孔边与邮戳，把这一刻寄给未来', minLevel: 4 },
	{ id: 'starburst', name: '星芒', desc: '藏蓝底与金色星点，只留给一生珍藏', minLevel: 5 }
]

export const MIN_CARDS = 1
export const MAX_CARDS = 9

export function templateOf(id) {
	return TEMPLATES.find(t => t.id === id) || TEMPLATES[1]
}

/**
 * 某张纪念照的星级(照片表字段为 level, 归一化到 1~5)
 */
export function cardLevel(card) {
	return levelOf({ highlightLevel: card && card.level })
}

/**
 * 某套装帧是否已解锁
 */
export function isTemplateLocked(id, level) {
	const t = templateOf(id)
	return cardLevel({ level }) < t.minLevel
}

/**
 * 版式: 返回每行的照片数; 7/8 张为主图 + 小图
 * 例: 5 -> [2,3]; 8 -> [1,4,3]
 */
export function rowsOf(count) {
	const n = Math.max(1, Math.min(MAX_CARDS, Number(count) || 1))
	const map = {
		1: [1],
		2: [2],
		3: [1, 2],
		4: [2, 2],
		5: [2, 3],
		6: [2, 2, 2],
		7: [1, 3, 3],
		8: [1, 4, 3],
		9: [3, 3, 3]
	}
	return map[n]
}

/* ==================== 手动版式 ====================
 * 统一使用 12 × 12 网格, cells 为 [列, 行, 列跨, 行跨](均从 1 开始)
 * counts 声明该版式适用的照片张数; auto 表示按张数自动排布
 */
export const LAYOUTS = [
	{ id: 'auto', name: '自动', desc: '按张数自动排布', auto: true, counts: [1, 2, 3, 4, 5, 6, 7, 8, 9] },

	// 1 张
	{ id: 'single-inset', name: '留白单幅', desc: '四周留出相纸边', counts: [1], cells: [[2, 2, 8, 8]] },

	// 2 张
	{ id: 'duo-v', name: '左右双联', desc: '两幅等分并排', counts: [2], cells: [[1, 1, 6, 12], [7, 1, 6, 12]] },
	{ id: 'duo-h', name: '上下双联', desc: '两幅上下叠放', counts: [2], cells: [[1, 1, 12, 6], [1, 7, 12, 6]] },
	{ id: 'duo-wide', name: '左大右窄', desc: '竖构图双联', counts: [2], cells: [[1, 1, 8, 12], [9, 1, 4, 12]] },

	// 3 张
	{ id: 'tri-main-bottom', name: '上大下二', desc: '主图在上，两幅并排', counts: [3], cells: [[1, 1, 12, 8], [1, 9, 6, 4], [7, 9, 6, 4]] },
	{ id: 'tri-main-right', name: '左大右二', desc: '主图在左，右列两幅', counts: [3], cells: [[1, 1, 8, 12], [9, 1, 4, 6], [9, 7, 4, 6]] },
	{ id: 'tri-cols', name: '三列并排', desc: '竖条三连', counts: [3], cells: [[1, 1, 4, 12], [5, 1, 4, 12], [9, 1, 4, 12]] },

	// 4 张
	{ id: 'quad', name: '田字格', desc: '经典四宫格', counts: [4], cells: [[1, 1, 6, 6], [7, 1, 6, 6], [1, 7, 6, 6], [7, 7, 6, 6]] },
	{ id: 'quad-main-top', name: '上大下三', desc: '主图在上，三幅并列', counts: [4], cells: [[1, 1, 12, 7], [1, 8, 4, 5], [5, 8, 4, 5], [9, 8, 4, 5]] },
	{ id: 'quad-main-left', name: '左大右三', desc: '主图在左，右列三幅', counts: [4], cells: [[1, 1, 8, 12], [9, 1, 4, 4], [9, 5, 4, 4], [9, 9, 4, 4]] },
	{ id: 'quad-cols', name: '四列条', desc: '四条竖幅并排', counts: [4], cells: [[1, 1, 3, 12], [4, 1, 3, 12], [7, 1, 3, 12], [10, 1, 3, 12]] },
	{ id: 'quad-offset', name: '错落四格', desc: '大小交错的拼贴', counts: [4], cells: [[1, 1, 5, 6], [6, 1, 7, 6], [1, 7, 7, 6], [8, 7, 5, 6]] },

	// 5 张
	{ id: 'five-2-3', name: '上二下三', desc: '上行两幅，下行三幅', counts: [5], cells: [[1, 1, 6, 6], [7, 1, 6, 6], [1, 7, 4, 6], [5, 7, 4, 6], [9, 7, 4, 6]] },
	{ id: 'five-main', name: '主图 + 四', desc: '上方主图，下方四连', counts: [5], cells: [[1, 1, 12, 7], [1, 8, 3, 5], [4, 8, 3, 5], [7, 8, 3, 5], [10, 8, 3, 5]] },
	{ id: 'five-mosaic', name: '错落五格', desc: '主图与四幅错落拼贴', counts: [5], cells: [[1, 1, 7, 7], [8, 1, 5, 4], [8, 5, 5, 3], [1, 8, 6, 5], [7, 8, 6, 5]] },

	// 6 张
	{ id: 'six-2x3', name: '两列三行', desc: '规整的六宫格', counts: [6], cells: [[1, 1, 6, 4], [7, 1, 6, 4], [1, 5, 6, 4], [7, 5, 6, 4], [1, 9, 6, 4], [7, 9, 6, 4]] },
	{ id: 'six-3x2', name: '三列两行', desc: '横向排布六幅', counts: [6], cells: [[1, 1, 4, 6], [5, 1, 4, 6], [9, 1, 4, 6], [1, 7, 4, 6], [5, 7, 4, 6], [9, 7, 4, 6]] },
	{ id: 'six-mosaic', name: '错落六格', desc: '一大五小的拼贴', counts: [6], cells: [[1, 1, 7, 7], [8, 1, 5, 4], [8, 5, 5, 3], [1, 8, 4, 5], [5, 8, 4, 5], [9, 8, 4, 5]] },

	// 7 张
	{ id: 'seven-main', name: '主图 + 六', desc: '上方主图，下方六连', counts: [7], cells: [[1, 1, 12, 6], [1, 7, 4, 3], [5, 7, 4, 3], [9, 7, 4, 3], [1, 10, 4, 3], [5, 10, 4, 3], [9, 10, 4, 3]] },
	{ id: 'seven-mosaic', name: '错落七格', desc: '双主图 + 五幅小图', counts: [7], cells: [[1, 1, 6, 6], [7, 1, 6, 6], [1, 7, 4, 3], [5, 7, 4, 3], [9, 7, 4, 3], [1, 10, 6, 3], [7, 10, 6, 3]] },

	// 8 张
	{ id: 'eight-grid', name: '四列两行', desc: '规整的八宫格', counts: [8], cells: [[1, 1, 3, 6], [4, 1, 3, 6], [7, 1, 3, 6], [10, 1, 3, 6], [1, 7, 3, 6], [4, 7, 3, 6], [7, 7, 3, 6], [10, 7, 3, 6]] },
	{ id: 'eight-main', name: '主图 + 七', desc: '上方主图，下方七连', counts: [8], cells: [[1, 1, 12, 6], [1, 7, 4, 3], [5, 7, 4, 3], [9, 7, 4, 3], [1, 10, 3, 3], [4, 10, 3, 3], [7, 10, 3, 3], [10, 10, 3, 3]] },

	// 9 张
	{ id: 'nine-grid', name: '九宫格', desc: '经典 3 × 3', counts: [9], cells: [[1, 1, 4, 4], [5, 1, 4, 4], [9, 1, 4, 4], [1, 5, 4, 4], [5, 5, 4, 4], [9, 5, 4, 4], [1, 9, 4, 4], [5, 9, 4, 4], [9, 9, 4, 4]] },
	{ id: 'nine-mosaic', name: '主图 + 八', desc: '一大八小的拼贴', counts: [9], cells: [[1, 1, 6, 6], [7, 1, 6, 3], [7, 4, 6, 3], [1, 7, 4, 3], [5, 7, 4, 3], [9, 7, 4, 3], [1, 10, 4, 3], [5, 10, 4, 3], [9, 10, 4, 3]] }
]

export function layoutOf(id) {
	return LAYOUTS.find(l => l.id === id) || LAYOUTS[0]
}

/* ==================== 落款元素位置 ====================
 * 标题/内容/日期/星级默认以「卡片百分比」定位, 可在微调模式里自由拖动
 * anchor: left 左对齐 / right 右对齐 / center 居中(以该点为中心)
 */
export const TEXT_FIELDS = [
	{ key: 'title', name: '标题' },
	{ key: 'caption', name: '内容' },
	{ key: 'date', name: '日期' },
	{ key: 'stars', name: '星级' }
]

export const TEXT_DEFAULTS = {
	book: {
		title: { x: 7, y: 86, anchor: 'left' },
		caption: { x: 7, y: 92, anchor: 'left' },
		stars: { x: 93, y: 86, anchor: 'right' },
		date: { x: 82, y: 74, anchor: 'center' }
	},
	polaroid: {
		title: { x: 7, y: 82, anchor: 'left' },
		caption: { x: 7, y: 88, anchor: 'left' },
		stars: { x: 93, y: 82, anchor: 'right' },
		date: { x: 82, y: 70, anchor: 'center' }
	},
	film: {
		title: { x: 7, y: 88, anchor: 'left' },
		caption: { x: 7, y: 94, anchor: 'left' },
		stars: { x: 93, y: 88, anchor: 'right' },
		date: { x: 82, y: 76, anchor: 'center' }
	},
	stamp: {
		title: { x: 7, y: 86, anchor: 'left' },
		caption: { x: 7, y: 92, anchor: 'left' },
		stars: { x: 93, y: 86, anchor: 'right' },
		date: { x: 82, y: 74, anchor: 'center' }
	},
	starburst: {
		title: { x: 7, y: 85, anchor: 'left' },
		caption: { x: 7, y: 91, anchor: 'left' },
		stars: { x: 93, y: 85, anchor: 'right' },
		date: { x: 82, y: 73, anchor: 'center' }
	}
}

// 位置合法性: meta 里存的是百分比, 越界或非法值回退默认
function validPos(v) {
	return v && typeof v.x === 'number' && typeof v.y === 'number' &&
		isFinite(v.x) && isFinite(v.y)
}

/**
 * 取某个落款元素的最终位置
 * @param {String} template 装帧 id
 * @param {String} field title | caption | date | stars
 * @param {Object} meta 卡片自定义位置 { field: {x,y} }
 */
export function textPos(template, field, meta) {
	const tpl = TEXT_DEFAULTS[template] ? template : 'polaroid'
	const def = TEXT_DEFAULTS[tpl][field]
	const custom = meta && validPos(meta[field]) ? meta[field] : null
	return {
		x: custom ? Math.max(2, Math.min(98, custom.x)) : def.x,
		y: custom ? Math.max(4, Math.min(96, custom.y)) : def.y,
		anchor: def.anchor
	}
}

/**
 * 该装帧下是否有自定义位置(有任何一项被拖过)
 */
export function hasCustomPos(meta) {
	if (!meta) return false
	return TEXT_FIELDS.some(f => validPos(meta[f.key]))
}

/* ==================== 底部留白区 ====================
 * 照片区下方留给落款的留白高度(卡片高度百分比), 可在微调模式拖动边界调整
 */
export const DEFAULT_SPACE = {
	book: 18,
	polaroid: 22,
	film: 16,
	stamp: 18,
	starburst: 19
}

export function spaceOf(template, meta) {
	const tpl = DEFAULT_SPACE[template] ? template : 'polaroid'
	const custom = meta && meta.space
	const v = typeof custom === 'number' && isFinite(custom) ? custom : DEFAULT_SPACE[tpl]
	return Math.max(0, Math.min(60, v))
}

/* ==================== 相框边距 ====================
 * 照片区四周白边(相框)的厚度, 占照片区宽/高的百分比
 * 微调模式拖动边框圆点调整, 导出画布与预览共用同一套换算
 * 负值表示吃掉装帧自带的基础留白, 拉到下限即照片贴住卡片边缘
 * (下限按导出画布的内边距占比推导, 预览超出部分由卡片裁掉, 两端都能精确贴边)
 */
export const FRAME_MAX = 24

export const FRAME_FLOOR = {
	book: { left: -5, right: -5, top: -4.6 },
	polaroid: { left: -3.7, right: -3.7, top: -3.7 },
	film: { left: -6.6, right: -6.6, top: -5.9 },
	stamp: { left: -8, right: -8, top: -7.2 },
	starburst: { left: -5, right: -5, top: -4.7 }
}

export function frameOf(template, meta) {
	const tpl = DEFAULT_SPACE[template] ? template : 'polaroid'
	const floor = FRAME_FLOOR[tpl] || FRAME_FLOOR.polaroid
	const f = (meta && meta.frame) || {}
	const num = (v, min) => (typeof v === 'number' && isFinite(v) ? Math.max(min, Math.min(FRAME_MAX, v)) : 0)
	return {
		left: num(f.left, floor.left),
		right: num(f.right, floor.right),
		top: num(f.top, floor.top)
	}
}

/* ==================== 单张照片的位置与大小 ====================
 * 每张照片在照片区内的矩形(百分比 0~100): {x, y, w, h}
 * 默认由版式的 12×12 网格换算, 用户可在微调模式逐张拖动/缩放
 */
function validRect(r) {
	return r && typeof r.x === 'number' && typeof r.y === 'number' &&
		typeof r.w === 'number' && typeof r.h === 'number' &&
		isFinite(r.x) && isFinite(r.y) && isFinite(r.w) && isFinite(r.h)
}

export function clampRect(r) {
	const w = Math.max(8, Math.min(100, r.w))
	const h = Math.max(8, Math.min(100, r.h))
	return {
		x: Math.max(0, Math.min(100 - w, r.x)),
		y: Math.max(0, Math.min(100 - h, r.y)),
		w,
		h
	}
}

// 版式对应的默认矩形
export function defaultPhotoRects(count, layoutId) {
	return cellsOf(count, layoutId).map(c => ({
		x: ((c.c - 1) / 12) * 100,
		y: ((c.r - 1) / 12) * 100,
		w: (c.cs / 12) * 100,
		h: (c.rs / 12) * 100
	}))
}

/**
 * 取某张卡片每张照片的矩形: 用户自定义优先, 数量/数据不合法时回退版式默认
 */
export function photoRectsOf(count, layoutId, meta) {
	const defs = defaultPhotoRects(count, layoutId)
	const custom = meta && Array.isArray(meta.photoRects) ? meta.photoRects : null
	if (!custom || custom.length !== defs.length) return defs
	return custom.map((r, i) => (validRect(r) ? clampRect(r) : defs[i]))
}

/**
 * 版式单元格指纹, 用于判断命名版式是否与自动版式一致
 */
function cellKey(list) {
	return list
		.map(c => (Array.isArray(c) ? c.join(',') : [c.c, c.r, c.cs, c.rs].join(',')))
		.sort()
		.join('|')
}

/**
 * 当前张数可选的版式(自动 + 对应张数的命名版式)
 * 与自动排布完全一致的命名版式不重复展示, 避免选项冗余
 */
export function layoutsFor(count) {
	const n = Math.max(1, Math.min(MAX_CARDS, Number(count) || 1))
	const baseline = cellKey(autoCells(n))
	return LAYOUTS.filter(l => {
		if (l.auto) return true
		if (!l.counts.includes(n)) return false
		return cellKey(l.cells) !== baseline
	})
}

// 自动版式: 由行分布换算成 12×12 网格
function autoCells(count) {
	const rows = rowsOf(count)
	const flex = rowFlexes(count)
	const total = flex.reduce((a, b) => a + b, 0)
	const bounds = []
	let acc = 0
	for (const w of flex) {
		acc += w
		bounds.push(Math.round((12 * acc) / total))
	}
	let row = 1
	const cells = []
	rows.forEach((n, ri) => {
		const rs = bounds[ri] - (ri ? bounds[ri - 1] : 0)
		const cs = 12 / n
		for (let i = 0; i < n; i++) {
			cells.push({ c: 1 + i * cs, r: row, cs, rs })
		}
		row += rs
	})
	return cells
}

/**
 * 取某个张数 + 版式下的单元格
 * @param {Number} count 照片张数
 * @param {String} layoutId 版式 id; 为空/auto/不适用时回退自动
 * @returns {Array<{c:Number,r:Number,cs:Number,rs:Number}>}
 */
export function cellsOf(count, layoutId) {
	const n = Math.max(1, Math.min(MAX_CARDS, Number(count) || 1))
	const l = LAYOUTS.find(x => x.id === layoutId)
	if (l && !l.auto && l.cells && l.counts.includes(n)) {
		return l.cells.map(([c, r, cs, rs]) => ({ c, r, cs, rs }))
	}
	return autoCells(n)
}

/**
 * 各行高度权重: 主图行更高
 */
export function rowFlexes(count) {
	const rows = rowsOf(count)
	const n = rows.length
	return rows.map((cells, i) => {
		// 3/7/8 张的第一行是主图, 给更高权重
		const main = (count === 3 || count === 7 || count === 8) && i === 0 && rows.length > 1
		return main ? 1.6 : 1
	})
}

/**
 * 按年份分册, 年份倒序; 每册封面取星级最高的一张
 */
export function groupByYear(cards) {
	const map = {}
	for (const c of cards) {
		const y = String(c.eventDate || '').slice(0, 4) || '未知'
		if (!map[y]) map[y] = []
		map[y].push(c)
	}
	return Object.keys(map)
		.sort((a, b) => b.localeCompare(a))
		.map(year => {
			const list = map[year].slice().sort((a, b) =>
				(b.eventDate || '').localeCompare(a.eventDate || '') ||
				(b.createdAt || 0) - (a.createdAt || 0)
			)
			let cover = list[0]
			for (const c of list) {
				if (cardLevel(c) > cardLevel(cover)) cover = c
			}
			return {
				year,
				cards: list,
				cover,
				count: list.length,
				lastDate: list[0] ? list[0].eventDate : ''
			}
		})
}

export { MAX_HL_LEVEL }
