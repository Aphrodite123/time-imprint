/**
 * 本地存储抽象层
 * App 端使用 plus.sqlite(SQLite),小程序/H5 端降级为 storage JSON 存储
 * 数据表依据 PRD 3.6 核心数据模型
 */

const DB_NAME = 'timeimprint'
const STORE_PREFIX = 'ti_db_'

// 建表语句(App 端 SQLite)
const TABLE_SQLS = [
	`CREATE TABLE IF NOT EXISTS user (userId TEXT PRIMARY KEY, nickname TEXT, avatar TEXT, birthDate TEXT, gender TEXT, status TEXT, createdAt INTEGER, updatedAt INTEGER)`,
	`CREATE TABLE IF NOT EXISTS memory (memoryId TEXT PRIMARY KEY, userId TEXT, eventDate TEXT, title TEXT, content TEXT, emotion TEXT, lifeStage TEXT, isHighlight INTEGER DEFAULT 0, isFavorite INTEGER DEFAULT 0, isArchived INTEGER DEFAULT 0, createdAt INTEGER, updatedAt INTEGER)`,
	`CREATE TABLE IF NOT EXISTS media (mediaId TEXT PRIMARY KEY, memoryId TEXT, type TEXT, url TEXT, thumbnailUrl TEXT, duration REAL, sort INTEGER, createdAt INTEGER)`,
	`CREATE TABLE IF NOT EXISTS highlight (highlightId TEXT PRIMARY KEY, userId TEXT, memoryId TEXT, highlightTitle TEXT, createdAt INTEGER)`,
	`CREATE TABLE IF NOT EXISTS growth_comparison (comparisonId TEXT PRIMARY KEY, userId TEXT, firstDate TEXT, secondDate TEXT, summary TEXT, createdAt INTEGER)`
]

const IS_APP = typeof plus !== 'undefined' && !!plus.sqlite

// SQL 字符串字面量转义
function esc(v) {
	if (v === null || v === undefined) return 'NULL'
	if (typeof v === 'number') return String(v)
	return `'${String(v).replace(/'/g, "''")}'`
}

// 对象 -> INSERT SQL
function insertSql(table, obj) {
	const keys = Object.keys(obj)
	const vals = keys.map(k => esc(obj[k]))
	return `INSERT INTO ${table} (${keys.join(',')}) VALUES (${vals.join(',')})`
}

// 对象 -> UPDATE SQL
function updateSql(table, obj, where) {
	const sets = Object.keys(obj).map(k => `${k}=${esc(obj[k])}`).join(',')
	return `UPDATE ${table} SET ${sets} WHERE ${where}`
}

/* ==================== App 端 SQLite 实现 ==================== */
async function appExec(sql) {
	return new Promise((resolve, reject) => {
		plus.sqlite.executeSql({ name: DB_NAME, sql, success: resolve, fail: e => reject(e) })
	})
}

async function appSelect(sql) {
	return new Promise((resolve, reject) => {
		plus.sqlite.selectSql({ name: DB_NAME, sql, success: r => resolve(r || []), fail: e => reject(e) })
	})
}

/* ==================== Storage 端实现 ==================== */
function loadTable(table) {
	try {
		return uni.getStorageSync(STORE_PREFIX + table) || []
	} catch (e) {
		return []
	}
}

function saveTable(table, rows) {
	uni.setStorageSync(STORE_PREFIX + table, rows)
}

function storageInsert(table, obj) {
	const rows = loadTable(table)
	rows.push(obj)
	saveTable(table, rows)
}

function storageUpdate(table, obj, keyName, keyValue) {
	const rows = loadTable(table)
	const idx = rows.findIndex(r => r[keyName] === keyValue)
	if (idx > -1) rows[idx] = Object.assign({}, rows[idx], obj)
	saveTable(table, rows)
}

function storageDelete(table, keyName, keyValue) {
	saveTable(table, loadTable(table).filter(r => r[keyName] !== keyValue))
}

