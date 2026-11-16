/**
 * 全局共享语音播放器
 * 同一时间只播一条语音; 在播状态/进度/时长为全局响应式状态,
 * 语音条(voice-bar)与声波切图(memory-thumb)等多处 UI 据此联动展示与控制
 */
import { reactive } from 'vue'

export const voiceState = reactive({
	url: '',       // 当前加载的语音(含暂停中)
	playing: false, // 是否播放中
	current: 0,    // 当前语音已播秒数
	duration: 0,   // 当前语音总时长(秒)
	positions: {}  // 各语音的进度记忆(url -> 秒): 被抢占/暂停后保留展示, 再播续播
})

let audio = null
let pendingSeek = 0 // 换源后的待跳转进度(onCanplay 时应用)

function storedRate() {
	const r = Number(uni.getStorageSync('ti_play_rate'))
	return r > 0 ? r : 1.0
}

// 懒创建全局唯一音频实例(事件统一路由到共享状态)
function ensureAudio() {
	if (audio) return audio
	audio = uni.createInnerAudioContext()
	try { audio.obeyMuteSwitch = false } catch (e) {}
	audio.onCanplay(() => {
		if (audio.duration) voiceState.duration = Math.ceil(audio.duration)
		if (pendingSeek > 0) {
			audio.seek(pendingSeek)
			pendingSeek = 0
		}
	})
	audio.onTimeUpdate(() => {
		voiceState.current = Math.floor(audio.currentTime)
		if (audio.duration) voiceState.duration = Math.ceil(audio.duration)
		voiceState.positions[voiceState.url] = voiceState.current
	})
	audio.onEnded(() => {
		voiceState.playing = false
		voiceState.current = 0
		voiceState.positions[voiceState.url] = 0
	})
	audio.onError(() => {
		voiceState.playing = false
		uni.showToast({ title: '语音播放失败', icon: 'none' })
	})
	return audio
}

// 记住旧进度并切换加载目标(内部共用)
function switchSrc(url, startAt) {
	if (voiceState.url) voiceState.positions[voiceState.url] = Math.floor(audio.currentTime || 0)
	audio.stop()
	voiceState.playing = false
	voiceState.url = url
	voiceState.duration = 0
	voiceState.current = startAt
	audio.src = url
	pendingSeek = startAt
	audio.playbackRate = storedRate()
	audio.play()
	voiceState.playing = true
}

/**
 * 播放/暂停切换
 * 当前在播 -> 暂停; 暂停中 -> 从上次进度续播; 其他语音 -> 停旧播新(保留旧进度)
 */
export function toggleVoiceUrl(url) {
	if (!url) return
	const a = ensureAudio()
	if (voiceState.url === url) {
		if (voiceState.playing) {
			a.pause()
			voiceState.playing = false
		} else {
			a.playbackRate = storedRate()
			a.play()
			voiceState.playing = true
		}
		return
	}
	switchSrc(url, voiceState.positions[url] || 0)
}

/**
 * 跳转进度: 目标语音未加载时自动切过去并从跳转处开始播放
 */
export function seekVoiceUrl(url, target) {
	if (!url) return
	const a = ensureAudio()
	if (voiceState.url !== url) {
		switchSrc(url, Math.floor(target))
		return
	}
	a.seek(target)
	voiceState.current = Math.floor(target)
	voiceState.positions[url] = Math.floor(target)
	// 未在播放: 跳转后自动开始播放
	if (!voiceState.playing) {
		a.playbackRate = storedRate()
		a.play()
		voiceState.playing = true
	}
}

/**
 * 释放某条语音: 它还在全局播放/加载中时停掉(组件卸载、切页、换卡场景)
 */
export function releaseVoice(url) {
	if (!url || voiceState.url !== url) return
	if (audio) audio.stop()
	voiceState.playing = false
	voiceState.current = 0
	voiceState.positions[url] = 0
	voiceState.url = ''
	voiceState.duration = 0
}
