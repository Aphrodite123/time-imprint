/**
 * 媒体文件工具:选择、持久化保存、删除、录音
 * App 端保存到应用私有目录 _doc/timeimprint/,小程序端使用 saveFile
 */

const MEDIA_DIR = '_doc/timeimprint/'
const MEDIA_DIR_NAME = 'timeimprint'

// 选择图片失败的可读提示(区分 权限拒绝 / 隐私协议未声明 / 其他)
function chooseFailText(msg) {
	if (/auth|deny|permission/i.test(msg)) return '未获得相册/相机权限,请在设置中开启后重试'
	if (/privacy/i.test(msg)) return '需在小程序后台配置相册/相机隐私授权后再试'
	return '选择图片失败:' + msg
}

// 选择图片(多选,自动压缩;弹出 拍照/相册 选择)
export function chooseImages(count = 9) {
	return new Promise((resolve, reject) => {
		const onFail = e => {
			const msg = ((e && e.errMsg) || '').trim()
			// 用户取消不算错误, 静默返回空数组:
			// iOS/H5/小程序为 "xxx:fail cancel"; App-Android 取消常只回裸的 "xxx:fail"(无原因描述)
			if (/cancel/i.test(msg) || /^[a-z]+:fail$/i.test(msg)) return resolve([])
			reject(new Error(chooseFailText(msg)))
		}
		// #ifdef MP-WEIXIN
		// 微信小程序: chooseImage 已停用, 统一走 chooseMedia(兼容拍照与相册, 支持隐私授权弹窗)
		uni.chooseMedia({
			count: Math.min(count, 9),
			mediaType: ['image'],
			sourceType: ['album', 'camera'],
			sizeType: ['compressed'],
			success: r => resolve((r.tempFiles || []).map(f => f.tempFilePath)),
			fail: onFail
		})
		// #endif
		// #ifndef MP-WEIXIN
		uni.chooseImage({
			count,
			sizeType: ['compressed'],
			sourceType: ['album', 'camera'],
			success: r => resolve(r.tempFilePaths || []),
			fail: onFail
		})
		// #endif
	})
}

// 音频/视频扩展名校验
const AUDIO_EXT_RE = /\.(mp3|wav|m4a|aac|flac|ogg|amr|opus)(\?|$)/i
const VIDEO_EXT_RE = /\.(mp4|mov|m4v|avi|mkv|webm|3gp)(\?|$)/i

/**
 * 选择本地音频文件
 * - 微信小程序: 从会话选择文件(可筛选音频类型, 需聊天里有音频文件)
 * - App: 系统选择器(与视频入口同款, 支持选中音频文件)
 * - H5: 文件选择框(audio/*)
 * @returns {Promise<{url:string, duration:number}|null>} 取消返回 null; 选中视频文件时抛错
 */
export function chooseAudio() {
	return new Promise((resolve, reject) => {
		const onGot = r => {
			const url = r.url || r.tempFilePath || r.path || ''
			if (!url) return resolve(null)
			if (VIDEO_EXT_RE.test(url)) return reject(new Error('这是视频文件,请通过「视频」添加'))
			resolve({ url, duration: r.duration || 0 })
		}
		// #ifdef MP-WEIXIN
		uni.chooseMessageFile({
			count: 1,
			type: 'file',
			extension: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'amr'],
			success: r => {
				const f = (r.tempFiles || [])[0]
				if (!f) return resolve(null)
				if (!AUDIO_EXT_RE.test(f.name || f.path || '')) {
					return reject(new Error('请选择音频文件(mp3/wav/m4a 等)'))
				}
				onGot({ path: f.path, duration: 0 })
			},
			fail: () => resolve(null)
		})
		// #endif
		// #ifdef H5
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'audio/*'
		input.style.display = 'none'
		input.onchange = () => {
			const file = input.files && input.files[0]
			if (!file) return resolve(null)
			const url = URL.createObjectURL(file)
			if (!AUDIO_EXT_RE.test(file.name) && !/audio/.test(file.type || '')) {
				URL.revokeObjectURL(url)
				return reject(new Error('请选择音频文件(mp3/wav/m4a 等)'))
			}
			// 读取时长(元数据加载失败不阻塞)
			const probe = document.createElement('audio')
			probe.preload = 'metadata'
			probe.src = url
			let done = false
			const finish = d => {
				if (done) return
				done = true
				resolve({ url, duration: d || 0 })
			}
			probe.onloadedmetadata = () => finish(probe.duration)
			probe.onerror = () => finish(0)
			setTimeout(() => finish(probe.duration || 0), 2000)
		}
		document.body.appendChild(input)
		input.click()
		// #endif
		// #ifdef APP-PLUS
		uni.chooseVideo({
			sourceType: ['album', 'camera'],
			compressed: false,
			success: r => onGot({ url: r.tempFilePath, duration: r.duration || 0 }),
			fail: e => {
				const msg = ((e && e.errMsg) || '').trim()
				if (/cancel/i.test(msg) || /^[a-z]+:fail$/i.test(msg)) return resolve(null)
				reject(new Error('选择音频失败:' + msg))
			}
		})
		// #endif
	})
}