/* ==================== 统一 CRUD ==================== */
export async function initDB() {
	if (IS_APP) {
		await new Promise((resolve, reject) => {
			plus.sqlite.openDatabase({
				name: DB_NAME,
				path: '_doc/timeimprint.db',
				success: resolve,
				fail: e => reject(e)
			})
		})
		for (const sql of TABLE_SQLS) await appExec(sql)
		// 旧库升级: 补建收藏字段(字段已存在时报错, 忽略即可)
		try {
			await appExec('ALTER TABLE memory ADD COLUMN isFavorite INTEGER DEFAULT 0')
		} catch (e) {}
	}
}

async function dbInsert(table, obj) {
	if (IS_APP) return appExec(insertSql(table, obj))
	storageInsert(table, obj)
}

async function dbUpdate(table, obj, keyName, keyValue) {
	if (IS_APP) return appExec(updateSql(table, obj, `${keyName}=${esc(keyValue)}`))
	storageUpdate(table, obj, keyName, keyValue)
}

async function dbDelete(table, keyName, keyValue) {
	if (IS_APP) return appExec(`DELETE FROM ${table} WHERE ${keyName}=${esc(keyValue)}`)
	storageDelete(table, keyName, keyValue)
}

async function dbSelect(table, where) {
	if (IS_APP) {
		const sql = `SELECT * FROM ${table}${where ? ' WHERE ' + where : ''}`
		return appSelect(sql)
	}
	let rows = loadTable(table)
	if (where) {
		// 简易 where 解析:仅支持 AND 连接的 "key=value" 形式(内部数据,值已经过拼接方转义)
		const conds = where.split(' AND ').map(s => s.trim()).filter(Boolean)
		rows = rows.filter(r => conds.every(c => {
			const m = c.match(/^(\w+)=(.+)$/)
			if (!m) return true
			const [, k, raw] = m
			let v = raw.replace(/^'|'$/g, '').replace(/''/g, "'")
			return String(r[k]) === String(v)
		}))
	}
	return rows
}

