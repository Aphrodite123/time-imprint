<template>
	<view class="cr">
		<nav-bar title="创建时光印记" />
		<memory-form @saved="onSaved" />
	</view>
</template>

<script>
	// 创建时光印记(与编辑页共用 memory-form)
	export default {
		methods: {
			onSaved() {}
		}
	}
</script>

<style lang="scss" scoped>
	.cr {
		min-height: 100vh;
		background: $ti-bg;
	}
</style>
