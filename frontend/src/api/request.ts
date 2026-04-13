import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建 axios 实例，统一设置 baseURL 与超时
const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器：自动附加 token（若存在）
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('bi_token')
  const operator = localStorage.getItem('bi_username')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  if (operator) {
    config.headers['X-Operator'] = operator
  }
  return config
})

// 响应拦截器：统一处理错误弹窗，解包 data 字段
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 0) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return res.data
  },
  (error) => {
    ElMessage.error(error.message || '网络异常')
    return Promise.reject(error)
  }
)

export default request
