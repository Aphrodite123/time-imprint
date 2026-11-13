/**
 * 自定义导航栏度量工具
 * 微信小程序端右上角有系统胶囊按钮("···" | ◎),自定义导航的右上角内容需要横向避让;
 * App / H5 端没有胶囊,rightInset 恒为 0,保持原布局完全不变。
 */
export function getNavMetrics() {
	const sys = uni.getSystemInfoSync()
	const m = {
		statusBarHeight: sys.statusBarHeight || 20,
		rightInset: 0, // 右侧避让宽度(px),0 表示无需避让
		capsuleTop: 0, // 胶囊上缘(px),用于右上角图标垂直居中对齐
		capsuleHeight: 0 // 胶囊高度(px)
	}
	// #ifdef MP-WEIXIN
	try {
		const rect = uni.getMenuButtonBoundingClientRect()
		if (rect && rect.width) {
			// 内容右缘收至胶囊左缘左侧 8px
			m.rightInset = sys.windowWidth - rect.left + 8
			m.capsuleTop = rect.top
			m.capsuleHeight = rect.height
		}
	} catch (e) {}
	// #endif
	return m
}