function genId() {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/* ==================== 用户 ==================== */
export async function getUser() {
	const rows = await dbSelect('user')
	return rows[0] || null
}

export async function saveUser(data) {
	const now = Date.now()
	const old = await getUser()
	if (old) {
		await dbUpdate('user', Object.assign({}, data, { updatedAt: now }), 'userId', old.userId)
	} else {
		const user = Object.assign({ userId: genId(), createdAt: now, updatedAt: now }, data)
		await dbInsert('user', user)
	}
	return getUser()
}

/* ==================== 时光印记 ==================== */
export async function addMemory(data) {
	const now = Date.now()
	const m = Object.assign({
		memoryId: genId(),
		userId: '',
		title: '',
		content: '',
		emotion: '',
		lifeStage: '',
		isHighlight: 0,
		isFavorite: 0,
		isArchived: 0,
		createdAt: now,
		updatedAt: now
	}, data)
	await dbInsert('memory', m)
	return m
}

export async function updateMemory(memoryId, data) {
	await dbUpdate('memory', Object.assign({}, data, { updatedAt: Date.now() }), 'memoryId', memoryId)
}

export async function deleteMemory(memoryId) {
	// 删除记录及其关联媒体、高光
	const medias = await dbSelect('media', `memoryId=${esc(memoryId)}`)
	for (const md of medias) await dbDelete('media', 'mediaId', md.mediaId)
	await dbDelete('highlight', 'memoryId', memoryId)
	await dbDelete('memory', 'memoryId', memoryId)
}

export async function getMemory(memoryId) {
	const rows = await dbSelect('memory', `memoryId=${esc(memoryId)}`)
	if (!rows.length) return null
	const medias = await dbSelect('media', `memoryId=${esc(memoryId)}`)
	medias.sort((a, b) => (a.sort || 0) - (b.sort || 0))
	return Object.assign(rows[0], { medias })
}

/**
 * 批量查询媒体并按 memoryId 分组(避免 N+1 查询)
 */
async function mediaMapByMemoryIds(ids) {
	if (!ids.length) return {}
	const idList = ids.map(esc).join(',')
	let medias
	if (IS_APP) {
		medias = await appSelect(`SELECT * FROM media WHERE memoryId IN (${idList})`)
	} else {
		medias = loadTable('media').filter(m => ids.includes(m.memoryId))
	}
	const map = {}
	for (const m of medias) {
		if (!map[m.memoryId]) map[m.memoryId] = []
		map[m.memoryId].push(m)
	}
	for (const k of Object.keys(map)) {
		map[k].sort((a, b) => (a.sort || 0) - (b.sort || 0))
	}
	return map
}

function attachMedias(rows, map) {
	for (const r of rows) r.medias = map[r.memoryId] || []
	return rows
}

/**
 * 分页查询印记列表(按发生日期升序,呈现成长轨迹)
 * @param {Object} opt {offset, limit, year, stage, highlightOnly, includeArchived, noMedia}
 */
export async function listMemories(opt = {}) {
	const { offset = 0, limit = 20, year, stage, highlightOnly, includeArchived = true, noMedia = false } = opt
	let rows
	if (IS_APP) {
		const conds = []
		if (year) conds.push(`eventDate LIKE '${year}-%'`)
		if (stage) conds.push(`lifeStage='${stage}'`)
		if (highlightOnly) conds.push('isHighlight=1')
		if (!includeArchived) conds.push('isArchived=0')
		const where = conds.length ? ' WHERE ' + conds.join(' AND ') : ''
		rows = await appSelect(`SELECT * FROM memory${where} ORDER BY eventDate ASC, createdAt ASC LIMIT ${limit} OFFSET ${offset}`)
	} else {
		rows = await dbSelect('memory')
		rows = rows.filter(r => {
			if (year && !String(r.eventDate || '').startsWith(year + '-')) return false
			if (stage && r.lifeStage !== stage) return false
			if (highlightOnly && !r.isHighlight) return false
			if (!includeArchived && r.isArchived) return false
			return true
		})
		rows.sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || '') || (a.createdAt || 0) - (b.createdAt || 0))
		rows = rows.slice(offset, offset + limit)
	}
	if (noMedia) return rows
	const map = await mediaMapByMemoryIds(rows.map(r => r.memoryId))
	return attachMedias(rows, map)
}

export async function listMemoriesByRange(startDate, endDate) {
	// 查询某日期区间(含端点)的记录,用于成长对比/日历回看
	let rows
	if (IS_APP) {
		rows = await appSelect(`SELECT * FROM memory WHERE eventDate >= ${esc(startDate)} AND eventDate <= ${esc(endDate)} ORDER BY eventDate ASC`)
	} else {
		rows = (await dbSelect('memory')).filter(r => r.eventDate >= startDate && r.eventDate <= endDate)
		rows.sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''))
	}
	const map = await mediaMapByMemoryIds(rows.map(r => r.memoryId))
	return attachMedias(rows, map)
}

export async function countMemories() {
	if (IS_APP) {
		const rows = await appSelect('SELECT COUNT(*) AS c FROM memory')
		return rows[0] ? rows[0].c : 0
	}
	return loadTable('memory').length
}

/* ==================== 媒体资源 ==================== */
export async function addMedia(data) {
	const m = Object.assign({
		mediaId: genId(),
		type: 'image',
		url: '',
		thumbnailUrl: '',
		duration: 0,
		sort: 0,
		createdAt: Date.now()
	}, data)
	await dbInsert('media', m)
	return m
}

export async function deleteMedia(mediaId) {
	await dbDelete('media', 'mediaId', mediaId)
}

/* ==================== 高光 ==================== */
/**
 * 标记/取消高光:同步 memory.isHighlight 与 highlight 子表
 */
