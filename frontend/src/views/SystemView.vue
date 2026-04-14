<template>
  <div class="page-wrap">
    <TopNavBar active="system" />
    <main class="page-main">
      <el-empty v-if="!visibleSystemTabs.length" description="当前账号没有系统管理菜单权限" />

      <el-tabs
        v-else
        v-model="activeTab"
        type="border-card"
        class="system-tabs"
        @tab-change="handleTabChange"
      >
        <el-tab-pane v-if="hasSystemTab('settings')" label="基础设置" name="settings">
          <div class="overview-grid">
            <div class="stat-card">
              <div class="stat-card__label">系统角色</div>
              <div class="stat-card__value">{{ roles.length }}</div>
              <div class="stat-card__meta">已接入角色菜单授权</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__label">系统用户</div>
              <div class="stat-card__value">{{ users.length }}</div>
              <div class="stat-card__meta">支持用户与角色同步</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__label">菜单总数</div>
              <div class="stat-card__value">{{ totalMenuCount }}</div>
              <div class="stat-card__meta">其中可见菜单 {{ visibleMenuCount }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__label">系统子菜单</div>
              <div class="stat-card__value">{{ visibleSystemTabs.length }}</div>
              <div class="stat-card__meta">基础设置 / 用户 / 角色 / 菜单</div>
            </div>
          </div>

          <div class="settings-grid">
            <el-card shadow="never">
              <template #header>
                <div class="card-header">
                  <span>系统入口</span>
                  <el-tag type="success" size="small">已接入动态菜单</el-tag>
                </div>
              </template>
              <div class="menu-chip-list">
                <el-tag v-for="tab in visibleSystemTabs" :key="tab.path" size="small" effect="plain">
                  {{ tab.label }}
                </el-tag>
              </div>
              <el-alert
                title="系统页已拆分出角色管理和菜单权限管理入口，管理员可直接在本页完成角色授权与菜单维护。"
                type="info"
                :closable="false"
                style="margin-top: 16px"
              />
            </el-card>

            <el-card shadow="never">
              <template #header>
                <div class="card-header">
                  <span>权限检查项</span>
                  <el-button size="small" @click="refreshSessionMenus">刷新当前菜单</el-button>
                </div>
              </template>
              <el-descriptions border :column="1" size="small">
                <el-descriptions-item label="菜单来源">sys_menu / sys_role_menu / sys_user_role</el-descriptions-item>
                <el-descriptions-item label="当前服务">{{ health.service || '未知' }}</el-descriptions-item>
                <el-descriptions-item label="服务状态">
                  <el-tag :type="health.status === 'ok' || health.status === 'UP' ? 'success' : 'danger'">
                    {{ health.status || '未知' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="当前系统根菜单">{{ rootMenuCount }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="hasSystemTab('users')" label="用户管理" name="users">
          <div class="tab-toolbar">
            <div class="toolbar-group">
              <span class="tab-title">用户列表</span>
              <el-input v-model="userSearch" placeholder="搜索用户名/显示名" size="small" clearable class="toolbar-input" />
              <el-select v-model="userRoleFilter" size="small" class="toolbar-select">
                <el-option value="ALL" label="全部角色" />
                <el-option value="ADMIN" label="管理员" />
                <el-option value="ANALYST" label="分析师" />
                <el-option value="VIEWER" label="查看者" />
              </el-select>
            </div>
            <el-button type="primary" size="small" @click="openCreate">新建用户</el-button>
          </div>
          <el-table v-loading="usersLoading" :data="filteredUsers" border size="small">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="username" label="用户名" min-width="120" />
            <el-table-column prop="displayName" label="显示名" min-width="120" />
            <el-table-column label="角色" width="110">
              <template #default="{ row }">
                <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="创建时间" min-width="160" />
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                <el-popconfirm title="确认删除该用户？" @confirm="handleDelete(row.id)">
                  <template #reference>
                    <el-button link type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <el-dialog v-model="userDialogVisible" :title="editId ? '编辑用户' : '新建用户'" width="480px" destroy-on-close>
            <el-form ref="userFormRef" :model="userForm" :rules="userRules" label-width="90px">
              <el-form-item label="用户名" prop="username">
                <el-input v-model="userForm.username" :disabled="!!editId" placeholder="登录用户名" />
              </el-form-item>
              <el-form-item label="显示名" prop="displayName">
                <el-input v-model="userForm.displayName" placeholder="显示名称" />
              </el-form-item>
              <el-form-item label="角色" prop="role">
                <el-select v-model="userForm.role" style="width: 100%">
                  <el-option value="ADMIN" label="管理员" />
                  <el-option value="ANALYST" label="分析师" />
                  <el-option value="VIEWER" label="查看者" />
                </el-select>
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input v-model="userForm.email" placeholder="可选" />
              </el-form-item>
              <el-form-item :label="editId ? '新密码' : '密码'">
                <el-input
                  v-model="userForm.password"
                  type="password"
                  show-password
                  :placeholder="editId ? '留空不修改' : '请输入密码'"
                />
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="userDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="userSaving" @click="handleUserSubmit">保存</el-button>
            </template>
          </el-dialog>
        </el-tab-pane>

        <el-tab-pane v-if="hasSystemTab('roles')" label="角色管理" name="roles">
          <div class="role-layout">
            <el-card shadow="never" class="role-list-card">
              <template #header>
                <div class="card-header">
                  <span>角色列表</span>
                  <el-button size="small" @click="loadRoles">刷新</el-button>
                </div>
              </template>
              <el-table
                v-loading="rolesLoading"
                :data="roles"
                border
                size="small"
                highlight-current-row
                :row-class-name="roleRowClassName"
                @row-click="handleRoleSelect"
              >
                <el-table-column prop="name" label="角色" min-width="120">
                  <template #default="{ row }">
                    <el-tag :type="roleTagType(row.name)" size="small">{{ roleLabel(row.name) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="userCount" label="用户数" width="90" />
                <el-table-column prop="menuCount" label="菜单数" width="90" />
              </el-table>
            </el-card>

            <el-card shadow="never" class="role-permission-card" v-loading="menusLoading || roleMenuLoading">
              <template #header>
                <div class="card-header">
                  <div>
                    <div class="tab-title">菜单权限配置</div>
                    <div class="card-subtitle">
                      {{ selectedRole ? `${roleLabel(selectedRole.name)} 已关联 ${selectedRole.menuCount} 个菜单` : '请选择角色后配置菜单权限' }}
                    </div>
                  </div>
                  <el-button type="primary" size="small" :disabled="!selectedRole" :loading="roleMenuSaving" @click="handleRoleMenuSave">
                    保存权限
                  </el-button>
                </div>
              </template>

              <div v-if="selectedRole" class="role-summary">
                <el-tag :type="roleTagType(selectedRole.name)">{{ roleLabel(selectedRole.name) }}</el-tag>
                <span>用户数 {{ selectedRole.userCount }}</span>
                <span>已选菜单 {{ selectedRoleMenuIds.length }}</span>
              </div>

              <el-tree
                ref="roleMenuTreeRef"
                :data="menuTree"
                node-key="id"
                show-checkbox
                default-expand-all
                check-on-click-node
                :props="treeProps"
                class="role-menu-tree"
              >
                <template #default="{ data }">
                  <div class="tree-node">
                    <span>{{ menuDisplayLabel(data) }}</span>
                    <span class="tree-node__meta">{{ data.path || data.permission || '目录节点' }}</span>
                  </div>
                </template>
              </el-tree>
            </el-card>
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="hasSystemTab('menus')" label="菜单权限管理" name="menus">
          <div class="tab-toolbar">
            <div class="toolbar-group">
              <span class="tab-title">菜单结构</span>
              <el-tag size="small" type="info">总计 {{ totalMenuCount }} 项</el-tag>
              <el-tag size="small" type="success">显示 {{ visibleMenuCount }} 项</el-tag>
            </div>
            <el-button type="primary" size="small" @click="openCreateMenu()">新增顶级菜单</el-button>
          </div>

          <el-table
            v-loading="menusLoading"
            :data="menuTree"
            border
            size="small"
            row-key="id"
            default-expand-all
            :tree-props="treeProps"
          >
            <el-table-column label="菜单名称" min-width="190">
              <template #default="{ row }">
                <div class="menu-name-cell">
                  <span>{{ menuDisplayLabel(row) }}</span>
                  <el-tag size="small" :type="row.type === 'catalog' ? 'warning' : 'success'">
                    {{ row.type === 'catalog' ? '目录' : '菜单' }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="path" label="路由路径" min-width="200" show-overflow-tooltip />
            <el-table-column prop="permission" label="权限标识" min-width="160" show-overflow-tooltip />
            <el-table-column prop="component" label="组件" min-width="140" show-overflow-tooltip />
            <el-table-column prop="icon" label="图标" width="100" />
            <el-table-column prop="sort" label="排序" width="80" />
            <el-table-column label="可见" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="row.visible === false ? 'info' : 'success'">
                  {{ row.visible === false ? '隐藏' : '显示' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openCreateMenu(row)">新增下级</el-button>
                <el-button link type="primary" @click="openEditMenu(row)">编辑</el-button>
                <el-popconfirm title="确认删除该菜单？" @confirm="handleMenuDelete(row.id)">
                  <template #reference>
                    <el-button link type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <el-dialog v-model="menuDialogVisible" :title="editingMenuId ? '编辑菜单' : '新增菜单'" width="560px" destroy-on-close>
            <el-form ref="menuFormRef" :model="menuForm" :rules="menuRules" label-width="100px">
              <el-form-item label="菜单名称" prop="name">
                <el-input v-model="menuForm.name" placeholder="请输入菜单名称" />
              </el-form-item>
              <el-form-item label="菜单类型">
                <el-radio-group v-model="menuForm.type">
                  <el-radio-button label="menu">菜单</el-radio-button>
                  <el-radio-button label="catalog">目录</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="上级菜单">
                <el-select v-model="menuForm.parentId" clearable placeholder="顶级菜单" style="width: 100%">
                  <el-option v-for="option in parentMenuOptions" :key="option.id" :label="option.label" :value="option.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="路由路径">
                <el-input v-model="menuForm.path" placeholder="例如 /home/system/roles" />
              </el-form-item>
              <el-form-item label="前端组件">
                <el-input v-model="menuForm.component" placeholder="例如 SystemView" />
              </el-form-item>
              <el-form-item label="权限标识">
                <el-input v-model="menuForm.permission" placeholder="例如 system:role" />
              </el-form-item>
              <el-form-item label="图标">
                <el-input v-model="menuForm.icon" placeholder="例如 Menu / Setting" />
              </el-form-item>
              <el-form-item label="排序值">
                <el-input-number v-model="menuForm.sort" :min="1" :max="999" style="width: 100%" />
              </el-form-item>
              <el-form-item label="显示状态">
                <el-switch v-model="menuForm.visible" active-text="显示" inactive-text="隐藏" />
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="menuDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="menuSaving" @click="handleMenuSubmit">保存</el-button>
            </template>
          </el-dialog>
        </el-tab-pane>

        <el-tab-pane v-if="hasSystemTab('audit')" label="审计日志" name="audit">
          <div class="tab-toolbar">
            <el-input v-model="logSearch" placeholder="搜索用户/操作" size="small" clearable class="toolbar-input" />
            <el-button size="small" @click="loadLogs">刷新</el-button>
          </div>
          <el-table v-loading="logsLoading" :data="filteredLogs" border size="small" max-height="520">
            <el-table-column prop="createdAt" label="时间" width="165" />
            <el-table-column prop="username" label="用户" width="100" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="actionTagType(row.action)">{{ row.action }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="resourceType" label="资源类型" width="110" />
            <el-table-column prop="resourceId" label="资源ID" width="80" />
            <el-table-column prop="detail" label="详情" min-width="180" show-overflow-tooltip />
            <el-table-column prop="ipAddr" label="IP" width="130" />
          </el-table>
          <div v-if="filteredLogs.length === 0 && !logsLoading" class="empty-state">暂无审计日志</div>
        </el-tab-pane>

        <el-tab-pane v-if="hasSystemTab('loginLogs')" label="登录日志" name="loginLogs">
          <div class="tab-toolbar">
            <div class="toolbar-group">
              <el-input v-model="loginLogSearch" placeholder="搜索登录用户名" size="small" clearable class="toolbar-input" />
              <el-select v-model="loginActionFilter" size="small" class="toolbar-select">
                <el-option value="ALL" label="全部" />
                <el-option value="LOGIN_SUCCESS" label="登录成功" />
                <el-option value="LOGIN_FAIL" label="登录失败" />
              </el-select>
            </div>
            <el-button size="small" @click="loadLoginLogs">刷新</el-button>
          </div>
          <el-table v-loading="loginLogsLoading" :data="filteredLoginLogs" border size="small" max-height="520">
            <el-table-column prop="createdAt" label="时间" width="170" />
            <el-table-column prop="username" label="用户名" width="140" />
            <el-table-column label="结果" width="110">
              <template #default="{ row }">
                <el-tag size="small" :type="row.action === 'LOGIN_SUCCESS' ? 'success' : 'danger'">
                  {{ row.action === 'LOGIN_SUCCESS' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="detail" label="详情" min-width="220" show-overflow-tooltip />
            <el-table-column prop="ipAddr" label="IP" width="140" />
          </el-table>
          <div v-if="filteredLoginLogs.length === 0 && !loginLogsLoading" class="empty-state">暂无登录日志</div>
        </el-tab-pane>

        <el-tab-pane v-if="hasSystemTab('monitor')" label="系统监控" name="monitor">
          <el-descriptions title="系统健康状态" border :column="2" size="small" style="margin-bottom: 24px">
            <el-descriptions-item label="服务状态">
              <el-tag :type="health.status === 'ok' || health.status === 'UP' ? 'success' : 'danger'">
                {{ health.status || '未知' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="服务名">{{ health.service || '未知' }}</el-descriptions-item>
          </el-descriptions>

          <el-descriptions title="版本信息" border :column="2" size="small" style="margin-bottom: 24px">
            <el-descriptions-item label="前端框架">Vue 3 + Element Plus + ECharts</el-descriptions-item>
            <el-descriptions-item label="后端框架">Spring Boot 3 + MyBatis</el-descriptions-item>
            <el-descriptions-item label="数据库">MySQL 8 + ClickHouse</el-descriptions-item>
            <el-descriptions-item label="数据同步">DataX + ETL</el-descriptions-item>
          </el-descriptions>

          <el-descriptions title="功能路线图" border :column="1" size="small">
            <el-descriptions-item label="RBAC 权限">按角色维护菜单访问范围，系统页已支持角色菜单授权。</el-descriptions-item>
            <el-descriptions-item label="行级安全">后续可基于部门、组织或数据属性继续追加数据权限。</el-descriptions-item>
            <el-descriptions-item label="调度能力">数据抽取调度、仪表板订阅发送、作业重试仍可继续扩展。</el-descriptions-item>
            <el-descriptions-item label="导出分享">可继续补 PDF、PNG、Excel 导出与分享链接治理。</el-descriptions-item>
            <el-descriptions-item label="告警通知">可继续补指标阈值告警与企微、钉钉、邮件通知。</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
      </el-tabs>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, TabPaneName } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import TopNavBar from '../components/TopNavBar.vue'
import request from '../api/request'
import { createMenu, deleteMenu, getCurrentMenus, getMenuTree, updateMenu, type MenuForm, type SystemMenu } from '../api/menu'
import { getRoleList, getRoleMenuIds, updateRoleMenuIds, type RoleSummary } from '../api/role'
import { createUser, deleteUser, getUserList, updateUser } from '../api/user'
import type { User } from '../api/user'
import { saveAuthMenus, type AuthMenuItem } from '../utils/auth-session'

type SystemTab = 'settings' | 'users' | 'roles' | 'menus' | 'audit' | 'loginLogs' | 'monitor'

interface SystemTabItem {
  name: SystemTab
  label: string
  path: string
}

interface UserForm {
  username: string
  displayName: string
  role: 'ADMIN' | 'ANALYST' | 'VIEWER'
  email: string
  password: string
}

interface AuditLog {
  id: number
  username: string
  action: string
  resourceType: string
  resourceId: string
  detail: string
  ipAddr: string
  createdAt: string
}

interface MenuOption {
  id: number
  label: string
}

interface TreeRefLike {
  getCheckedKeys: (leafOnly?: boolean) => Array<string | number>
  getHalfCheckedKeys: () => Array<string | number>
  setCheckedKeys: (keys: Array<string | number>, leafOnly?: boolean) => void
}

const route = useRoute()
const router = useRouter()

const SYSTEM_TABS: SystemTabItem[] = [
  { name: 'settings', label: '基础设置', path: '/home/system/settings' },
  { name: 'users', label: '用户管理', path: '/home/system/users' },
  { name: 'roles', label: '角色管理', path: '/home/system/roles' },
  { name: 'menus', label: '菜单权限管理', path: '/home/system/menus' },
  { name: 'audit', label: '审计日志', path: '/home/system/audit' },
  { name: 'loginLogs', label: '登录日志', path: '/home/system/login-logs' },
  { name: 'monitor', label: '系统监控', path: '/home/system/monitor' }
]

const SYSTEM_LABEL_MAP = SYSTEM_TABS.reduce<Record<string, string>>((accumulator, item) => {
  accumulator[item.path] = item.label
  return accumulator
}, {})

const treeProps = { children: 'children', label: 'name' }
const activeTab = ref<SystemTab>('settings')
const sessionMenus = ref<AuthMenuItem[]>([])

const findMenuByPath = (menus: AuthMenuItem[], path: string): AuthMenuItem | undefined => {
  for (const item of menus) {
    if (item.path === path) {
      return item
    }
    const childMatch = findMenuByPath(item.children ?? [], path)
    if (childMatch) {
      return childMatch
    }
  }
  return undefined
}

const visibleSystemTabs = computed<SystemTabItem[]>(() => {
  const systemRoot = findMenuByPath(sessionMenus.value, '/home/system')
  const childPaths = new Set((systemRoot?.children ?? []).map((item) => item.path).filter(Boolean))
  if (!childPaths.size) {
    return SYSTEM_TABS
  }
  return SYSTEM_TABS.filter((item) => childPaths.has(item.path))
})

const resolveActiveTab = (path: string): SystemTab => {
  const matched = SYSTEM_TABS.find((item) => item.path === path)
  if (matched) {
    return matched.name
  }
  return visibleSystemTabs.value[0]?.name ?? 'settings'
}

watch(
  () => route.path,
  (path) => {
    activeTab.value = resolveActiveTab(path)
    if (activeTab.value === 'roles') {
      void applyRoleTreeSelection()
    }
  },
  { immediate: true }
)

watch(visibleSystemTabs, (tabs) => {
  if (!tabs.length) {
    return
  }
  if (!tabs.some((item) => item.name === activeTab.value)) {
    activeTab.value = tabs[0].name
  }
})

const hasSystemTab = (name: SystemTab) => visibleSystemTabs.value.some((item) => item.name === name)

const handleTabChange = (name: TabPaneName) => {
  const target = SYSTEM_TABS.find((item) => item.name === name)
  if (!target) {
    return
  }
  if (route.path !== target.path) {
    void router.push(target.path)
  }
  if (target.name === 'roles') {
    void applyRoleTreeSelection()
  }
}

const refreshSessionMenus = async () => {
  try {
    const latest = await getCurrentMenus()
    sessionMenus.value = latest
    saveAuthMenus(latest)
  } catch {
    sessionMenus.value = []
  }
}

const users = ref<User[]>([])
const usersLoading = ref(false)
const userSearch = ref('')
const userRoleFilter = ref<'ALL' | 'ADMIN' | 'ANALYST' | 'VIEWER'>('ALL')
const userDialogVisible = ref(false)
const userSaving = ref(false)
const editId = ref<number | null>(null)
const userFormRef = ref<FormInstance>()
const userForm = reactive<UserForm>({ username: '', displayName: '', role: 'ANALYST', email: '', password: '' })
const userRules: FormRules = {
  username: [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
  displayName: [{ required: true, message: '显示名不能为空', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const roles = ref<RoleSummary[]>([])
const rolesLoading = ref(false)
const roleMenuLoading = ref(false)
const roleMenuSaving = ref(false)
const selectedRoleId = ref<number | null>(null)
const selectedRoleMenuIds = ref<number[]>([])
const roleMenuTreeRef = ref<TreeRefLike | null>(null)

const menuTree = ref<SystemMenu[]>([])
const menusLoading = ref(false)
const menuDialogVisible = ref(false)
const menuSaving = ref(false)
const editingMenuId = ref<number | null>(null)
const menuFormRef = ref<FormInstance>()
const menuForm = reactive<MenuForm>({
  name: '',
  path: '',
  component: '',
  parentId: null,
  type: 'menu',
  permission: '',
  icon: '',
  sort: 100,
  visible: true,
  dashboardId: null
})
const menuRules: FormRules = {
  name: [{ required: true, message: '菜单名称不能为空', trigger: 'blur' }]
}

const logs = ref<AuditLog[]>([])
const logsLoading = ref(false)
const logSearch = ref('')

const loginLogs = ref<AuditLog[]>([])
const loginLogsLoading = ref(false)
const loginLogSearch = ref('')
const loginActionFilter = ref<'ALL' | 'LOGIN_SUCCESS' | 'LOGIN_FAIL'>('ALL')

const health = ref<{ status: string; service: string }>({ status: '', service: '' })

const roleLabel = (role: string) => ({ ADMIN: '管理员', ANALYST: '分析师', VIEWER: '查看者' }[role] ?? role)
const roleTagType = (role: string): '' | 'danger' | 'warning' | 'info' =>
  ({ ADMIN: 'danger', ANALYST: 'warning', VIEWER: 'info' } as Record<string, '' | 'danger' | 'warning' | 'info'>)[role] ?? ''

const actionTagType = (action: string): '' | 'success' | 'warning' | 'danger' | 'info' => {
  if (!action) {
    return ''
  }
  const normalized = action.toUpperCase()
  if (normalized.includes('DELETE')) {
    return 'danger'
  }
  if (normalized.includes('CREATE') || normalized.includes('INSERT')) {
    return 'success'
  }
  if (normalized.includes('UPDATE')) {
    return 'warning'
  }
  return 'info'
}

const flattenMenuTree = (nodes: SystemMenu[]): SystemMenu[] =>
  nodes.flatMap((node) => [node, ...flattenMenuTree(node.children ?? [])])

const menuDisplayLabel = (menu: { name: string; path?: string }) => SYSTEM_LABEL_MAP[menu.path ?? ''] ?? menu.name

const totalMenuCount = computed(() => flattenMenuTree(menuTree.value).length)
const visibleMenuCount = computed(() => flattenMenuTree(menuTree.value).filter((item) => item.visible !== false).length)
const rootMenuCount = computed(() => menuTree.value.length)
const selectedRole = computed(() => roles.value.find((item) => item.id === selectedRoleId.value) ?? null)

const filteredUsers = computed(() =>
  users.value.filter((user) => {
    const keyword = userSearch.value.trim().toLowerCase()
    const roleMatched = userRoleFilter.value === 'ALL' || user.role === userRoleFilter.value
    const keywordMatched = !keyword
      || user.username.toLowerCase().includes(keyword)
      || user.displayName.toLowerCase().includes(keyword)
    return roleMatched && keywordMatched
  })
)

const filteredLogs = computed(() => {
  const keyword = logSearch.value.trim().toLowerCase()
  return logs.value.filter((log) =>
    !keyword
    || (log.username ?? '').toLowerCase().includes(keyword)
    || (log.action ?? '').toLowerCase().includes(keyword)
  )
})

const filteredLoginLogs = computed(() => {
  const keyword = loginLogSearch.value.trim().toLowerCase()
  return loginLogs.value.filter((log) => {
    const byName = !keyword || (log.username ?? '').toLowerCase().includes(keyword)
    const byAction = loginActionFilter.value === 'ALL' || log.action === loginActionFilter.value
    return byName && byAction
  })
})

const collectChildrenIds = (children: SystemMenu[], bucket: Set<number>) => {
  for (const child of children) {
    bucket.add(child.id)
    collectChildrenIds(child.children ?? [], bucket)
  }
}

const descendantIds = computed(() => {
  const bucket = new Set<number>()
  if (!editingMenuId.value) {
    return bucket
  }
  const stack = [...menuTree.value]
  while (stack.length) {
    const current = stack.pop()
    if (!current) {
      continue
    }
    if (current.id === editingMenuId.value) {
      collectChildrenIds(current.children ?? [], bucket)
      break
    }
    stack.push(...(current.children ?? []))
  }
  return bucket
})

const parentMenuOptions = computed<MenuOption[]>(() => {
  const walk = (nodes: SystemMenu[], depth: number): MenuOption[] =>
    nodes.flatMap((node) => {
      const currentLabel = `${'  '.repeat(depth)}${menuDisplayLabel(node)}${node.path ? ` (${node.path})` : ''}`
      const children = walk(node.children ?? [], depth + 1)
      return [{ id: node.id, label: currentLabel }, ...children]
    })

  return walk(menuTree.value, 0).filter((item) => item.id !== editingMenuId.value && !descendantIds.value.has(item.id))
})

const roleRowClassName = ({ row }: { row: RoleSummary }) => (row.id === selectedRoleId.value ? 'role-row--active' : '')

const loadUsers = async () => {
  usersLoading.value = true
  try {
    users.value = await getUserList()
  } catch {
    users.value = []
  } finally {
    usersLoading.value = false
  }
}

const loadRoles = async () => {
  rolesLoading.value = true
  try {
    roles.value = await getRoleList()
  } catch {
    roles.value = []
  } finally {
    rolesLoading.value = false
  }

  if (!roles.value.length) {
    selectedRoleId.value = null
    selectedRoleMenuIds.value = []
    return
  }

  const matchedRole = roles.value.find((item) => item.id === selectedRoleId.value) ?? roles.value[0]
  await handleRoleSelect(matchedRole)
}

const loadMenuTree = async () => {
  menusLoading.value = true
  try {
    menuTree.value = await getMenuTree()
  } catch {
    menuTree.value = []
  } finally {
    menusLoading.value = false
  }
  await applyRoleTreeSelection()
}

const applyRoleTreeSelection = async () => {
  await nextTick()
  roleMenuTreeRef.value?.setCheckedKeys(selectedRoleMenuIds.value, false)
}

const handleRoleSelect = async (role: RoleSummary) => {
  selectedRoleId.value = role.id
  roleMenuLoading.value = true
  try {
    selectedRoleMenuIds.value = await getRoleMenuIds(role.id)
  } catch {
    selectedRoleMenuIds.value = []
  } finally {
    roleMenuLoading.value = false
  }
  await applyRoleTreeSelection()
}

const normalizeTreeKeys = (keys: Array<string | number>) =>
  Array.from(new Set(keys.map((value) => Number(value)).filter((value) => Number.isFinite(value))))

const handleRoleMenuSave = async () => {
  if (!selectedRoleId.value) {
    ElMessage.warning('请先选择角色')
    return
  }
  roleMenuSaving.value = true
  try {
    const checkedKeys = normalizeTreeKeys(roleMenuTreeRef.value?.getCheckedKeys(false) ?? [])
    const halfCheckedKeys = normalizeTreeKeys(roleMenuTreeRef.value?.getHalfCheckedKeys() ?? [])
    const mergedKeys = Array.from(new Set([...checkedKeys, ...halfCheckedKeys]))
    selectedRoleMenuIds.value = await updateRoleMenuIds(selectedRoleId.value, mergedKeys)
    await Promise.all([loadRoles(), refreshSessionMenus()])
    ElMessage.success('角色菜单权限已更新')
  } finally {
    roleMenuSaving.value = false
  }
}

const resetMenuForm = (overrides?: Partial<MenuForm>) => {
  Object.assign(menuForm, {
    name: '',
    path: '',
    component: '',
    parentId: null,
    type: 'menu',
    permission: '',
    icon: '',
    sort: 100,
    visible: true,
    dashboardId: null,
    ...overrides
  })
}

const openCreate = () => {
  editId.value = null
  Object.assign(userForm, { username: '', displayName: '', role: 'ANALYST', email: '', password: '' })
  userDialogVisible.value = true
}

const openEdit = (row: User) => {
  editId.value = row.id
  Object.assign(userForm, {
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    email: row.email,
    password: ''
  })
  userDialogVisible.value = true
}

const handleUserSubmit = async () => {
  await userFormRef.value?.validate()
  userSaving.value = true
  try {
    if (editId.value) {
      await updateUser(editId.value, userForm)
      ElMessage.success('用户已更新')
    } else {
      await createUser(userForm)
      ElMessage.success('用户已创建')
    }
    userDialogVisible.value = false
    await Promise.all([loadUsers(), loadRoles()])
  } finally {
    userSaving.value = false
  }
}

const handleDelete = async (id: number) => {
  await deleteUser(id)
  ElMessage.success('用户已删除')
  await Promise.all([loadUsers(), loadRoles()])
}

const openCreateMenu = (parent?: SystemMenu) => {
  editingMenuId.value = null
  resetMenuForm({
    parentId: parent?.id ?? null,
    component: parent?.component ?? '',
    sort: parent?.sort ? parent.sort + 1 : 100
  })
  menuDialogVisible.value = true
}

const openEditMenu = (menu: SystemMenu) => {
  editingMenuId.value = menu.id
  resetMenuForm({
    name: menu.name,
    path: menu.path,
    component: menu.component,
    parentId: menu.parentId,
    type: menu.type === 'catalog' ? 'catalog' : 'menu',
    permission: menu.permission,
    icon: menu.icon,
    sort: menu.sort,
    visible: menu.visible !== false,
    dashboardId: menu.dashboardId
  })
  menuDialogVisible.value = true
}

const handleMenuSubmit = async () => {
  await menuFormRef.value?.validate()
  if (menuForm.type === 'menu' && !menuForm.path.trim()) {
    ElMessage.error('菜单类型为 menu 时必须填写路由路径')
    return
  }
  menuSaving.value = true
  try {
    const payload: MenuForm = {
      ...menuForm,
      name: menuForm.name.trim(),
      path: menuForm.path.trim(),
      component: menuForm.component.trim(),
      permission: menuForm.permission.trim(),
      icon: menuForm.icon.trim(),
      parentId: menuForm.parentId ?? null,
      sort: menuForm.sort ?? 100,
      visible: menuForm.visible !== false,
      dashboardId: null
    }
    if (editingMenuId.value) {
      await updateMenu(editingMenuId.value, payload)
      ElMessage.success('菜单已更新')
    } else {
      await createMenu(payload)
      ElMessage.success('菜单已创建')
    }
    menuDialogVisible.value = false
    await Promise.all([loadMenuTree(), loadRoles(), refreshSessionMenus()])
  } finally {
    menuSaving.value = false
  }
}

const handleMenuDelete = async (id: number) => {
  await deleteMenu(id)
  ElMessage.success('菜单已删除')
  await Promise.all([loadMenuTree(), loadRoles(), refreshSessionMenus()])
}

const loadLogs = async () => {
  logsLoading.value = true
  try {
    logs.value = await request.get('/audit-logs')
  } catch {
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

const loadLoginLogs = async () => {
  loginLogsLoading.value = true
  try {
    loginLogs.value = await request.get('/audit-logs/login')
  } catch {
    loginLogs.value = []
  } finally {
    loginLogsLoading.value = false
  }
}

const loadHealth = async () => {
  try {
    const response = await request.get('/health') as { status?: string; service?: string }
    health.value = { status: response.status ?? '未知', service: response.service ?? '未知' }
  } catch {
    health.value = { status: '', service: '' }
  }
}

onMounted(async () => {
  await Promise.all([
    refreshSessionMenus(),
    loadUsers(),
    loadMenuTree(),
    loadLogs(),
    loadLoginLogs(),
    loadHealth()
  ])
  await loadRoles()
})
</script>

<style scoped>
.page-wrap {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

.system-tabs {
  min-height: calc(100vh - 100px);
}

:deep(.el-tabs__content) {
  padding: 20px;
}

.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-input {
  width: 240px;
}

.toolbar-select {
  width: 140px;
}

.tab-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-subtitle {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  padding: 18px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ffffff, #f7fafc);
  border: 1px solid #e4e7ed;
  box-shadow: 0 10px 24px rgba(31, 45, 61, 0.06);
}

.stat-card__label {
  color: #909399;
  font-size: 13px;
}

.stat-card__value {
  margin: 10px 0 6px;
  font-size: 30px;
  line-height: 1;
  font-weight: 700;
  color: #1f2d3d;
}

.stat-card__meta {
  color: #606266;
  font-size: 12px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.menu-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-layout {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(420px, 1fr);
  gap: 16px;
}

.role-list-card,
.role-permission-card {
  min-height: 600px;
}

.role-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: #606266;
  flex-wrap: wrap;
}

.role-menu-tree {
  max-height: 520px;
  overflow: auto;
  padding-right: 8px;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.tree-node__meta {
  color: #909399;
  font-size: 12px;
}

.menu-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: #909399;
  font-size: 13px;
}

:deep(.role-row--active td) {
  background: #ecf5ff !important;
}

@media (max-width: 1080px) {
  .role-layout {
    grid-template-columns: 1fr;
  }

  .toolbar-input,
  .toolbar-select {
    width: 100%;
  }
}
</style>