/**
 * 预加载音频文件时长(不播放)
 * @param url 音频地址
 * @returns {Promise<number>} 时长(秒), 失败/超时返回 0
 */
export function probeAudioDuration(url) {
	return new Promise(resolve => {
		if (!url) return resolve(0)
		let done = false
		const finish = d => {
			if (!done) {
				done = true
				resolve(d || 0)
			}
		}
		// #ifdef H5
		const a = document.createElement('audio')
		a.preload = 'metadata'
		a.src = url
		a.onloadedmetadata = () => finish(a.duration)
		a.onerror = () => finish(0)
		setTimeout(() => finish(a.duration || 0), 3000)
		// #endif
		// #ifndef H5
		const ctx = uni.createInnerAudioContext()
		ctx.src = url
		const reg = (names, cb) => {
			for (const n of names) {
				if (typeof ctx[n] === 'function') ctx[n](cb)
			}
		}
		reg(['onCanplay', 'onCanPlay'], () => {
			// canplay 后时长可能仍未赋值, 稍候读取
			setTimeout(() => finish(ctx.duration || 0), 120)
		})
		reg(['onError'], () => finish(0))
		setTimeout(() => finish(ctx.duration || 0), 4000)
		// #endif
	})
}

/**
 * 选择视频(带首帧缩略图)
 * - 微信小程序: chooseMedia 官方直接返回首帧图 thumbTempFilePath
 * - H5: canvas 截取首帧为 dataURL
 * - App: 无缩略图截取能力, thumb 为空(卡片端原生 video 暂停态自带首帧)
 * @returns {Promise<{url:string, duration:number, thumb:string}|null>} 取消返回 null
 */
export function chooseVideoMedia() {
	return new Promise((resolve, reject) => {
		const onGot = r => {
			const url = r.url || r.tempFilePath || ''
			if (!url) return resolve(null)
			resolve({ url, duration: r.duration || 0, thumb: r.thumb || '' })
		}
		// #ifdef MP-WEIXIN
		uni.chooseMedia({
			count: 1,
			mediaType: ['video'],
			maxDuration: 60,
			sourceType: ['album', 'camera'],
			success: r => {
				const f = (r.tempFiles || [])[0]
				if (!f) return resolve(null)
				onGot({ url: f.tempFilePath, duration: f.duration || 0, thumb: f.thumbTempFilePath || '' })
			},
			fail: e => {
				const msg = ((e && e.errMsg) || '').trim()
				if (/cancel/i.test(msg) || /^[a-z]+:fail$/i.test(msg)) return resolve(null)
				reject(new Error('选择视频失败:' + msg))
			}
		})
		// #endif
		// #ifndef MP-WEIXIN
		uni.chooseVideo({
			sourceType: ['album', 'camera'],
			compressed: true,
			success: r => {
				// #ifdef H5
				captureH5Poster(r.tempFilePath, thumb => onGot({ url: r.tempFilePath, duration: r.duration || 0, thumb }))
				// #endif
				// #ifndef H5
				onGot({ url: r.tempFilePath, duration: r.duration || 0, thumb: '' })
				// #endif
			},
			fail: e => {
				const msg = ((e && e.errMsg) || '').trim()
				if (/cancel/i.test(msg) || /^[a-z]+:fail$/i.test(msg)) return resolve(null)
				reject(new Error('选择视频失败:' + msg))
			}
		})
		// #endif
	})
}

