/**
 * 媒体文件工具:选择、持久化保存、删除、录音
 * App 端保存到应用私有目录 _doc/timeimprint/,小程序端使用 saveFile
 */

const MEDIA_DIR = '_doc/timeimprint/'
const MEDIA_DIR_NAME = 'timeimprint'

// 选择图片(多选,自动压缩)
export function chooseImages(count = 9) {
	return new Promise((resolve, reject) => {
		uni.chooseImage({
			count,
			sizeType: ['compressed'],
			success: r => resolve(r.tempFilePaths || []),
			fail: () => reject(new Error('cancel'))
		})
	})
}

// 选择视频(压缩)
export function chooseVideo() {
	return new Promise((resolve, reject) => {
		uni.chooseVideo({
			sourceType: ['album', 'camera'],
			compressed: true,
			success: r => resolve({ url: r.tempFilePath, duration: r.duration || 0 }),
			fail: () => reject(new Error('cancel'))
		})
	})
}

// #ifdef APP-PLUS
// 确保 _doc/timeimprint/ 目录存在,返回目录 Entry
function ensureMediaDir() {
	return new Promise((resolve, reject) => {
		plus.io.resolveLocalFileSystemURL(MEDIA_DIR, resolve, () => {
			plus.io.resolveLocalFileSystemURL('_doc/', docEntry => {
				docEntry.getDirectory(MEDIA_DIR_NAME, { create: true }, resolve, reject)
			}, reject)
		})
	})
}
// #endif

/**
 * 将临时文件持久化到应用私有目录
 * @returns {Promise<string>} 持久化后的本地路径
 */
export function persistFile(tempPath, ext = '') {
	return new Promise(resolve => {
		// #ifdef APP-PLUS
		const m = tempPath.match(/\.(\w+)$/)
		const suffix = ext || (m ? m[1] : 'dat')
		const filename = Date.now() + '_' + Math.floor(Math.random() * 10000) + '.' + suffix
		ensureMediaDir().then(dirEntry => {
			plus.io.resolveLocalFileSystemURL(tempPath, srcEntry => {
				srcEntry.copyTo(dirEntry, filename, () => {
					resolve(MEDIA_DIR + filename)
				}, () => resolve(tempPath))
			}, () => resolve(tempPath))
		}).catch(() => resolve(tempPath))
		// #endif
		// #ifndef APP-PLUS
		uni.saveFile({
			tempFilePath: tempPath,
			success: r => resolve(r.savedFilePath),
			fail: () => resolve(tempPath) // H5 端直接使用临时地址
		})
		// #endif
	})
}

// 删除已持久化的媒体文件
export function removeFile(url) {
	if (!url) return
	// #ifdef APP-PLUS
	plus.io.resolveLocalFileSystemURL(url, entry => {
		entry.remove(() => {}, () => {})
	}, () => {})
	// #endif
	// #ifndef APP-PLUS
	try { uni.removeSavedFile({ filePath: url }) } catch (e) {}
	// #endif
}

/* ==================== 录音 ==================== */
let recorder = null

function getRecorder() {
	if (!recorder) recorder = uni.getRecorderManager()
	return recorder
}

/**
 * 开始录音,返回包含 stop 的句柄;stop 返回录音文件临时路径
 * 录音失败多为麦克风权限未授予(异常场景处理 3.8)
 */
export function startRecord() {
	return new Promise((resolve, reject) => {
		// #ifdef H5
		reject(new Error('当前环境不支持录音,请在 App 或小程序中使用'))
		// #endif
		// #ifndef H5
		const rm = getRecorder()
		let started = false
		let stopped = false
		rm.onStart(() => {
			if (!started) {
				started = true
				resolve({
					stop: () => new Promise(resolveStop => {
						if (stopped) return resolveStop('')
						stopped = true
						rm.onStop(r => resolveStop(r.tempFilePath || ''))
						rm.stop()
					})
				})
			}
		})
		rm.onError(e => {
			if (!started) reject(new Error('录音失败,请检查麦克风权限'))
		})
		try {
			rm.start({ duration: 300000, format: 'mp3' })
		} catch (e) {
			reject(new Error('录音失败,请检查麦克风权限'))
		}
		// #endif
	})
}
