<template>
	<view class="mf">
		<!-- 发生日期 -->
		<picker mode="date" :value="eventDate" start="1900-01-01" end="2100-12-31" @change="onDateChange">
			<view class="mf-card mf-date-row">
				<text class="mf-date-text">发生日期：{{ fmtCN(eventDate) }}</text>
				<view class="mf-date-dot"></view>
			</view>
		</picker>

		<!-- 正文输入 -->
		<view class="mf-card mf-content-card">
			<textarea
				v-model="content"
				class="mf-input"
				placeholder="写下当时的故事、心情、感悟……"
				placeholder-class="mf-placeholder"
				maxlength="2000"
				auto-height
			/>
		</view>

		<!-- 多媒体工具栏 -->
		<view class="mf-toolbar">
			<view class="mf-tool" @click="addImages">
				<view class="mf-tool-tile white">
					<image class="mf-tool-icon" src="/static/tools/image.png" mode="aspectFit" />
				</view>
				<text class="mf-tool-label">图片</text>
			</view>
			<view class="mf-tool" @click="addVideo">
				<view class="mf-tool-tile orange">
					<image class="mf-tool-icon" src="/static/tools/video.png" mode="aspectFit" />
				</view>
				<text class="mf-tool-label">视频</text>
			</view>
			<view class="mf-tool" @click="onVoiceTool">
				<view class="mf-tool-tile teal">
					<image class="mf-tool-icon" src="/static/tools/voice.png" mode="aspectFit" />
				</view>
				<text class="mf-tool-label">语音</text>
			</view>
			<view class="mf-tool" @click="emotionVisible = true">
				<view class="mf-tool-tile teal">
					<image class="mf-tool-icon" src="/static/tools/smile.png" mode="aspectFit" />
				</view>
				<text class="mf-tool-label">表情</text>
			</view>
		</view>

		<!-- 已选媒体预览 -->
		<view v-if="images.length" class="mf-card">
			<view class="mf-thumb-grid">
				<view v-for="(img, i) in images" :key="i" class="mf-thumb">
					<image :src="img" mode="aspectFill" class="mf-thumb-img" @click="previewImage(i)" />
					<view class="mf-thumb-del" @click="removeImage(i)">×</view>
				</view>
			</view>
		</view>
		<view v-if="video" class="mf-card mf-row-card">
			<text class="mf-row-text">🎬 视频已添加</text>
			<text class="mf-row-del" @click="removeVideo">删除</text>
		</view>
		<view v-if="voice" class="mf-card mf-row-card">
			<voice-bar :src="voice.url" :duration="voice.duration" class="mf-voice-bar" />
			<text class="mf-row-del" @click="removeVoice">删除</text>
		</view>
		<view v-if="emotion" class="mf-card mf-row-card">
			<text class="mf-emotion-emoji">{{ emotionOf(emotion).emoji }}</text>
			<text class="mf-emotion-label">{{ emotionOf(emotion).label }}</text>
			<text class="mf-row-del" @click="setEmotion('')">清除</text>
		</view>

		<!-- 人生阶段 -->
		<view class="mf-section-row">
			<text class="mf-section-title">人生阶段</text>
			<text class="mf-section-tip">{{ stageManual ? '已手动选择' : '根据日期自动推算' }}</text>
		</view>
		<scroll-view scroll-x class="mf-stage-scroll">
			<view
				v-for="s in stageOptions"
				:key="s"
				:class="['mf-stage-chip', stage === s ? 'on' : '']"
				@click="pickStage(s)"
			>
				{{ s }}
				<view v-if="stage === s" class="mf-stage-diamond"></view>
			</view>
		</scroll-view>

		<!-- 高光开关 -->
		<view class="mf-card mf-highlight-row">
			<view class="mf-highlight-left">
				<view class="mf-highlight-badge">!</view>
				<text class="mf-highlight-label">标记为高光时刻</text>
			</view>
			<switch :checked="isHighlight" color="#4F8B8B" @change="e => (isHighlight = e.detail.value)" />
		</view>

		<!-- 保存 -->
		<view class="mf-save ti-btn" @click="save">保存印记</view>

		<emotion-picker v-model:visible="emotionVisible" :selected="emotion" @select="setEmotion" />

		<!-- 语音录制弹层 -->
		<view v-if="recording" class="vf-mask">
			<view class="vf-panel" @click.stop>
				<view class="vf-grab"></view>
				<view class="vf-head">
					<text class="vf-title">录制语音</text>
					<text class="vf-close" @click="cancelRecording">✕</text>
				</view>
				<view class="vf-mic-wrap">
					<view class="vf-ring vf-ring-outer"></view>
					<view class="vf-ring vf-ring-dash"></view>
					<view class="vf-mic">
						<image class="vf-mic-icon" src="/static/tools/voice.png" mode="aspectFit" />
					</view>
					<view class="vf-dot"></view>
				</view>
				<text class="vf-timer">{{ recordTimeText }}</text>
				<text class="vf-tip">正在录制 · 说完点击完成</text>
				<view class="vf-wave">
					<view v-for="(h, i) in waveBars" :key="i" :class="['vf-bar', i % 3 === 0 ? 'o' : '']" :style="{ height: h + 'rpx' }"></view>
				</view>
				<view class="vf-actions">
					<view class="vf-cancel" @click="cancelRecording">取 消</view>
					<view class="vf-ok" @click="finishRecording">完 成</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	// 时光印记表单:创建/编辑共用(编辑模式传 memoryId 回填)
	import { getMemory, addMemory, updateMemory, addMedia, deleteMedia, setHighlight } from '../../utils/db'
	import { chooseImages, chooseVideo, persistFile, startRecord, removeFile } from '../../utils/media'
	import { fmtCN, today } from '../../utils/date'
	import { STAGES, FUTURE_STAGE, emotionOf, stageOfEvent } from '../../utils/stage'
	import { store } from '../../store'

	export default {
		name: 'memory-form',
		props: {
			memoryId: { type: String, default: '' }
		},
		data() {
			return {
				eventDate: today(),
				content: '',
				images: [],
				video: null,
				voice: null,
				emotion: '',
				stage: '',
				stageManual: false,
				isHighlight: false,
				recording: false,
				recordHandle: null,
				recordSeconds: 0,
				recordTimer: null,
				waveBars: [12, 20, 28, 16, 34, 22, 38, 18, 30, 24, 40, 16, 28, 20, 34, 14, 24, 18],
				emotionVisible: false,
				loaded: false,
				existingUrls: [] // 编辑模式:已持久化的媒体路径,保存时直接复用
			}
		},
		computed: {
			stageOptions() {
				return STAGES.map(s => s.label).concat([FUTURE_STAGE.label])
			},
			recordTimeText() {
				const m = Math.floor(this.recordSeconds / 60)
				const r = this.recordSeconds % 60
				return `${m < 10 ? '0' + m : m}:${r < 10 ? '0' + r : r}`
			}
		},
		mounted() {
			if (this.memoryId) this.load()
			else this.autoDetectStage()
		},
		beforeUnmount() {
			this.clearRecordTimer()
		},
		methods: {
			emotionOf,
			fmtCN,
			async load() {
				const m = await getMemory(this.memoryId)
				if (!m) return
				this.eventDate = m.eventDate
				this.content = m.content || ''
				this.emotion = m.emotion || ''
				this.stage = m.lifeStage || ''
				this.stageManual = true
				this.isHighlight = !!m.isHighlight
				this.images = m.medias.filter(x => x.type === 'image').map(x => x.url)
				const v = m.medias.find(x => x.type === 'video')
				this.video = v ? { url: v.url, duration: v.duration } : null
				const vo = m.medias.find(x => x.type === 'voice')
				this.voice = vo ? { url: vo.url, duration: vo.duration } : null
				this.existingUrls = m.medias.map(x => x.url)
				this.loaded = true
			},
			// 根据出生日期与事件日期自动推算人生阶段
			autoDetectStage() {
				if (this.stageManual) return
				const birth = store.user && store.user.birthDate
				const s = birth ? stageOfEvent(birth, this.eventDate) : null
				this.stage = s ? s.label : ''
			},
			onDateChange(e) {
				this.eventDate = e.detail.value
				this.autoDetectStage()
			},
			pickStage(label) {
				this.stage = label
				this.stageManual = true
			},
			setEmotion(key) {
				this.emotion = key
				this.emotionVisible = false
			},
			async addImages() {
				if (this.images.length >= 9) return uni.showToast({ title: '最多添加 9 张图片', icon: 'none' })
				try {
					const paths = await chooseImages(9 - this.images.length)
					this.images = this.images.concat(paths)
				} catch (e) {}
			},
			previewImage(i) {
				uni.previewImage({ urls: this.images, current: i })
			},
			removeImage(i) {
				const [p] = this.images.splice(i, 1)
				if (this.loaded) removeFile(p)
			},
			async addVideo() {
				if (this.video) return uni.showToast({ title: '已添加视频,请先删除', icon: 'none' })
				try {
					this.video = await chooseVideo()
				} catch (e) {}
			},
			removeVideo() {
				if (this.loaded) removeFile(this.video.url)
				this.video = null
			},
			/* ============ 语音录制(弹层交互) ============ */
			async onVoiceTool() {
				if (this.recording) return
				if (this.voice) return uni.showToast({ title: '已有录音,请先删除', icon: 'none' })
				try {
					this.recordHandle = await startRecord()
					this.recording = true
					this.recordSeconds = 0
					this.clearRecordTimer()
					this.recordTimer = setInterval(() => {
						this.recordSeconds++
						// 最长 5 分钟自动完成
						if (this.recordSeconds >= 300) this.finishRecording()
					}, 1000)
				} catch (e) {
					uni.showToast({ title: e.message || '录音失败,请检查麦克风权限', icon: 'none' })
				}
			},
			clearRecordTimer() {
				if (this.recordTimer) {
					clearInterval(this.recordTimer)
					this.recordTimer = null
				}
			},
			async finishRecording() {
				if (!this.recording) return
				const seconds = this.recordSeconds
				const path = await this.recordHandle.stop()
				this.clearRecordTimer()
				this.recording = false
				this.recordSeconds = 0
				if (path) {
					const url = await persistFile(path, 'mp3')
					this.voice = { url, duration: seconds }
				}
			},
			async cancelRecording() {
				if (!this.recording) return
				await this.recordHandle.stop() // 丢弃录音
				this.clearRecordTimer()
				this.recording = false
				this.recordSeconds = 0
			},
			removeVoice() {
				if (this.loaded) removeFile(this.voice.url)
				this.voice = null
			},
			async save() {
				// 校验:文字与媒体至少一项(PRD 3.8)
				const hasMedia = this.images.length || this.video || this.voice
				if (!this.content.trim() && !hasMedia) {
					return uni.showToast({ title: '请填写文字或添加媒体素材', icon: 'none' })
				}
				uni.showLoading({ title: '保存中', mask: true })
				try {
					// 持久化媒体文件到应用私有目录(编辑模式下已有文件直接复用)
					const isExisting = url => this.loaded && this.existingUrls.includes(url)
					const imageUrls = []
					for (const p of this.images) {
						imageUrls.push(isExisting(p) ? p : await persistFile(p))
					}
					let videoSaved = null
					if (this.video) {
						videoSaved = isExisting(this.video.url)
							? this.video
							: { url: await persistFile(this.video.url, 'mp4'), duration: this.video.duration }
					}
					let voiceSaved = null
					if (this.voice) {
						voiceSaved = isExisting(this.voice.url)
							? this.voice
							: { url: await persistFile(this.voice.url, 'mp3'), duration: this.voice.duration }
					}

					// 标题取正文首行
					const firstLine = this.content.trim().split('\n')[0] || ''
					const title = firstLine.slice(0, 20)

					const data = {
						eventDate: this.eventDate,
						title,
						content: this.content.trim(),
						emotion: this.emotion,
						lifeStage: this.stage,
						isHighlight: this.isHighlight ? 1 : 0
					}

					let memoryId = this.memoryId
					if (memoryId) {
						await updateMemory(memoryId, data)
					} else {
						const m = await addMemory(data)
						memoryId = m.memoryId
					}

					// 编辑模式:清理旧媒体记录后重建
					if (this.loaded) {
						const old = await getMemory(memoryId)
						for (const md of old.medias) await deleteMedia(md.mediaId)
					}
					let sort = 0
					for (const url of imageUrls) {
						await addMedia({ memoryId, type: 'image', url, thumbnailUrl: '', sort: sort++ })
					}
					if (videoSaved) {
						await addMedia({ memoryId, type: 'video', url: videoSaved.url, duration: videoSaved.duration || 0, sort: sort++ })
					}
					if (voiceSaved) {
						await addMedia({ memoryId, type: 'voice', url: voiceSaved.url, duration: voiceSaved.duration || 0, sort: sort++ })
					}
					await setHighlight(memoryId, this.isHighlight, title)

					uni.hideLoading()
					uni.showToast({ title: '已保存', icon: 'success' })
					this.$emit('saved', memoryId)
					if (!this.memoryId) this.reset()
					setTimeout(() => {
						if (this.memoryId) uni.navigateBack()
						else uni.navigateBack()
					}, 600)
				} catch (e) {
					uni.hideLoading()
					uni.showToast({ title: '保存失败:' + (e.message || e), icon: 'none' })
				}
			},
			reset() {
				this.eventDate = today()
				this.content = ''
				this.images = []
				this.video = null
				this.voice = null
				this.emotion = ''
				this.stage = ''
				this.stageManual = false
				this.isHighlight = false
				this.autoDetectStage()
			}
		}
	}