// #ifdef H5
// H5: 用 canvas 截取视频首帧, 返回 dataURL
function captureH5Poster(url, cb) {
	const v = document.createElement('video')
	v.preload = 'auto'
	v.muted = true
	v.src = url
	let done = false
	const finish = thumb => {
		if (done) return
		done = true
		cb(thumb || '')
	}
	v.onloadeddata = () => {
		try { v.currentTime = 0.1 } catch (e) {}
	}
	v.onseeked = grab
	v.onerror = () => finish('')
	setTimeout(() => finish(''), 4000)
	function grab() {
		try {
			const canvas = document.createElement('canvas')
			canvas.width = v.videoWidth || 480
			canvas.height = v.videoHeight || 360
			canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height)
			finish(canvas.toDataURL('image/jpeg', 0.7))
		} catch (e) {
			finish('')
		}
	}
}
// #endif

// 选择视频(压缩;取消/无原因失败静默, 真实错误带原因抛出)
export function chooseVideo() {
	return new Promise((resolve, reject) => {
		uni.chooseVideo({
			sourceType: ['album', 'camera'],
			compressed: true,
			success: r => resolve({ url: r.tempFilePath, duration: r.duration || 0 }),
			fail: e => {
				const msg = ((e && e.errMsg) || '').trim()
				// App-Android 取消常只回裸的 "xxx:fail"; 取消以 resolve(null) 表达
				if (/cancel/i.test(msg) || /^[a-z]+:fail$/i.test(msg)) return resolve(null)
				reject(new Error('选择视频失败:' + msg))
			}
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
		// #ifdef MP-WEIXIN
		// 开发者工具的 __store__ 存储服务读取不稳定(500), 改为复制到用户目录, 路径稳定可直接播放
		try {
			const fs = wx.getFileSystemManager()
			const m = tempPath.match(/\.(\w+)$/)
			const suffix = ext || (m ? m[1] : 'dat')
			const dest = `${wx.env.USER_DATA_PATH}/ti_${Date.now()}_${Math.floor(Math.random() * 10000)}.${suffix}`
			fs.copyFile({
				srcPath: tempPath,
				destPath: dest,
				success: () => resolve(dest),
				fail: () => {
					// 回退: saveFile 存储目录
					uni.saveFile({
						tempFilePath: tempPath,
						success: r => resolve(r.savedFilePath),
						fail: () => resolve(tempPath)
					})
				}
			})
		} catch (e) {
			uni.saveFile({
				tempFilePath: tempPath,
				success: r => resolve(r.savedFilePath),
				fail: () => resolve(tempPath)
			})
		}
		// #endif
		// #ifdef H5
		resolve(tempPath) // H5 直接使用临时/blob 地址
		// #endif
	})
}

// 删除已持久化的媒体文件
export function removeFile(url) {
	if (!url || /^data:/.test(url)) return
	// #ifdef APP-PLUS
	plus.io.resolveLocalFileSystemURL(url, entry => {
		entry.remove(() => {}, () => {})
	}, () => {})
	// #endif
	// #ifdef MP-WEIXIN
	try {
		wx.getFileSystemManager().unlink({
			filePath: url,
			fail: () => {
				// 兼容旧数据: saveFile 存储目录的文件用 removeSavedFile 清理
				try { uni.removeSavedFile({ filePath: url, fail: () => {} }) } catch (e) {}
			}
		})
	} catch (e) {}
	// #endif
	// #ifdef H5
	// 临时/blob 地址无需清理
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
