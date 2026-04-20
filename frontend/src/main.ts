import { createApp } from 'vue'
import { ElLoadingDirective } from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

app.directive('loading', ElLoadingDirective)
app.use(router)
app.mount('#app')
