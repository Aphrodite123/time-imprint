/**
 * 纪念照导出: 离屏 canvas 合成 750×938(4:5) 图片
 * 使用旧版 canvas 接口(createCanvasContext + canvasToTempFilePath), 三端通用
 */
import { photoRectsOf, templateOf, cardLevel, textPos, spaceOf, frameOf } from './album'

const W = 750
const H = 938
export const CARD_CANVAS_ID = 'cardCanvas'

// 各装帧的绘制参数
const THEMES = {
	book: {
		bg: '#FBF6E8', pad: 34, gap: 5, infoH: 168,
		title: '#2B2A26', sub: '#9A9184', star: '#F0995A',
		stamp: 'rgba(196,86,70,0.78)', frame: true, frameInset: 18, frameColor: '#D9C9A4'
	},
	polaroid: {
		bg: '#FFFFFF', pad: 26, gap: 5, infoH: 210,
		title: '#22201D', sub: '#9A9184', star: '#F0995A',
		stamp: 'rgba(217,106,91,0.72)', frame: false
	},
	film: {
		bg: '#2C2C2C', pad: 44, gap: 5, infoH: 150,
		title: '#F0C08A', sub: '#B08A62', star: '#F2A262',
		stamp: 'rgba(240,153,90,0.85)', frame: false
	},
	stamp: {
		bg: '#FFFFFF', pad: 52, gap: 5, infoH: 168,
		title: '#22201D', sub: '#9A9184', star: '#F0995A',
		stamp: 'rgba(196,86,70,0.72)', frame: true, frameInset: 22, frameColor: '#E5DCC8'
	},
	starburst: {
		bg: '#1B3048', pad: 34, gap: 5, infoH: 178,
		title: '#F3D9A8', sub: '#C9B08A', star: '#E8B96A',
		stamp: 'rgba(232,185,106,0.85)', frame: true, frameInset: 20, frameColor: 'rgba(232,185,106,0.42)'
	}
}

function loadImages(urls) {
	return Promise.all((urls || []).map(url => new Promise(resolve => {
		if (!url) return resolve(null)
		uni.getImageInfo({
			src: url,
			success: r => resolve({ path: r.path || url, w: r.width || 1, h: r.height || 1 }),
			fail: () => resolve({ path: url, w: 1, h: 1 })
		})
	})))
}

// aspectFill 裁切绘制
function drawCover(ctx, img, x, y, w, h) {
	if (!img || !img.path) {
		ctx.setFillStyle('rgba(27,59,87,0.06)')
		ctx.fillRect(x, y, w, h)
		return
	}
	const ir = img.w / img.h
	const tr = w / h
	let sx = 0
	let sy = 0
	let sw = img.w
	let sh = img.h
	if (ir > tr) {
		sw = img.h * tr
		sx = (img.w - sw) / 2
	} else {
		sh = img.w / tr
		sy = (img.h - sh) / 2
	}
	try {
		ctx.drawImage(img.path, sx, sy, sw, sh, x, y, w, h)
	} catch (e) {
		// 个别平台不支持九参数(裁切)绘制, 退化为拉伸
		try { ctx.drawImage(img.path, x, y, w, h) } catch (e2) {}
	}
}

function drawPhotos(ctx, imgs, area, layoutId, meta) {
	const n = Math.max(1, imgs.length)
	const rects = photoRectsOf(n, layoutId, meta)
	const gap = 4
	rects.forEach((r, i) => {
		const x = area.x + (area.w * r.x) / 100
		const y = area.y + (area.h * r.y) / 100
		const w = Math.max(1, (area.w * r.w) / 100 - gap)
		const h = Math.max(1, (area.h * r.h) / 100 - gap)
		drawCover(ctx, imgs[i], x + gap / 2, y + gap / 2, w, h)
	})
}

// 中文按字数估算截断(旧版 canvas 无 measureText)
function truncate(text, maxChars) {
	const t = String(text || '')
	return t.length > maxChars ? t.slice(0, maxChars - 1) + '…' : t
}

// 旧版 canvas 不支持字重, 用两次错位绘制模拟加粗
function drawBold(ctx, text, x, y) {
	ctx.fillText(text, x, y)
	ctx.fillText(text, x + 1, y)
}

function drawTexts(ctx, card, th) {
	const tplId = templateOf(card.template).id
	// 截断字数与 .pc-title/.pc-caption 的 64% 宽度上限一致(按新字号折算)
	const title = truncate((card.title || '一段闪闪发光的日子').trim(), 9)
	const caption = truncate((card.caption || '').trim(), 14)
	const level = cardLevel(card)

	// 标题(左对齐)
	const tp = textPos(tplId, 'title', card.meta)
	ctx.setTextAlign('left')
	ctx.setTextBaseline('middle')
	ctx.setFillStyle(th.title)
	ctx.setFontSize(49)
	drawBold(ctx, title, (W * tp.x) / 100, (H * tp.y) / 100)

	// 内容(左对齐)
	if (caption) {
		const cp = textPos(tplId, 'caption', card.meta)
		ctx.setFillStyle(th.sub)
		ctx.setFontSize(33)
		ctx.fillText(caption, (W * cp.x) / 100, (H * cp.y) / 100)
	}

	// 星级(右对齐, 位置可拖)
	const sp = textPos(tplId, 'stars', card.meta)
	ctx.setTextAlign('right')
	ctx.setTextBaseline('middle')
	ctx.setFillStyle(th.star)
	ctx.setFontSize(35)
	ctx.fillText('★'.repeat(level), (W * sp.x) / 100, (H * sp.y) / 100)
}

