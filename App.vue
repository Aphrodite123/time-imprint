<script>
	import { initDB } from './utils/db'
	import { store, loadUser } from './store'

	export default {
		onLaunch() {
			// 初始化本地数据库并载入用户档案
			initDB().then(() => loadUser()).catch(console.error)
		},
		onShow() {},
		onHide() {}
	}
</script>

<style>
	/* ==================== 全局公共样式(暖米白 × 青绿 × 暖橙) ==================== */
	page {
		background: #F7F1E3;
		color: #1B3B57;
		font-size: 28rpx;
		font-family: -apple-system, 'Source Han Sans SC', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
	}

	/* 通用卡片 */
	.ti-card {
		background: #FFFFFF;
		border-radius: 48rpx;
		padding: 36rpx;
		box-shadow: 0 10rpx 30rpx rgba(27, 59, 87, 0.08);
	}

	/* 主按钮(青绿胶囊) */
	.ti-btn {
		height: 108rpx;
		line-height: 108rpx;
		text-align: center;
		border-radius: 999rpx;
		font-size: 30rpx;
		font-weight: 700;
		letter-spacing: 4rpx;
		background: linear-gradient(135deg, #579292 0%, #4A8282 100%);
		color: #FFFFFF;
		box-shadow: 0 12rpx 26rpx rgba(79, 139, 139, 0.35);
	}
	.ti-btn::after { border: none; }
	.ti-btn.disabled {
		background: #D8D2C2;
		color: #FFFFFF;
		box-shadow: none;
	}

	/* 橙色胶囊按钮 */
	.ti-btn-orange {
		background: linear-gradient(135deg, #F2A262 0%, #EC9048 100%);
		box-shadow: 0 12rpx 26rpx rgba(240, 153, 90, 0.35);
	}

	/* 蓝灰胶囊按钮(引导页) */
	.ti-btn-blue {
		background: linear-gradient(135deg, #5E82A6 0%, #52749A 100%);
		box-shadow: 0 12rpx 26rpx rgba(88, 124, 160, 0.32);
	}

	/* 次级按钮(描边胶囊) */
	.ti-btn-outline {
		background: #FFFFFF;
		border: 3rpx solid #BFD8D6;
		color: #4F8B8B;
		box-shadow: none;
	}

	/* 标签(青绿雾底) */
	.ti-tag {
		display: inline-flex;
		align-items: center;
		padding: 6rpx 20rpx;
		border-radius: 20rpx;
		font-size: 24rpx;
		font-weight: 600;
		background: #EDF3F1;
		color: #3E7373;
	}
	/* 橙色标签 */
	.ti-tag-accent {
		background: #FAE8D2;
		color: #B4692E;
	}

	/* 分割线 */
	.ti-divider {
		height: 2rpx;
		background: #EFE9DC;
	}

	/* 页面主内容容器 */
	.ti-page {
		padding: 32rpx;
		box-sizing: border-box;
	}

	/* 页面大标题 + 副标题 */
	.ti-page-title {
		font-size: 52rpx;
		font-weight: 800;
		color: #1B3B57;
		letter-spacing: 1rpx;
	}
	.ti-page-sub {
		display: block;
		margin-top: 10rpx;
		font-size: 26rpx;
		color: #9FA6AC;
	}

	/* ==================== 导航栏工具行(nav-bar #tools 插槽通用) ==================== */
	/* 顶部工具按钮统一放在 .nb-tools-group 内横排; 布局位置(同行/标题下方)由 nav-bar 自适应决定 */
	.nb-tools-group {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 24rpx;
	}
	.nb-tool {
		position: relative;
		width: 64rpx;
		height: 64rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.nb-tool image {
		width: 44rpx;
		height: 44rpx;
	}
	/* 铃铛右上角橙点提醒 */
	.nb-tool-dot {
		position: absolute;
		top: 2rpx;
		right: 2rpx;
		width: 14rpx;
		height: 14rpx;
		border-radius: 50%;
		background: #F0995A;
		border: 3rpx solid #F7F1E3;
		box-sizing: border-box;
	}
</style>
