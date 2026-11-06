<template>
	<view class="pf">
		<nav-bar :title="isFirst ? '' : '个人档案'" :back="!isFirst" />
		<!-- 头像 -->
		<view class="pf-avatar-wrap" @click="chooseAvatar">
			<image class="pf-avatar" :src="avatar || '/static/logo.png'" mode="aspectFill" />
			<view class="pf-avatar-edit">编辑</view>
		</view>

		<!-- 表单 -->
		<view class="ti-card pf-form">
			<view class="pf-row">
				<text class="pf-label">昵称</text>
				<input v-model="nickname" class="pf-input" placeholder="怎么称呼你" placeholder-class="pf-placeholder" maxlength="20" />
			</view>
			<view class="ti-divider"></view>
			<view class="pf-row">
				<text class="pf-label">出生日期</text>
				<picker mode="date" :value="birthDate" start="1900-01-01" :end="today" @change="e => (birthDate = e.detail.value)">
					<text :class="['pf-value', birthDate ? '' : 'empty']">{{ birthDate ? fmtCN(birthDate) : '选择(可不填,稍后补填)' }}</text>
				</picker>
			</view>
			<view class="ti-divider"></view>
			<view class="pf-row" @click="pickGender">
				<text class="pf-label">性别</text>
				<text :class="['pf-value', gender ? '' : 'empty']">{{ gender || '保密' }}</text>
			</view>
			<view class="ti-divider"></view>
			<view class="pf-row">
				<text class="pf-label">个人状态</text>
				<input v-model="status" class="pf-input" placeholder="一句话,展示在首页" placeholder-class="pf-placeholder" maxlength="30" />
			</view>
		</view>

		<view class="pf-tip">所有资料只保存在你的设备上,不会公开</view>
		<view class="ti-btn pf-save" @click="save">{{ isFirst ? '开始记录' : '保存' }}</view>
	</view>
</template>

<script>
	// 个人档案:首次填写与编辑共用(PRD 3.3.4)
	import { saveUser } from '../../utils/db'
	import { chooseImages, persistFile } from '../../utils/media'
	import { fmtCN, today } from '../../utils/date'
	import { store, loadUser, refreshUser } from '../../store'

	export default {
		data() {
			return {
				nickname: '',
				avatar: '',
				birthDate: '',
				gender: '',
				status: '',
				isFirst: false
			}
		},
		computed: {
			today() {
				return today()
			}
		},
		async onLoad(opt) {
			this.isFirst = opt.first === '1'
			if (!store.ready) await loadUser()
			const u = store.user
			if (u) {
				this.nickname = u.nickname || ''
				this.avatar = u.avatar || ''
				this.birthDate = u.birthDate || ''
				this.gender = u.gender || ''
				this.status = u.status || ''
			}
		},
		methods: {
			fmtCN,
			async chooseAvatar() {
				try {
					const paths = await chooseImages(1)
					if (paths.length) this.avatar = await persistFile(paths[0])
				} catch (e) {}
			},
			pickGender() {
				const options = ['女', '男', '保密']
				uni.showActionSheet({
					itemList: options,
					success: r => {
						this.gender = options[r.tapIndex]
					}
				})
			},
			async save() {
				if (!this.nickname.trim()) {
					return uni.showToast({ title: '给自己一个昵称吧', icon: 'none' })
				}
				// 未填出生日期允许后续补填,不强制阻断(异常场景 3.8)
				await saveUser({
					nickname: this.nickname.trim(),
					avatar: this.avatar,
					birthDate: this.birthDate,
					gender: this.gender,
					status: this.status.trim()
				})
				await refreshUser()
				uni.showToast({ title: '已保存', icon: 'success' })
				setTimeout(() => {
					if (this.isFirst) {
						uni.reLaunch({ url: '/pages/index/index' })
					} else {
						uni.navigateBack()
					}
				}, 600)
			}
		}
	}
</script>

<style lang="scss" scoped>
	.pf {
		min-height: 100vh;
		background: $ti-bg;
		padding: 12rpx $page-pad 60rpx;
		box-sizing: border-box;
	}
	.pf-avatar-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.pf-avatar {
		width: 180rpx;
		height: 180rpx;
		border-radius: 50%;
		background: $ti-primary-light;
		border: 6rpx solid #FFFFFF;
		box-shadow: $shadow-card;
	}
	.pf-avatar-edit {
		margin-top: 16rpx;
		font-size: $font-small;
		color: $ti-primary;
		background: $ti-primary-light;
		border-radius: 999rpx;
		padding: 6rpx 28rpx;
	}
	.pf-form {
		margin-top: 48rpx;
		padding: 8rpx $card-pad;
	}
	.pf-row {
		display: flex;
		align-items: center;
		padding: 32rpx 0;
	}
	.pf-label {
		width: 180rpx;
		font-size: $font-body;
		color: $ti-text;
		flex-shrink: 0;
	}
	.pf-input {
		flex: 1;
		font-size: $font-body;
		color: $ti-text;
		text-align: right;
	}
	.pf-value {
		font-size: $font-body;
		color: $ti-text;
	}
	.pf-value.empty {
		color: $ti-text-3;
	}
	.pf-placeholder {
		color: $ti-text-3;
	}
	.pf-tip {
		margin-top: 32rpx;
		text-align: center;
		font-size: $font-small;
		color: $ti-text-3;
	}
	.pf-save {
		margin-top: 48rpx;
	}
</style>
