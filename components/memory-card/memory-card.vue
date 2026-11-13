<template>
	<view class="mc" @click="$emit('click', memory)" @longpress="$emit('longpress', memory)">
		<!-- 头行: 日期(今年只显示月日, 非今年显示年月日) + 高光星标 + 更多菜单 -->
		<view class="mc-head">
			<text class="mc-date-title">{{ dateCN }}</text>
			<view class="mc-head-right">
				<text v-if="memory.isHighlight" class="mc-star">★</text>
				<view class="mc-more" @click.stop="$emit('more', memory)">
					<view class="mc-more-dot"></view>
					<view class="mc-more-dot"></view>
					<view class="mc-more-dot"></view>
				</view>
			</view>
		</view>

		<!-- 媒体行: 图片格 + 视频格(首帧, 可就地播放), 最多 3 格; 超出叠加 +N -->
		<view v-if="mediaTiles.length" class="mc-media">
			<view v-for="(t, i) in mediaTiles" :key="i" class="mc-media-tile" @click.stop="onTileTap(t, i)">
				<image v-if="t.type === 'image'" :src="t.url" mode="aspectFill" class="mc-media-img" />
				<view v-else-if="t.type === 'video'" class="mc-media-video" @click.stop="playVideo(i)">
					<!-- #ifndef MP-WEIXIN -->
					<!-- App/H5: 原生 video 暂停态即为首帧, 点击角标就地播放 -->
					<video
						class="mc-media-video-player"
						:src="t.url"
						object-fit="cover"
						:controls="playingVideo === i"
						:autoplay="playingVideo === i"
						:muted="playingVideo !== i"
						:show-center-play-btn="false"
						:show-play-btn="false"
					/>
					<view v-if="playingVideo !== i" class="mc-media-playbadge"></view>
					<!-- #endif -->
					<!-- #ifdef MP-WEIXIN -->
					<!-- 微信端暂停态无首帧: 显示选择的缩略图(无缩略图的历史记录用设计磁贴), 点击原地播放 -->
					<template v-if="playingVideo === i">
						<video class="mc-media-video-player" :src="t.url" controls autoplay object-fit="contain" />
					</template>
					<template v-else>
						<image v-if="t.thumb" :src="t.thumb" mode="aspectFill" class="mc-media-img" />
						<view v-else class="mc-video-style">
							<view class="mc-video-playcircle">
								<view class="mc-play-tri sm"></view>
							</view>
							<text v-if="t.dur" class="mc-video-dur">{{ fmtDur(t.dur) }}</text>
						</view>
						<view class="mc-media-playbadge"></view>
					</template>
					<!-- #endif -->
				</view>
				<view v-if="t.more" class="mc-media-more">
					<text class="mc-media-more-text">+{{ t.more }}</text>
				</view>
			</view>
		</view>

		<!-- 正文(完整故事, 最多4行, 全文进详情) -->
		<text v-if="memory.content" class="mc-content">{{ memory.content }}</text>

		<!-- 表情标签 -->
		<view v-if="emotion" class="mc-emotion">
			<text class="mc-emotion-emoji">{{ emotion.emoji }}</text>
			<text class="mc-emotion-label">{{ emotion.label }}</text>
		</view>

		<!-- 语音播放器: 进度条 + 收藏/快退/播放/快进(设计图布局) -->
		<view v-if="voice" class="mc-audio" @click.stop>
			<view class="mc-audio-progress">
				<text class="mc-audio-time" @click="toggleVoice">{{ elapsedText }}</text>
				<view class="mc-audio-hit" @click.stop="seekToTap">
					<view class="mc-audio-track">
						<view class="mc-audio-fill" :style="{ width: voiceProgress * 100 + '%' }"></view>
						<view class="mc-audio-knob" :style="{ left: voiceProgress * 100 + '%' }"></view>
					</view>
				</view>
				<text class="mc-audio-time" @click="toggleVoice">{{ totalText }}</text>
			</view>
			<view class="mc-audio-controls">
				<view :class="['mc-audio-heart', memory.isFavorite ? 'on' : '']" @click="toggleFavorite">
					{{ memory.isFavorite ? '♥' : '♡' }}
				</view>
				<view class="mc-audio-skip" @click="seekBy(-10)">
					<view class="mc-skip-tri"></view>
					<view class="mc-skip-tri"></view>
				</view>
				<view class="mc-audio-playbtn" @click="toggleVoice">
					<view v-if="!playing" class="mc-play-tri"></view>
					<view v-else class="mc-pause">
						<view class="mc-pause-bar"></view>
						<view class="mc-pause-bar"></view>
					</view>
				</view>
				<view class="mc-audio-skip fwd" @click="seekBy(10)">
					<view class="mc-skip-tri"></view>
					<view class="mc-skip-tri"></view>
				</view>
				<view v-if="voices.length > 1" class="mc-audio-listbtn" @click="playlistVisible = true">
					<view class="mc-list-line"></view>
					<view class="mc-list-line short"></view>
					<view class="mc-list-line"></view>
				</view>
			</view>
		</view>

		<!-- 播放列表弹层 -->
		<view v-if="playlistVisible" class="mc-pl-mask" @click="playlistVisible = false">
			<view class="mc-pl-panel" @click.stop>
				<view class="mc-pl-head">
					<text class="mc-pl-title">播放列表</text>
					<text class="mc-pl-count">{{ voices.length }} 条语音</text>
					<text class="mc-pl-close" @click="playlistVisible = false">✕</text>
				</view>
				<scroll-view scroll-y class="mc-pl-scroll">
					<view
						v-for="(v, i) in voices"
						:key="i"
						:class="['mc-pl-item', i === voiceIndex ? 'on' : '']"
						@click="selectTrack(i)"
					>
						<view :class="['mc-pl-no', i === voiceIndex ? 'on' : '']">{{ i + 1 < 10 ? '0' + (i + 1) : i + 1 }}</view>
						<view class="mc-pl-info">
							<text :class="['mc-pl-name', i === voiceIndex ? 'on' : '']">语音 {{ i + 1 }}</text>
							<text class="mc-pl-dur">{{ fmtDur(v.duration) }}</text>
						</view>
						<text v-if="i === voiceIndex" class="mc-pl-check">✓</text>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
	// 时光印记记忆卡(首页时间轴, 设计图 03_首页): 文字/图片/视频/语音/情绪
	import { emotionOf } from '../../utils/stage'
	import { setFavorite } from '../../utils/db'
	import { probeAudioDuration } from '../../utils/media'

	// 全局共享一个音频实例: 同一时间只播一条, 播放事件路由到当前卡片
	let sharedAudio = null
	let activeCard = null
	let pendingSeek = -1 // 起播时播放器未就绪的跳转位置, 由 onCanplay/onTimeupdate 补跳

	function applyPendingSeek() {
		if (pendingSeek >= 0 && sharedAudio) {
			const t = pendingSeek
			pendingSeek = -1
			sharedAudio.seek(t)
			if (activeCard) activeCard.onTick(t)
		}
	}

	function ensureAudio() {
		if (sharedAudio) return sharedAudio
		sharedAudio = uni.createInnerAudioContext()
		// 不跟随手机静音开关, 避免静音时无声
		try { sharedAudio.obeyMuteSwitch = false } catch (e) {}
		// 事件兼容注册: 各平台事件名有差异(如微信为 onTimeUpdate, 其他端为 onTimeupdate)
		const on = (names, cb) => {
			for (const n of names) {
				if (typeof sharedAudio[n] === 'function') sharedAudio[n](cb)
			}
		}
		on(['onTimeupdate', 'onTimeUpdate'], () => {
			if (!activeCard) return
			// 起播跳转未就绪时先补跳, 不刷新进度(避免闪回 0)
			if (pendingSeek >= 0) {
				applyPendingSeek()
				return
			}
			activeCard.onTick(sharedAudio.currentTime || 0)
		})
		on(['onCanplay', 'onCanPlay'], () => {
			applyPendingSeek()
		})
		on(['onEnded', 'onStop'], () => {
			if (activeCard) activeCard.onFinish()
		})
		on(['onError'], () => {
			if (activeCard) activeCard.onFinish()
			uni.showToast({ title: '语音播放失败', icon: 'none' })
		})
		return sharedAudio
	}

	function fmtSec(s) {
		s = Math.max(0, Math.round(s || 0))
		return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60)
	}

	// 历史误存兼容: 视频入口选入的音频文件(type=video 但扩展名是音频)
	const AUDIO_URL_RE = /\.(mp3|wav|m4a|aac|flac|ogg|amr)(\?|$)/i
	function isAudioUrl(u) {
		return AUDIO_URL_RE.test(u || '')
	}

	export default {
		name: 'memory-card',
		props: {
			memory: { type: Object, required: true }
		},
		data() {
			return {
				playing: false,
				elapsed: 0,
				realDuration: 0, // 记录未写入时长的音频, 以播放器实际时长兜底
				tapRatio: null, // 时长未知时点击进度条的比例, 时长就绪后补跳
				playingVideo: -1, // 就地播放的视频格下标, -1 表示无
				voiceIndex: 0, // 当前播放的语音下标(多语音)
				playlistVisible: false // 播放列表弹层
			}
		},
		computed: {
			// 日期文案: 今年只显示月日, 非今年显示完整年月日
			dateCN() {
				const d = this.memory.eventDate || ''
				const parts = d.split('-')
				if (parts.length < 3) return d
				const [y, m, day] = parts
				const cur = new Date().getFullYear()
				return parseInt(y) === cur
					? `${parseInt(m)}月${parseInt(day)}日`
					: `${y}年${parseInt(m)}月${parseInt(day)}日`
			},
			emotion() {
				return emotionOf(this.memory.emotion)
			},
			// 语音列表(一条印记可含多条); 兼容历史误存: 视频入口选入的音频文件按语音处理
			voices() {
				return (this.memory.medias || [])
					.filter(m => m.type === 'voice' || (m.type === 'video' && isAudioUrl(m.url)))
					.map(m => ({ url: m.url, duration: m.duration || 0 }))
			},
			// 当前选中的语音(默认第一条)
			voice() {
				const list = this.voices
				return list[Math.min(this.voiceIndex, list.length - 1)] || null
			},
			voiceProgress() {
				const d = (this.voice && this.voice.duration) || this.realDuration
				if (!d) return 0
				return Math.min(this.elapsed / d, 1)
			},
			elapsedText() {
				return fmtSec(this.elapsed)
			},
			totalText() {
				return fmtSec((this.voice && this.voice.duration) || this.realDuration)
			},
			// 媒体格: 图片格 + 视频格(缩略图/首帧)合并取格, 合计最多 3 格; 超出在第三格叠加 +N
			// 历史误存的音频文件(type=video 但扩展名为音频)不算视频格, 由语音播放条渲染
			mediaTiles() {
				const medias = this.memory.medias || []
				const imgs = medias
					.filter(m => m.type === 'image')
					.map(m => ({ type: 'image', url: m.url }))
				const vids = medias
					.filter(m => m.type === 'video' && !isAudioUrl(m.url))
					.map(m => ({ type: 'video', url: m.url, thumb: m.thumbnailUrl || '', dur: m.duration || 0 }))
				const all = imgs.concat(vids)
				if (!all.length) return []
				const tiles = all.slice(0, 3)
				if (all.length > 3 && tiles.length) tiles[2].more = all.length - 3
				return tiles
			}
		},
		mounted() {
			// 时长未知的本地音频(如 mp3 从视频入口选入): 挂载后预加载时长, 保证进度条点按可跳转
			this.preloadVoiceDuration()
		},
		beforeUnmount() {
			if (activeCard === this) {
				sharedAudio && sharedAudio.pause()
				activeCard = null
			}
		},
		methods: {
			fmtDur(s) {
				return fmtSec(s)
			},
			playVideo(i) {
				// 点击磁贴: 原生播放器原地接管; 再点击收回磁贴态并停止播放
				this.playingVideo = this.playingVideo === i ? -1 : i
			},
			// 打开播放列表
			openPlaylist() {
				this.playlistVisible = true
			},
			// 切换曲目: 选中即从头自动播放
			selectTrack(i) {
				this.playlistVisible = false
				if (i === this.voiceIndex) return
				if (activeCard === this) sharedAudio && sharedAudio.stop()
				this.voiceIndex = i
				this.startVoice(0)
			},
			onTileTap(t) {
				if (t.type === 'image') {
					const urls = (this.memory.medias || []).filter(m => m.type === 'image').map(m => m.url)
					uni.previewImage({ urls, current: urls.indexOf(t.url) })
				} else {
					// +N 聚合格: 进详情查看全部
					this.$emit('click', this.memory)
				}
			},
			// 预加载时长未知的音频文件(不播放), 保证进度条点按可换算位置
			async preloadVoiceDuration() {
				const v = this.voice
				if (!v || v.duration || this.realDuration) return
				const d = await probeAudioDuration(v.url)
				if (d && !(this.voice && this.voice.duration)) this.realDuration = d
			},
			toggleVoice() {
				const v = this.voice
				if (!v) return
				// 本卡暂停中 → 恢复播放(从暂停位置继续)
				if (activeCard === this && !this.playing) {
					sharedAudio.play()
					this.playing = true
					return
				}
				// 本卡播放中 → 暂停(保留进度, 不归零)
				if (activeCard === this && this.playing) {
					sharedAudio.pause()
					this.playing = false
					return
				}
				// 其他卡片在播/首次播放: 停掉在播的, 从本卡已存进度(首次为 0)开始
				if (activeCard && activeCard !== this) {
					sharedAudio.stop()
					activeCard.playing = false
					activeCard = null
				}
				this.startVoice(this.elapsed || 0)
			},
			// 从指定位置开始播放
			startVoice(fromSec = 0) {
				const v = this.voice
				if (!v) return
				if (activeCard && activeCard !== this) {
					sharedAudio.stop()
					activeCard.playing = false
					activeCard = null
				}
				const audio = ensureAudio()
				// 换曲目才重设 src; 避免先 stop 再设 src 引发的启动异常
				if (audio.src !== v.url) audio.src = v.url
				// 记录待跳转位置, 播放器就绪(onCanplay/onTimeupdate)后补跳
				pendingSeek = fromSec > 0 ? fromSec : -1
				audio.play()
				if (fromSec > 0) setTimeout(applyPendingSeek, 80)
				activeCard = this
				this.playing = true
				this.elapsed = fromSec
			},
			// 点击进度条: 跳转到点击位置(未播放时从该位置开始播)
			seekToTap(e) {
				const v = this.voice
				if (!v) return
				const x = (e && e.detail && e.detail.x) || 0
				const q = uni.createSelectorQuery().in(this)
				q.select('.mc-audio-track').boundingClientRect()
				q.exec(res => {
					const rect = res && res[0]
					if (!rect || !rect.width) return
					const ratio = Math.min(Math.max((x - rect.left) / rect.width, 0), 1)
					const d = (v.duration || 0) || this.realDuration || (activeCard === this && sharedAudio ? sharedAudio.duration || 0 : 0)
					if (!d) {
						// 时长未知: 先播放, 记住点击比例, 时长就绪后自动补跳到该位置
						this.tapRatio = ratio
						return this.startVoice(0)
					}
					const target = ratio * d
					if (activeCard === this) {
						sharedAudio.seek(target)
						this.elapsed = target
					} else {
						this.startVoice(target)
					}
				})
			},
			// 快进/快退 ±10 秒; 未在播放时按下则从头开始播
			seekBy(delta) {
				if (!this.voice) return
				if (activeCard !== this) {
					this.toggleVoice()
					return
				}
				const d = (this.voice.duration) || 0
				const limit = d ? Math.max(d - 0.3, 0) : this.elapsed + delta
				const target = Math.min(Math.max(this.elapsed + delta, 0), limit)
				sharedAudio.seek(target)
				this.elapsed = target
			},
			// 小爱心收藏/取消收藏(独立于高光)
			async toggleFavorite() {
				const m = this.memory
				const next = !m.isFavorite
				try {
					await setFavorite(m.memoryId, next)
					m.isFavorite = next ? 1 : 0
					uni.showToast({ title: next ? '已收藏' : '已取消收藏', icon: 'none' })
				} catch (e) {
					uni.showToast({ title: '操作失败', icon: 'none' })
				}
			},
			onTick(sec) {
				this.elapsed = sec
				// 时长未知(mp3 从视频入口选入等)时, 取播放器实际时长兜底
				if (!this.realDuration && sharedAudio && sharedAudio.duration) {
					this.realDuration = sharedAudio.duration
				}
				// 时长未知时点过进度条: 时长就绪后补跳到点击比例位置
				if (this.tapRatio != null) {
					const d = (this.voice && this.voice.duration) || this.realDuration
					if (d) {
						const target = Math.min(this.tapRatio * d, d)
						this.tapRatio = null
						pendingSeek = target
						applyPendingSeek()
					}
				}
			},
			onFinish() {
				if (activeCard === this) activeCard = null
				this.playing = false
				this.elapsed = 0
			}
		}
	}
