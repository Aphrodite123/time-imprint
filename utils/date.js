/**
 * 日期工具
 */

// 补零
function pad(n) {
	return n < 10 ? '0' + n : '' + n
}

// Date -> 'YYYY-MM-DD'
export function fmtDate(d) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 'YYYY-MM-DD' -> 'YYYY年M月D日'
export function fmtCN(dateStr) {
	if (!dateStr) return ''
	const [y, m, d] = dateStr.split('-')
	return `${y}年${parseInt(m)}月${parseInt(d)}日`
}

export function today() {
	return fmtDate(new Date())
}

/**
 * 计算周岁(某日期时点的年龄)
 * @param birthDate 'YYYY-MM-DD'
 * @param atDate 'YYYY-MM-DD',默认今天
 * @returns {number|null} 未设置生日返回 null;未来日期返回负数
 */
export function calcAge(birthDate, atDate) {
	if (!birthDate) return null
	const b = new Date(birthDate.replace(/-/g, '/'))
	const a = atDate ? new Date(atDate.replace(/-/g, '/')) : new Date()
	let age = a.getFullYear() - b.getFullYear()
	const m = a.getMonth() - b.getMonth()
	if (m < 0 || (m === 0 && a.getDate() < b.getDate())) age--
	return age
}

// 'YYYY-MM-DD' 时间戳(用于比较)
export function ts(dateStr) {
	return new Date(dateStr.replace(/-/g, '/')).getTime()
}

// 当前月份日历矩阵(6行x7列,周一起始),用于日历回看
export function monthMatrix(year, month) {
	const first = new Date(year, month - 1, 1)
	const startOffset = (first.getDay() + 6) % 7 // 周一=0
	const daysInMonth = new Date(year, month, 0).getDate()
	const cells = []
	for (let i = 0; i < startOffset; i++) cells.push(null)
	for (let d = 1; d <= daysInMonth; d++) cells.push(d)
	while (cells.length % 7 !== 0) cells.push(null)
	return cells
}
