/**
 * 人生阶段划分规则(PRD 3.7)与情绪表
 */

// 人生阶段(按年龄区间自动匹配)
export const STAGES = [
	{ key: 'infant', label: '婴儿时期', min: 0, max: 1 },
	{ key: 'child', label: '幼年', min: 2, max: 6 },
	{ key: 'childhood', label: '童年', min: 7, max: 12 },
	{ key: 'teen', label: '少年', min: 13, max: 17 },
	{ key: 'youth', label: '青年', min: 18, max: 40 },
	{ key: 'middle', label: '中年', min: 41, max: 65 },
	{ key: 'elder', label: '暮年', min: 66, max: null }
]

// 出生前(发生日期早于出生日期, 年龄<0)的印记统一显示为「未出生」
export const UNBORN_STAGE = { key: 'unborn', label: '未出生' }

export const FUTURE_STAGE = { key: 'future', label: '未来计划' }

// 时间轴年龄分割线(5 的倍数 + 18)
export const AGE_MARKS = [0, 5, 10, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120]

// 情绪表情表
export const EMOTIONS = [
	{ key: 'happy', emoji: '😄', label: '开心' },
	{ key: 'warm', emoji: '😊', label: '温暖' },
	{ key: 'calm', emoji: '😌', label: '平静' },
	{ key: 'touched', emoji: '🤗', label: '感动' },
	{ key: 'sad', emoji: '🥺', label: '难过' },
	{ key: 'love', emoji: '😍', label: '热爱' },
	{ key: 'upset', emoji: '😤', label: '郁闷' },
	{ key: 'lost', emoji: '😶', label: '迷茫' }
]

export function emotionOf(key) {
	return EMOTIONS.find(e => e.key === key) || null
}

/**
 * 按年龄获取人生阶段
 * @param age 周岁;负数表示出生前
 */
export function stageByAge(age) {
	if (age === null || age === undefined) return null
	if (age < 0) return UNBORN_STAGE
	return STAGES.find(s => age >= s.min && (s.max === null || age <= s.max)) || FUTURE_STAGE
}

/**
 * 展示用人生阶段:发生日期早于出生日期(年龄<0)的印记统一显示为「未出生」
 * @param birthDate 用户出生日期,可为空
 * @param eventDate 事件发生日期
 * @param storedStage 记录上保存的人生阶段
 */
export function stageLabelOf(birthDate, eventDate, storedStage) {
	if (!birthDate || !eventDate) return storedStage || ''
	const b = new Date(birthDate.replace(/-/g, '/'))
	const e = new Date(eventDate.replace(/-/g, '/'))
	return e < b ? UNBORN_STAGE.label : (storedStage || '')
}

/**
 * 根据出生日期与事件日期推算人生阶段(PRD 3.7 系统自动匹配)
 * @param birthDate 用户出生日期,可为空
 * @param eventDate 事件发生日期
 */
export function stageOfEvent(birthDate, eventDate) {
	if (!birthDate) return null
	const b = new Date(birthDate.replace(/-/g, '/'))
	const e = new Date(eventDate.replace(/-/g, '/'))
	let age = e.getFullYear() - b.getFullYear()
	const m = e.getMonth() - b.getMonth()
	if (m < 0 || (m === 0 && e.getDate() < b.getDate())) age--
	return stageByAge(age)
}

// 当前所处人生阶段
export function myStage(birthDate) {
	if (!birthDate) return null
	const now = new Date()
	let age = now.getFullYear() - new Date(birthDate.replace(/-/g, '/')).getFullYear()
	const m = now.getMonth() - new Date(birthDate.replace(/-/g, '/')).getMonth()
	if (m < 0 || (m === 0 && now.getDate() < new Date(birthDate.replace(/-/g, '/')).getDate())) age--
	return stageByAge(age)
}
