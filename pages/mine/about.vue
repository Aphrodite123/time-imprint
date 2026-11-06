<template>
	<view class="ab">
		<view class="ab-head">
			<image class="ab-logo" src="/static/logo.png" mode="aspectFit" />
			<text class="ab-name">时光印纪</text>
			<text class="ab-slogan">镌刻一生点滴,看见自己的成长</text>
			<text class="ab-version">版本 1.0.0</text>
		</view>

		<view class="ti-card ab-card">
			<text class="ab-card-title">产品介绍</text>
			<text class="ab-card-text">时光印纪是一款私人人生成长记录工具。专注完整生命周期记录:出生、童年、求学、工作、家庭、暮年直至生命终点。支持文字、图片、视频、语音、表情标签多形式留存记忆,串联零散片段形成完整人生故事。</text>
		</view>

		<view class="ti-card ab-card">
			<text class="ab-card-title">隐私承诺</text>
			<text class="ab-card-text">纯私人记录,无社交广场。所有数据默认保存在你的设备本地,没有公开分享,没有任何人可以看到你的人生档案。</text>
		</view>
	</view>
</template>

<script>
	// 关于
	export default {}
</script>

<style lang="scss" scoped>
	.ab {
		min-height: 100vh;
		background: $ti-bg;
		padding: 80rpx $page-pad 60rpx;
		box-sizing: border-box;
	}
	.ab-head {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 48rpx;
	}
	.ab-logo {
		width: 200rpx;
		height: 260rpx;
	}
	.ab-name {
		margin-top: 16rpx;
		font-size: $font-title;
		font-weight: bold;
		color: $ti-primary;
	}
	.ab-slogan {
		margin-top: 16rpx;
		font-size: $font-body;
		color: $ti-text-2;
	}
	.ab-version {
		margin-top: 12rpx;
		font-size: $font-small;
		color: $ti-text-3;
	}
	.ab-card {
		margin-bottom: 24rpx;
	}
	.ab-card-title {
		display: block;
		font-size: $font-sub;
		font-weight: 500;
		color: $ti-text;
		margin-bottom: 16rpx;
	}
	.ab-card-text {
		font-size: $font-body;
		color: $ti-text-2;
		line-height: 1.8;
	}
</style>
