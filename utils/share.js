/**
 * 小程序转发/朋友圈分享配置(转发给朋友/分享到朋友圈)
 * 本应用数据全部保存在用户本地设备、无后端: 好友打开分享卡片进入的是他自己设备上的数据,
 * 因此统一分享首页作应用推广, 不携带任何记录内容;
 * 封面固定用品牌图, 避免微信默认采用当前页面截图而泄露私人日记内容
 */
const SHARE_TITLE = '时光印记｜镌刻一生点滴，看见自己的成长'
const SHARE_IMAGE = '/static/share-cover.jpg'

// 转发给朋友
export function appShare() {
	return {
		title: SHARE_TITLE,
		path: '/pages/index/index',
		imageUrl: SHARE_IMAGE
	}
}

// 分享到朋友圈(单页模式打开, 同样落到首页推广)
export function appShareTimeline() {
	return {
		title: SHARE_TITLE,
		query: '',
		imageUrl: SHARE_IMAGE
	}
}