function drawStamp(ctx, card, th) {
	const date = card.eventDate || ''
	if (!date) return
	const year = date.slice(0, 4)
	const md = date.slice(5, 7) + ' · ' + date.slice(8, 10)
	const p = textPos(templateOf(card.template).id, 'date', card.meta)
	const r = 55
	const cx = (W * p.x) / 100
	const cy = (H * p.y) / 100

	ctx.save()
	ctx.translate(cx, cy)
	ctx.rotate(-12 * Math.PI / 180)
	ctx.setStrokeStyle(th.stamp)
	ctx.setLineWidth(3)
	ctx.beginPath()
	ctx.arc(0, 0, r, 0, Math.PI * 2)
	ctx.stroke()
	ctx.setTextAlign('center')
	ctx.setTextBaseline('middle')
	ctx.setFillStyle(th.stamp)
	ctx.setFontSize(26)
	ctx.fillText(year, 0, -13)
	ctx.setFontSize(16)
	ctx.fillText(md, 0, 15)
	ctx.restore()
}

function paint(ctx, card, imgs) {
	const tplId = templateOf(card.template).id
	const th = THEMES[tplId] || THEMES.polaroid

	// 背景
	if (tplId === 'starburst') {
		const g = ctx.createLinearGradient(0, 0, W, H)
		g.addColorStop(0, '#243A52')
		g.addColorStop(1, '#16283A')
		ctx.setFillStyle(g)
	} else {
		ctx.setFillStyle(th.bg)
	}
	ctx.fillRect(0, 0, W, H)

	// 内框
	if (th.frame) {
		ctx.setStrokeStyle(th.frameColor)
		ctx.setLineWidth(3)
		ctx.strokeRect(th.frameInset, th.frameInset, W - th.frameInset * 2, H - th.frameInset * 2)
	}

	// 胶片齿孔(顶部与信息区上方)
	if (tplId === 'film') {
		ctx.setFillStyle('#5A5A5A')
		const bottomY = H - (H * spaceOf(tplId, card.meta)) / 100 - 18
		for (let x = 12; x < W - 24; x += 36) {
			ctx.fillRect(x, 8, 20, 14)
			ctx.fillRect(x, bottomY, 20, 14)
		}
	}

	// 照片区: 底部留白与相框白边均可被用户拖动调整
	const space = spaceOf(tplId, card.meta)
	const fr = frameOf(tplId, card.meta)
	const baseW = W - th.pad * 2
	const baseH = H - th.pad - (H * space) / 100
	const area = {
		x: th.pad + (baseW * fr.left) / 100,
		y: th.pad + (baseH * fr.top) / 100,
		w: baseW * (1 - (fr.left + fr.right) / 100),
		h: baseH * (1 - fr.top / 100)
	}
	drawPhotos(ctx, imgs, area, card.layout, card.meta)

	drawTexts(ctx, card, th)
	drawStamp(ctx, card, th)
}

/**
 * 导出一张纪念照为图片
 * @param {Object} card { template, title, caption, eventDate, level, images }
 * @param {String} canvasId 页面内 canvas 的 canvas-id
 * @param {Object} owner 页面/组件实例(canvas 上下文归属)
 * @returns {Promise<String>} 临时文件路径
 */
export function exportCardImage(card, canvasId, owner) {
	return loadImages(card.images || []).then(imgs => new Promise((resolve, reject) => {
		let ctx
		try {
			ctx = uni.createCanvasContext(canvasId || CARD_CANVAS_ID, owner)
		} catch (e) {
			return reject(new Error('画布初始化失败'))
		}
		paint(ctx, card, imgs)
		ctx.draw(false, () => {
			// 部分平台 draw 回调早于渲染完成, 稍候再导出
			setTimeout(() => {
				uni.canvasToTempFilePath({
					canvasId: canvasId || CARD_CANVAS_ID,
					x: 0,
					y: 0,
					width: W,
					height: H,
					destWidth: W,
					destHeight: H,
					success: res => resolve(res.tempFilePath),
					fail: e => reject(new Error((e && e.errMsg) || '生成图片失败'))
				}, owner)
			}, 150)
		})
	}))
}

/**
 * 保存图片到相册(H5 无相册能力, 交由调用方预览长按保存)
 */
export function saveImageToAlbum(filePath) {
	return new Promise((resolve, reject) => {
		// #ifdef H5
		resolve(false)
		// #endif
		// #ifndef H5
		uni.saveImageToPhotosAlbum({
			filePath,
			success: () => resolve(true),
			fail: e => {
				const msg = (e && e.errMsg) || ''
				if (/auth|deny|permission/i.test(msg)) {
					return reject(new Error('未获得相册权限，请在设置中开启后重试'))
				}
				reject(new Error('保存失败，请重试'))
			}
		})
		// #endif
	})
}