export async function setHighlight(memoryId, on, title) {
	await dbUpdate('memory', { isHighlight: on ? 1 : 0, updatedAt: Date.now() }, 'memoryId', memoryId)
	if (on) {
		const exists = await dbSelect('highlight', `memoryId=${esc(memoryId)}`)
		if (!exists.length) {
			await dbInsert('highlight', {
				highlightId: genId(),
				userId: '',
				memoryId,
				highlightTitle: title || '',
				createdAt: Date.now()
			})
		}
		} else {
			await dbDelete('highlight', 'memoryId', memoryId)
		}
	}

	/* ==================== 收藏 ==================== */
	/**
	 * 标记/取消收藏(独立于高光)
	 */
	export async function setFavorite(memoryId, on) {
		await dbUpdate('memory', { isFavorite: on ? 1 : 0, updatedAt: Date.now() }, 'memoryId', memoryId)
	}

	/* ==================== 成长对比 ==================== */
export async function addComparison(data) {
	const c = Object.assign({ comparisonId: genId(), userId: '', summary: '', createdAt: Date.now() }, data)
	await dbInsert('growth_comparison', c)
	return c
}

export async function listComparisons() {
	const rows = await dbSelect('growth_comparison')
	rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
	return rows
}

/* ==================== 统计 ==================== */
/**
 * 成长快照统计:总印记、照片、语音、情绪标签
 */
export async function getStats() {
	if (IS_APP) {
		const memoryRows = await appSelect('SELECT COUNT(*) AS total, SUM(isHighlight) AS highlights FROM memory')
		const mediaRows = await appSelect(`SELECT type, COUNT(*) AS c FROM media GROUP BY type`)
		const emotionRows = await appSelect(`SELECT emotion, COUNT(*) AS c FROM memory WHERE emotion IS NOT NULL AND emotion != '' GROUP BY emotion`)
		const total = memoryRows[0] ? memoryRows[0].total : 0
		const highlights = memoryRows[0] && memoryRows[0].highlights ? memoryRows[0].highlights : 0
		const media = { image: 0, video: 0, voice: 0 }
		for (const r of mediaRows) media[r.type] = r.c
		const emotions = {}
		for (const r of emotionRows) emotions[r.emotion] = r.c
		return { total, highlights, images: media.image, videos: media.video, voices: media.voice, emotions }
	}
	const memories = loadTable('memory')
	const medias = loadTable('media')
	const emotions = {}
	for (const m of memories) if (m.emotion) emotions[m.emotion] = (emotions[m.emotion] || 0) + 1
	return {
		total: memories.length,
		highlights: memories.filter(m => m.isHighlight).length,
		images: medias.filter(m => m.type === 'image').length,
		videos: medias.filter(m => m.type === 'video').length,
		voices: medias.filter(m => m.type === 'voice').length,
		emotions
	}
}

/* ==================== 备份与清空 ==================== */
export async function exportAll() {
	// 全量数据导出(备份/回忆录用)
	return {
		user: await getUser(),
		memories: loadAllMemoriesRaw(),
		medias: await dbSelect('media'),
		highlights: await dbSelect('highlight'),
		comparisons: await dbSelect('growth_comparison')
	}
}

function loadAllMemoriesRaw() {
	if (IS_APP) {
		return appSelect('SELECT * FROM memory ORDER BY eventDate ASC')
	}
	const rows = loadTable('memory')
	rows.sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''))
	return rows
}

export async function importAll(data) {
	// 恢复备份:整表覆盖
	if (!data || !data.memories) throw new Error('备份文件格式不正确')
	const tables = ['user', 'memory', 'media', 'highlight', 'growth_comparison']
	const payloads = {
		user: data.user ? [data.user] : [],
		memory: data.memories || [],
		media: data.medias || [],
		highlight: data.highlights || [],
		growth_comparison: data.comparisons || []
	}
	if (IS_APP) {
		for (const t of tables) await appExec(`DELETE FROM ${t}`)
		for (const t of tables) {
			for (const row of payloads[t]) await appExec(insertSql(t, row))
		}
	} else {
		for (const t of tables) saveTable(t, payloads[t])
	}
}

export async function clearAll() {
	const tables = ['user', 'memory', 'media', 'highlight', 'growth_comparison']
	if (IS_APP) {
		for (const t of tables) await appExec(`DELETE FROM ${t}`)
	} else {
		for (const t of tables) saveTable(t, [])
	}
}
