/**
 * 回忆录生成与导出工具
 */

import { fmtCN } from './date'
import { emotionOf } from './stage'

/**
 * 将全部记忆按时间线组装为回忆录文本
 */
export function buildMemoir(user, memories) {
	const nickname = (user && user.nickname) || '我'
	const birth = user && user.birthDate ? fmtCN(user.birthDate) : ''
	const lines = []
	lines.push(`《${nickname}的人生回忆录》`)
	if (birth) lines.push(`出生日期:${birth}`)
	lines.push(`共收录 ${memories.length} 条时光印记`)
	lines.push('')
	lines.push('────────────────────')
	lines.push('')
	for (const m of memories) {
		lines.push(fmtCN(m.eventDate))
		const emo = emotionOf(m.emotion)
		const tags = []
		if (m.lifeStage) tags.push(m.lifeStage)
		if (emo) tags.push(emo.label)
		if (m.isHighlight) tags.push('★ 高光时刻')
		if (tags.length) lines.push(`[${tags.join(' | ')}]`)
		if (m.title) lines.push(m.title)
		if (m.content) lines.push(m.content)
		const imgCount = (m.medias || []).filter(x => x.type === 'image').length
		const voiceCount = (m.medias || []).filter(x => x.type === 'voice').length
		const videoCount = (m.medias || []).filter(x => x.type === 'video').length
		const mediaDesc = []
		if (imgCount) mediaDesc.push(`照片x${imgCount}`)
		if (videoCount) mediaDesc.push(`视频x${videoCount}`)
		if (voiceCount) mediaDesc.push(`语音x${voiceCount}`)
		if (mediaDesc.length) lines.push(`(附件:${mediaDesc.join('、')})`)
		lines.push('')
	}
	return lines.join('\n')
}

/**
 * 导出文本文件
 * App 端写入 _downloads 目录并返回完整路径;H5 触发下载;小程序端复制到剪贴板
 * @returns {Promise<string>} 结果描述
 */
export function exportText(content, filename) {
	return new Promise((resolve, reject) => {
		// #ifdef APP-PLUS
		plus.io.resolveLocalFileSystemURL('_downloads/', dirEntry => {
			dirEntry.getFile(filename, { create: true }, fileEntry => {
				fileEntry.createWriter(writer => {
					writer.onwrite = () => resolve(plus.io.convertLocalFileSystemURL('_downloads/' + filename))
					writer.onerror = e => reject(new Error('写入文件失败'))
					writer.write(content)
				}, () => reject(new Error('创建文件失败')))
			}, () => reject(new Error('创建文件失败')))
		}, () => reject(new Error('存储空间不足或不可用')))
		// #endif
		// #ifdef H5
		const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
		const a = document.createElement('a')
		a.href = URL.createObjectURL(blob)
		a.download = filename
		a.click()
		URL.revokeObjectURL(a.href)
		resolve(filename)
		// #endif
		// #ifdef MP
		uni.setClipboardData({
			data: content,
			success: () => resolve('clipboard'),
			fail: () => reject(new Error('复制失败'))
		})
		// #endif
	})
}

/**
 * 导出全部媒体素材包 zip(App 端)
 */
export function exportMediaZip() {
	return new Promise((resolve, reject) => {
		// #ifdef APP-PLUS
		const dst = '_downloads/timeimprint_media_' + Date.now() + '.zip'
		plus.zip.compress('_doc/timeimprint/', dst, () => {
			resolve(plus.io.convertLocalFileSystemURL(dst))
		}, e => reject(new Error('素材包压缩失败:' + (e && e.message || ''))))
		// #endif
		// #ifndef APP-PLUS
		reject(new Error('素材包导出仅支持 App 端'))
		// #endif
	})
}

// 备份数据写文件(App)/剪贴板(小程序)
export function exportBackup(json) {
	return exportText(json, `timeimprint_backup_${new Date().toISOString().slice(0, 10)}.json`)
}

/**
 * 读取最近一次导出的备份文件内容
 * App 端从 _downloads 读取最新的 timeimprint_backup_*.json;小程序/H5 端读剪贴板
 */
export function pickBackupFile() {
	return new Promise((resolve, reject) => {
		// #ifdef APP-PLUS
		plus.io.resolveLocalFileSystemURL('_downloads/', dirEntry => {
			const reader = dirEntry.createReader()
			reader.readEntries(entries => {
				const files = entries
					.filter(e => e.isFile && /^timeimprint_backup_.*\.json$/.test(e.name))
					.sort((a, b) => (b.name > a.name ? 1 : -1))
				if (!files.length) return reject(new Error('未找到备份文件,请先创建备份'))
				readEntryFile(files[0]).then(resolve, () => reject(new Error('读取备份文件失败')))
			}, () => reject(new Error('读取目录失败')))
		}, () => reject(new Error('存储目录不可用')))
		// #endif
		// #ifndef APP-PLUS
		uni.getClipboardData({
			success: r => resolve(r.data),
			fail: () => reject(new Error('读取剪贴板失败'))
		})
		// #endif
	})
}

// #ifdef APP-PLUS
function readEntryFile(entry) {
	return new Promise((resolve, reject) => {
		entry.file(file => {
			const reader = new plus.io.FileReader()
			reader.onload = e => resolve(e.target.result)
			reader.onerror = () => reject(new Error('读取文件失败'))
			reader.readAsText(file, 'utf-8')
		}, reject)
	})
}
// #endif
