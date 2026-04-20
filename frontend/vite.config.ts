import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      dts: false,
      resolvers: [ElementPlusResolver()],
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')
          if (!normalizedId.includes('/node_modules/')) return undefined
          if (normalizedId.includes('/zrender/')) return 'vendor-zrender'
          if (normalizedId.includes('/echarts/')) return 'vendor-echarts'
          if (normalizedId.includes('/dayjs/')) return 'vendor-dayjs'
          if (normalizedId.includes('/async-validator/')) return 'vendor-async-validator'
          if (normalizedId.includes('/lodash-unified/') || normalizedId.includes('/lodash-es/') || normalizedId.includes('/lodash/')) {
            return 'vendor-lodash'
          }
          if (normalizedId.includes('/vue-router/')) return 'vendor-vue-router'
          if (normalizedId.includes('/vue/')) return 'vendor-vue'
          if (normalizedId.includes('/axios/')) return 'vendor-axios'
          if (normalizedId.includes('/html2canvas/')) return 'vendor-html2canvas'
          return undefined
        },
      },
    },
  },
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
