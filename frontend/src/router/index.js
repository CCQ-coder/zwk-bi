import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import HomeView from '../views/HomeView.vue';
import DashboardView from '../views/DashboardView.vue';
import DataScreenView from '../views/DataScreenView.vue';
import DataPrepareView from '../views/DataPrepareView.vue';
import ModelingView from '../views/ModelingView.vue';
import SystemView from '../views/SystemView.vue';
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', redirect: '/login' },
        { path: '/login', name: 'login', component: LoginView },
        { path: '/home', name: 'home', component: HomeView },
        { path: '/home/dashboard', name: 'dashboard', component: DashboardView },
        { path: '/home/screen', name: 'screen', component: DataScreenView },
        { path: '/home/prepare', name: 'prepare', component: DataPrepareView },
        { path: '/home/modeling', name: 'modeling', component: ModelingView },
        { path: '/home/system', name: 'system', component: SystemView }
    ]
});
export default router;
