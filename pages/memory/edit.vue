<template>
	<view class="ed">
		<nav-bar title="编辑时光印记" />
		<memory-form v-if="memoryId" :memory-id="memoryId" />
	</view>
</template>

<script>
	// 编辑时光印记:与创建页同一表单组件,回填已有数据(PRD 3.3.1)
	export default {
		data() {
			return { memoryId: '' }
		},
		onLoad(opt) {
			this.memoryId = opt.id || ''
			if (!this.memoryId) uni.navigateBack()
		}
	}
</script>

<style lang="scss" scoped>
	.ed {
		min-height: 100vh;
		background: $ti-bg;
	}
</style>
