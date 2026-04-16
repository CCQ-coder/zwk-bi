import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // 优先解析 .ts / .vue，防止同名 .js 文件遮蔽 TypeScript 模块
    extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.vue', '.json'],
    // 使用包含运行时模板编译器的 Vue 版本，支持 defineComponent 中的 template 字符串
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js'
    }
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      // /api 开头的请求全部转发到后端，解决前后端跨域问题
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      // 静态上传文件（背景图等）也转发到后端
      '/uploads': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  }
})
