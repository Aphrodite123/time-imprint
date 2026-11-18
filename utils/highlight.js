/**
 * 高光星数管理规则(1~5 星,手动选择)
 * 星级定义、默认档位、归一化与展示文案的唯一来源
 */

// 星级档位表(1~5 星,由低到高)
export const HL_LEVELS = [
	{ level: 1, label: '心动一瞬' },
	{ level: 2, label: '温暖小事' },
	{ level: 3, label: '难忘时刻' },
	{ level: 4, label: '人生大事' },
	{ level: 5, label: '一生珍藏' }
]

// 默认档位: 长按快捷「加入高光」不打断操作,按 3 星落库
export const DEFAULT_HL_LEVEL = 3

// 星级上限(展示 5 档星条时用于暗星补位)
export const MAX_HL_LEVEL = 5

/**
 * 归一化某条印记的星数: 旧数据/非法值兜底为默认档位
 * @param {Object} m memory 行(含 highlightLevel)
 */
export function levelOf(m) {
	const n = Number(m && m.highlightLevel)
	return n >= 1 && n <= MAX_HL_LEVEL ? Math.round(n) : DEFAULT_HL_LEVEL
}

/**
 * 档位 -> 实心星文案(如 "★★★")
 */
export function starsText(level) {
	return '★'.repeat(levelOf({ highlightLevel: level }))
}

/**
 * 档位 -> 含义文案(非法档位回退默认档)
 */
export function levelLabel(level) {
	const n = levelOf({ highlightLevel: level })
	const hit = HL_LEVELS.find(l => l.level === n)
	return hit ? hit.label : ''
}