</script>

<style lang="scss" scoped>
	.mf {
		padding: 16rpx $page-pad calc(64rpx + env(safe-area-inset-bottom));
	}
	.mf-card {
		background: $ti-card;
		border-radius: 40rpx;
		padding: 34rpx;
		margin-bottom: 28rpx;
		box-shadow: $shadow-card;
	}
	.mf-date-row {
		display: flex;
		align-items: center;
	}
	.mf-date-text {
		font-size: 32rpx;
		font-weight: 700;
		color: $ti-navy;
	}
	.mf-date-dot {
		margin-left: auto;
		width: 26rpx;
		height: 26rpx;
		border-radius: 50%;
		background: $ti-accent;
	}
	.mf-content-card {
		min-height: 380rpx;
	}
	.mf-input {
		width: 100%;
		min-height: 300rpx;
		font-size: 30rpx;
		line-height: 1.8;
		color: $ti-text;
	}
	.mf-placeholder {
		color: #B9B2A0;
	}

	/* 工具栏 */
	.mf-toolbar {
		display: flex;
		gap: 22rpx;
		margin-bottom: 30rpx;
	}
	.mf-tool {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14rpx;
	}
	.mf-tool-tile {
		width: 100%;
		height: 150rpx;
		border-radius: 40rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.mf-tool-tile.white {
		background: #FFFFFF;
		box-shadow: $shadow-card;
	}
	.mf-tool-tile.orange {
		background: $ti-accent-light;
	}
	.mf-tool-tile.teal {
		background: linear-gradient(135deg, #579292, #4A8282);
		box-shadow: 0 8rpx 18rpx rgba(79, 139, 139, 0.28);
	}
	.mf-tool-icon {
		width: 56rpx;
		height: 56rpx;
	}
	.mf-tool-label {
		font-size: 26rpx;
		font-weight: 700;
		color: $ti-navy;
	}

	/* 媒体预览 */
	.mf-thumb-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
	}
	.mf-thumb {
		position: relative;
		width: calc((100% - 32rpx) / 3);
	}
	.mf-thumb-img {
		width: 100%;
		height: 180rpx;
		border-radius: 32rpx;
		background: $ti-bg;
	}
	.mf-thumb-del {
		position: absolute;
		top: -12rpx;
		right: -12rpx;
		width: 44rpx;
		height: 44rpx;
		line-height: 44rpx;
		text-align: center;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.55);
		color: #FFFFFF;
		font-size: 28rpx;
	}
	.mf-row-card {
		display: flex;
		align-items: center;
		gap: 24rpx;

		voice-bar {
			flex: 1;
		}
	}
	.mf-voice-bar {
		flex: 1;
	}
	.mf-row-text {
		font-size: $font-body;
		color: $ti-text;
	}
	.mf-row-del {
		margin-left: auto;
		font-size: $font-small;
		color: $ti-danger;
		padding: 8rpx;
	}
	.mf-emotion-emoji {
		font-size: 48rpx;
	}
	.mf-emotion-label {
		margin-left: 16rpx;
		font-size: $font-body;
		color: $ti-text-2;
	}

	/* 人生阶段 */
	.mf-section-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 12rpx 4rpx 22rpx;
	}
	.mf-section-title {
		font-size: 34rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.mf-section-tip {
		font-size: $font-small;
		color: $ti-text-3;
	}
	.mf-stage-scroll {
		display: flex;
		white-space: nowrap;
		margin-bottom: 30rpx;
		box-sizing: border-box;
	}
	.mf-stage-chip {
		position: relative;
		display: inline-block;
		padding: 20rpx 36rpx;
		margin-right: 18rpx;
		border-radius: 34rpx;
		font-size: 28rpx;
		font-weight: 700;
		color: $ti-text-2;
		background: $ti-card;
		box-shadow: $shadow-card;
		&.on {
			background: linear-gradient(150deg, #579292, #3E7373);
			color: #FFFFFF;
		}
	}
	.mf-stage-diamond {
		position: absolute;
		top: 10rpx;
		right: 10rpx;
		width: 16rpx;
		height: 16rpx;
		border: 3rpx solid rgba(255, 255, 255, 0.85);
		transform: rotate(45deg);
		border-radius: 4rpx;
	}

	/* 高光开关 */
	.mf-highlight-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-radius: 999rpx;
		padding: 26rpx 34rpx;
	}
	.mf-highlight-left {
		display: flex;
		align-items: center;
		gap: 22rpx;
	}
	.mf-highlight-badge {
		width: 48rpx;
		height: 48rpx;
		border-radius: 50%;
		border: 4rpx solid $ti-accent;
		color: $ti-accent;
		font-size: 28rpx;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}
	.mf-highlight-label {
		font-size: 30rpx;
		font-weight: 700;
		color: $ti-navy;
	}
	.mf-save {
		margin-top: 40rpx;
	}

	/* ============ 语音录制弹层 ============ */
	.vf-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(27, 43, 57, 0.45);
		z-index: 999;
		display: flex;
		align-items: flex-end;
	}
	.vf-panel {
		width: 100%;
		background: #FFFDF7;
		border-radius: 56rpx 56rpx 0 0;
		padding: 24rpx 48rpx calc(44rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
		box-shadow: 0 -14rpx 40rpx rgba(27, 59, 87, 0.2);
	}
	.vf-grab {
		width: 88rpx;
		height: 10rpx;
		border-radius: 6rpx;
		background: #E3DCCB;
		margin: 0 auto;
	}
	.vf-head {
		display: flex;
		align-items: center;
		margin-top: 24rpx;
	}
	.vf-title {
		font-size: 36rpx;
		font-weight: 800;
		color: $ti-navy;
	}
	.vf-close {
		margin-left: auto;
		font-size: 34rpx;
		color: #B9B2A0;
		padding: 8rpx;
	}
	.vf-mic-wrap {
		position: relative;
		width: 300rpx;
		height: 300rpx;
		margin: 40rpx auto 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.vf-ring {
		position: absolute;
		border-radius: 50%;
	}
	.vf-ring-outer {
		inset: 0;
		border: 3rpx solid $ti-primary-light;
	}
	.vf-ring-dash {
		inset: 34rpx;
		border: 3rpx dashed #BFDBD8;
	}
	.vf-mic {
		width: 176rpx;
		height: 176rpx;
		border-radius: 50%;
		background: linear-gradient(135deg, #579292, #4A8282);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: $shadow-primary;
		animation: vfBreath 1.6s ease-in-out infinite;
	}
	.vf-mic-icon {
		width: 68rpx;
		height: 68rpx;
	}
	@keyframes vfBreath {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.06); }
	}
	.vf-dot {
		position: absolute;
		top: 8rpx;
		right: 36rpx;
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		background: $ti-accent;
	}
	.vf-timer {
		display: block;
		margin-top: 32rpx;
		text-align: center;
		font-size: 60rpx;
		font-weight: 800;
		color: $ti-navy;
		letter-spacing: 4rpx;
	}
	.vf-tip {
		display: block;
		margin-top: 10rpx;
		text-align: center;
		font-size: $font-small;
		color: $ti-text-3;
	}
	.vf-wave {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		height: 88rpx;
		margin-top: 28rpx;
	}
	.vf-bar {
		width: 8rpx;
		border-radius: 4rpx;
		background: $ti-primary;
	}
	.vf-bar.o {
		background: $ti-accent;
	}
	.vf-actions {
		display: flex;
		gap: 28rpx;
		margin-top: 44rpx;
	}
	.vf-cancel,
	.vf-ok {
		flex: 1;
		height: 92rpx;
		line-height: 92rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: $font-body;
		font-weight: 700;
		letter-spacing: 4rpx;
	}
	.vf-cancel {
		background: #FFFFFF;
		border: 3rpx solid #BFD8D6;
		color: $ti-primary;
		box-sizing: border-box;
	}
	.vf-ok {
		background: linear-gradient(135deg, #579292 0%, #4A8282 100%);
		color: #FFFFFF;
		box-shadow: $shadow-primary;
	}
</style>