</script>

<style lang="scss" scoped>
	.mc {
		background: $ti-card;
		border-radius: 40rpx;
		padding: 30rpx;
		box-shadow: $shadow-card;
	}

	/* ===== 头行: 记忆卡 + 更多 ===== */
	.mc-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.mc-date-title {
		flex: 1;
		min-width: 0;
		font-size: 32rpx;
		font-weight: 800;
		color: $ti-navy;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.mc-head-right {
		display: flex;
		align-items: center;
		gap: 14rpx;
		flex-shrink: 0;
	}
	.mc-star {
		font-size: 28rpx;
		color: $ti-accent;
	}
	.mc-more {
		display: flex;
		align-items: center;
		gap: 6rpx;
		padding: 8rpx;
	}
	.mc-more-dot {
		width: 8rpx;
		height: 8rpx;
		border-radius: 50%;
		background: #B9B2A0;
	}

	/* ===== 媒体行: 大圆角格 ===== */
	.mc-media {
		display: flex;
		gap: 14rpx;
		margin-top: 24rpx;
	}
	.mc-media-tile {
		position: relative;
		flex: 1;
		height: 200rpx;
		border-radius: 28rpx;
		overflow: hidden;
		background: $ti-bg;
	}
	.mc-media-img {
		width: 100%;
		height: 100%;
		display: block;
	}
	.mc-media-video {
		position: relative;
		width: 100%;
		height: 100%;
		background: linear-gradient(150deg, #3E566C, #26394B);
		/* 原生 video 不吃父容器圆角裁剪, 圆角直接写在视频元素上 */
		border-radius: 28rpx;
		overflow: hidden;
	}
	.mc-media-video-player {
		width: 100%;
		height: 100%;
		border-radius: 28rpx;
	}
	.mc-video-style {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.mc-video-playcircle {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.16);
		border: 2rpx solid rgba(255, 255, 255, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.mc-play-tri.sm {
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 10rpx 0 10rpx 16rpx;
		border-color: transparent transparent transparent #FFFFFF;
		margin-left: 4rpx;
	}
	.mc-video-dur {
		position: absolute;
		right: 12rpx;
		bottom: 10rpx;
		font-size: 20rpx;
		color: rgba(255, 255, 255, 0.92);
		background: rgba(0, 0, 0, 0.35);
		border-radius: 10rpx;
		padding: 2rpx 10rpx;
	}
	.mc-media-more {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(27, 43, 57, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.mc-media-more-text {
		color: #FFFFFF;
		font-size: 36rpx;
		font-weight: 800;
	}
	.mc-media-playbadge {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.4);
	}
	.mc-media-playbadge::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-40%, -50%);
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 11rpx 0 11rpx 18rpx;
		border-color: transparent transparent transparent #FFFFFF;
	}

	/* ===== 正文 ===== */
	.mc-content {
		display: -webkit-box;
		margin-top: 24rpx;
		font-size: $font-body;
		color: $ti-text-2;
		line-height: 1.7;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 4;
		overflow: hidden;
	}

	/* ===== 表情标签(薄荷胶囊) ===== */
	.mc-emotion {
		display: inline-flex;
		align-items: center;
		gap: 8rpx;
		margin-top: 20rpx;
		background: #EDF3F1;
		border-radius: 999rpx;
		padding: 10rpx 24rpx;
	}
	.mc-emotion-emoji {
		font-size: 28rpx;
		line-height: 1;
	}
	.mc-emotion-label {
		font-size: $font-small;
		font-weight: 600;
		color: #3E7373;
	}

	/* ===== 语音播放器 ===== */
	.mc-audio {
		margin-top: 20rpx;
	}
	.mc-audio-progress {
		display: flex;
		align-items: center;
	}
	.mc-audio-time {
		font-size: $font-small;
		color: $ti-text-3;
		flex-shrink: 0;
	}
	.mc-audio-time:first-child {
		margin-right: 12rpx;
	}
	.mc-audio-time:last-child {
		margin-left: 12rpx;
	}
	.mc-audio-hit {
		position: relative;
		flex: 1;
		padding: 14rpx 16rpx; /* 扩大点击热区; 水平内边距容纳 0%/100% 处伸出的滑块 */
	}
	.mc-audio-track {
		position: relative;
		height: 10rpx;
		border-radius: 5rpx;
		background: #EFE9DC;
	}
	.mc-audio-fill {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		border-radius: 5rpx;
		background: #F0995A;
	}
	.mc-audio-knob {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 26rpx;
		height: 26rpx;
		border-radius: 50%;
		background: #F0995A;
		border: 5rpx solid #FFFFFF;
		box-sizing: border-box;
		box-shadow: 0 2rpx 6rpx rgba(240, 153, 90, 0.45);
	}
	.mc-audio-controls {
		display: flex;
		align-items: center;
		justify-content: space-evenly;
		margin-top: 18rpx;
	}
	.mc-audio-heart {
		font-size: 40rpx;
		line-height: 1;
		color: #F0995A;
		padding: 8rpx;
		flex-shrink: 0;
		&.on {
			color: #E8705F;
		}
	}
	.mc-audio-skip {
		display: flex;
		align-items: center;
		padding: 10rpx;
		flex-shrink: 0;
		&.fwd {
			transform: rotate(180deg);
		}
	}
	.mc-skip-tri {
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 8rpx 12rpx 8rpx 0;
		border-color: transparent #4F8B8B transparent transparent;
	}
	.mc-skip-tri + .mc-skip-tri {
		margin-left: -6rpx;
	}
	.mc-audio-playbtn {
		width: 88rpx;
		height: 88rpx;
		border-radius: 44rpx;
		flex-shrink: 0;
		background: linear-gradient(135deg, #579292, #4A8282);
		box-shadow: 0 8rpx 18rpx rgba(79, 139, 139, 0.32);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.mc-audio-listbtn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 7rpx;
		padding: 10rpx;
		flex-shrink: 0;
	}
	.mc-list-line {
		width: 30rpx;
		height: 5rpx;
		border-radius: 3rpx;
		background: #4F8B8B;
	}
	.mc-list-line.short {
		width: 20rpx;
	}

	/* ===== 播放列表弹层 ===== */
	.mc-pl-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(27, 43, 57, 0.45);
		z-index: 1000;
		display: flex;
		align-items: flex-end;
	}
	.mc-pl-panel {
		width: 100%;
		background: #FFFDF7;
		border-radius: 48rpx 48rpx 0 0;
		padding: 30rpx 36rpx calc(44rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
		box-shadow: 0 -14rpx 40rpx rgba(27, 59, 87, 0.2);
	}
	.mc-pl-head {
		display: flex;
		align-items: center;
		margin-bottom: 10rpx;
	}
	.mc-pl-title {
		font-size: 36rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.mc-pl-count {
		margin-left: 16rpx;
		font-size: $font-small;
		color: $ti-text-3;
	}
	.mc-pl-close {
		margin-left: auto;
		font-size: 32rpx;
		color: #B9B2A0;
		padding: 8rpx;
	}
	.mc-pl-scroll {
		max-height: 50vh;
	}
	.mc-pl-item {
		display: flex;
		align-items: center;
		gap: 20rpx;
		padding: 22rpx 24rpx;
		border-radius: 24rpx;
		margin-top: 12rpx;
		&.on {
			background: #EDF3F1;
		}
	}
	.mc-pl-no {
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: #F1EDE2;
		color: $ti-text-3;
		font-size: 24rpx;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		&.on {
			background: linear-gradient(135deg, #579292, #4A8282);
			color: #FFFFFF;
		}
	}
	.mc-pl-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4rpx;
		min-width: 0;
	}
	.mc-pl-name {
		font-size: 30rpx;
		font-weight: 700;
		color: $ti-text;
		&.on {
			color: #3E7373;
			font-weight: 800;
		}
	}
	.mc-pl-dur {
		font-size: $font-small;
		color: $ti-text-3;
	}
	.mc-pl-check {
		color: #F0995A;
		font-size: 32rpx;
		font-weight: 800;
	}
	.mc-play-tri {
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 15rpx 0 15rpx 24rpx;
		border-color: transparent transparent transparent #FFFFFF;
		margin-left: 9rpx;
	}
	.mc-pause {
		display: flex;
	}
	.mc-pause-bar {
		width: 8rpx;
		height: 30rpx;
		border-radius: 3rpx;
		background: #FFFFFF;
		margin: 0 5rpx;
	}
</style>
