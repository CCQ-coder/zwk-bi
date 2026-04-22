import axios from 'axios'
import { ElMessage } from 'element-plus'
import { clearAuthSession, getAuthToken } from '../utils/auth-session'

// 创建 axios 实例，统一设置 baseURL 与超时
const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

let handlingUnauthorized = false

const handleUnauthorized = (message: string) => {
  clearAuthSession()
  if (handlingUnauthorized) return
  handlingUnauthorized = true
  ElMessage.error(message || '登录状态已失效，请重新登录')
  const currentPath = window.location.pathname
  const currentSearch = window.location.search
  if (currentPath.startsWith('/preview/') && currentSearch.includes('token=')) {
    window.location.reload()
    return
  }
  if (currentPath !== '/login') {
    window.location.href = '/login'
    return
  }
  handlingUnauthorized = false
}

// 请求拦截器：自动附加 token（若存在）
request.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一处理错误弹窗，解包 data 字段
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 0) {
      if (res.code === 40100) {
        handleUnauthorized(res.message || '登录状态已失效，请重新登录')
        return Promise.reject(new Error(res.message || '登录状态已失效，请重新登录'))
      }
      if (res.code === 40300) {
        ElMessage.error(res.message || '当前账号没有权限执行该操作')
        return Promise.reject(new Error(res.message || '当前账号没有权限执行该操作'))
      }
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return res.data
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      handleUnauthorized(error.response?.data?.message || '登录状态已失效，请重新登录')
      return Promise.reject(error)
    }
    if (status === 403) {
      ElMessage.error(error.response?.data?.message || '当前账号没有权限执行该操作')
      return Promise.reject(error)
    }
    ElMessage.error(error.message || '网络异常')
    return Promise.reject(error)
  }
)

export default request
