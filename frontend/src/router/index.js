import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getCurrentMenus } from '../api/menu';
import { flattenAuthMenus, getAuthMenus, getAuthRole, hasAuthSession, saveAuthMenus } from '../utils/auth-session';
const LoginView = () => import('../views/LoginView.vue');
const HomeView = () => import('../views/HomeView.vue');
const DashboardView = () => import('../views/DashboardView.vue');
const DashboardEditorView = () => import('../views/DashboardEditorView.vue');
const DataScreenView = () => import('../views/DataScreenView.vue');
const ScreenEditorView = () => import('../views/ScreenEditorView.vue');
const DataPrepareView = () => import('../views/DataPrepareView.vue');
const ModelingView = () => import('../views/ModelingView.vue');
const ReportPreviewView = () => import('../views/ReportPreviewView.vue');
const SystemView = () => import('../views/SystemView.vue');
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', redirect: '/login' },
        { path: '/login', name: 'login', component: LoginView },
        { path: '/home', name: 'home', component: HomeView, meta: { requiresAuth: true } },
        { path: '/home/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
        { path: '/home/dashboard/edit/:id', name: 'dashboard-edit', component: DashboardEditorView, meta: { requiresAuth: true } },
        { path: '/home/screen', name: 'screen', component: DataScreenView, meta: { requiresAuth: true } },
        { path: '/home/screen/edit/:id', name: 'screen-edit', component: ScreenEditorView, meta: { requiresAuth: true } },
        { path: '/preview/dashboard/:id', name: 'dashboard-preview', component: ReportPreviewView, meta: { scene: 'dashboard' } },
        { path: '/preview/screen/:id', name: 'screen-preview', component: ReportPreviewView, meta: { scene: 'screen' } },
        { path: '/home/prepare', name: 'prepare', component: DataPrepareView, meta: { requiresAuth: true } },
        { path: '/home/prepare/datasource', name: 'prepare-datasource', component: DataPrepareView, meta: { requiresAuth: true } },
        { path: '/home/prepare/dataset', name: 'prepare-dataset', component: DataPrepareView, meta: { requiresAuth: true } },
        { path: '/home/prepare/components', name: 'prepare-components', component: DataPrepareView, meta: { requiresAuth: true } },
        { path: '/home/prepare/extract', name: 'prepare-extract', component: DataPrepareView, meta: { requiresAuth: true } },
        { path: '/home/modeling', name: 'modeling', component: ModelingView, meta: { requiresAuth: true } },
        { path: '/home/system', name: 'system', component: SystemView, meta: { requiresAuth: true, roles: ['ADMIN'] } },
        { path: '/home/system/settings', name: 'system-settings', component: SystemView, meta: { requiresAuth: true, roles: ['ADMIN'] } },
        { path: '/home/system/users', name: 'system-users', component: SystemView, meta: { requiresAuth: true, roles: ['ADMIN'] } },
        { path: '/home/system/roles', name: 'system-roles', component: SystemView, meta: { requiresAuth: true, roles: ['ADMIN'] } },
        { path: '/home/system/menus', name: 'system-menus', component: SystemView, meta: { requiresAuth: true, roles: ['ADMIN'] } },
        { path: '/home/system/audit', name: 'system-audit', component: SystemView, meta: { requiresAuth: true, roles: ['ADMIN'] } },
        { path: '/home/system/login-logs', name: 'system-login-logs', component: SystemView, meta: { requiresAuth: true, roles: ['ADMIN'] } },
        { path: '/home/system/monitor', name: 'system-monitor', component: SystemView, meta: { requiresAuth: true, roles: ['ADMIN'] } }
    ]
});
const loadAllowedPaths = async () => {
    const cached = getAuthMenus();
    if (cached.length) {
        return new Set(flattenAuthMenus(cached).map((item) => item.path).filter(Boolean));
    }
    if (!hasAuthSession()) {
        return new Set();
    }
    try {
        const menus = await getCurrentMenus();
        saveAuthMenus(menus);
        return new Set(flattenAuthMenus(menus).map((item) => item.path).filter(Boolean));
    }
    catch {
        return new Set();
    }
};
router.beforeEach(async (to) => {
    if (to.path === '/login' && hasAuthSession()) {
        return '/home';
    }
    if (to.meta.requiresAuth && !hasAuthSession()) {
        return '/login';
    }
    const roles = Array.isArray(to.meta.roles) ? to.meta.roles : [];
    if (roles.length && !roles.includes(getAuthRole())) {
        ElMessage.error('当前账号没有权限访问该页面');
        return '/home';
    }
    if (to.meta.requiresAuth) {
        const allowedPaths = await loadAllowedPaths();
        if (allowedPaths.size && !allowedPaths.has(to.path) &&
            !Array.from(allowedPaths).some((p) => to.path.startsWith(p + '/'))) {
            ElMessage.error('当前账号没有菜单权限访问该页面');
            return '/home';
        }
    }
    return true;
});
export default router;
