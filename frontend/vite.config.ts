import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // 优先解析 .ts / .vue，防止同名 .js 文件遮蔽 TypeScript 模块
    extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.vue', '.json']
  },
  server: {
    proxy: {
      // /api 开头的请求全部转发到后端，解决前后端跨域问题
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
