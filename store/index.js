import { reactive } from 'vue'
import { getUser } from '../utils/db'

// 全局轻量状态:用户档案(db 初始化后载入)
export const store = reactive({
	user: null, // {userId, nickname, avatar, birthDate, gender, status}
	ready: false
})

export async function loadUser() {
	try {
		store.user = await getUser()
	} catch (e) {
		store.user = null
	}
	store.ready = true
	return store.user
}

export async function refreshUser() {
	await loadUser()
	return store.user
}
