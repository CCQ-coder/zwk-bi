<template>
  <div class="page-wrap">
    <TopNavBar active="system" />
    <main class="page-main">
      <el-tabs v-model="activeTab" type="border-card" class="system-tabs">

        <!-- 用户管理 -->
        <el-tab-pane label="用户管理" name="users">
          <div class="tab-toolbar">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="tab-title">用户列表</span>
              <el-input v-model="userSearch" placeholder="搜索用户名/显示名" size="small" clearable style="width:220px" />
              <el-select v-model="userRoleFilter" size="small" style="width:130px">
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
            <el-table-column label="角色" width="100">
              <template #default="{ row }">
                <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="创建时间" min-width="160" />
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
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
                <el-select v-model="userForm.role" style="width:100%">
                  <el-option value="ADMIN" label="管理员" />
                  <el-option value="ANALYST" label="分析师" />
                  <el-option value="VIEWER" label="查看者" />
                </el-select>
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input v-model="userForm.email" placeholder="可选" />
              </el-form-item>
              <el-form-item :label="editId ? '新密码' : '密码'">
                <el-input v-model="userForm.password" type="password" show-password
                  :placeholder="editId ? '留空不修改' : '请输入密码'" />
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="userDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="userSaving" @click="handleUserSubmit">保存</el-button>
            </template>
          </el-dialog>
        </el-tab-pane>

        <!-- 审计日志 -->
        <el-tab-pane label="审计日志" name="audit">
          <div class="tab-toolbar">
            <el-input v-model="logSearch" placeholder="搜索用户/操作" size="small" clearable style="width:240px" />
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
          <div v-if="filteredLogs.length === 0 && !logsLoading"
               style="text-align:center;padding:32px;color:#909399;font-size:13px">
            暂无审计日志
          </div>
        </el-tab-pane>

        <!-- 登录日志 -->
        <el-tab-pane label="登录日志" name="loginLogs">
          <div class="tab-toolbar">
            <div style="display:flex;align-items:center;gap:8px">
              <el-input v-model="loginLogSearch" placeholder="搜索登录用户名" size="small" clearable style="width:240px" />
              <el-select v-model="loginActionFilter" size="small" style="width:140px">
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
          <div v-if="filteredLoginLogs.length === 0 && !loginLogsLoading"
               style="text-align:center;padding:32px;color:#909399;font-size:13px">
            暂无登录日志
          </div>
        </el-tab-pane>

        <!-- 系统监控 -->
        <el-tab-pane label="系统监控" name="monitor">
          <el-descriptions title="系统健康状态" border :column="2" size="small" style="margin-bottom:24px">
            <el-descriptions-item label="服务状态">
              <el-tag :type="health.status === 'ok' || health.status === 'UP' ? 'success' : 'danger'">
                {{ health.status || '未知' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="服务名">{{ health.service || '未知' }}</el-descriptions-item>
          </el-descriptions>

          <el-descriptions title="版本信息" border :column="2" size="small" style="margin-bottom:24px">
            <el-descriptions-item label="前端框架">Vue 3 + Element Plus + ECharts</el-descriptions-item>
            <el-descriptions-item label="后端框架">Spring Boot 3 + MyBatis</el-descriptions-item>
            <el-descriptions-item label="数据库">MySQL 8 + ClickHouse</el-descriptions-item>
            <el-descriptions-item label="数据同步">DataX + ETL</el-descriptions-item>
          </el-descriptions>

          <el-descriptions title="功能路线图" border :column="1" size="small">
            <el-descriptions-item label="RBAC 权限">按角色(管理员/分析师/查看者)控制各模块访问权限</el-descriptions-item>
            <el-descriptions-item label="行级安全">基于部门/属性动态过滤数据行</el-descriptions-item>
            <el-descriptions-item label="定时任务">数据抽取调度（cron）、仪表板订阅发送</el-descriptions-item>
            <el-descriptions-item label="导出分享">仪表板 PDF/PNG/Excel 导出，生成分享链接</el-descriptions-item>
            <el-descriptions-item label="告警通知">指标阈值告警，钉钉/企微/邮件推送</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

      </el-tabs>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import TopNavBar from '../components/TopNavBar.vue'
import request from '../api/request'
import { createUser, deleteUser, getUserList, updateUser } from '../api/user'
import type { User } from '../api/user'

const activeTab = ref('users')

// ─── 用户管理 ─────────────────────────────────────────────────────────────────
interface UserForm {
  username: string
  displayName: string
  role: 'ADMIN' | 'ANALYST' | 'VIEWER'
  email: string
  password: string
}

const users         = ref<User[]>([])
const usersLoading  = ref(false)
const userSearch    = ref('')
const userRoleFilter = ref<'ALL' | 'ADMIN' | 'ANALYST' | 'VIEWER'>('ALL')
const userDialogVisible = ref(false)
const userSaving    = ref(false)
const editId        = ref<number | null>(null)
const userFormRef   = ref<FormInstance>()
const userForm      = reactive<UserForm>({ username: '', displayName: '', role: 'ANALYST', email: '', password: '' })
const userRules: FormRules = {
  username:    [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
  displayName: [{ required: true, message: '显示名不能为空', trigger: 'blur' }],
  role:        [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const loadUsers = async () => {
  usersLoading.value = true
  try { users.value = await getUserList() }
  catch { users.value = [] }
  finally { usersLoading.value = false }
}

const filteredUsers = computed(() =>
  users.value.filter((u) => {
    const byRole = userRoleFilter.value === 'ALL' || u.role === userRoleFilter.value
    const q = userSearch.value.trim()
    const byKeyword = !q || u.username.includes(q) || u.displayName.includes(q)
    return byRole && byKeyword
  })
)

const openCreate = () => {
  editId.value = null
  Object.assign(userForm, { username: '', displayName: '', role: 'ANALYST', email: '', password: '' })
  userDialogVisible.value = true
}
const openEdit = (row: User) => {
  editId.value = row.id
  Object.assign(userForm, { username: row.username, displayName: row.displayName, role: row.role, email: row.email, password: '' })
  userDialogVisible.value = true
}
const handleUserSubmit = async () => {
  await userFormRef.value?.validate()
  userSaving.value = true
  try {
    if (editId.value) {
      await updateUser(editId.value, userForm)
      ElMessage.success('更新成功')
    } else {
      await createUser(userForm)
      ElMessage.success('创建成功')
    }
    userDialogVisible.value = false
    await loadUsers()
  } finally {
    userSaving.value = false
  }
}
const handleDelete = async (id: number) => {
  await deleteUser(id)
  ElMessage.success('删除成功')
  await loadUsers()
}
const roleLabel = (r: string) => ({ ADMIN: '管理员', ANALYST: '分析师', VIEWER: '查看者' }[r] ?? r)
const roleTagType = (r: string): '' | 'danger' | 'warning' | 'info' =>
  ({ ADMIN: 'danger', ANALYST: 'warning', VIEWER: 'info' } as Record<string, '' | 'danger' | 'warning' | 'info'>)[r] ?? ''

// ─── 审计日志 ─────────────────────────────────────────────────────────────────
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

const logs        = ref<AuditLog[]>([])
const logsLoading = ref(false)
const logSearch   = ref('')

const loginLogs = ref<AuditLog[]>([])
const loginLogsLoading = ref(false)
const loginLogSearch = ref('')
const loginActionFilter = ref<'ALL' | 'LOGIN_SUCCESS' | 'LOGIN_FAIL'>('ALL')

const filteredLogs = computed(() =>
  logs.value.filter(l =>
    !logSearch.value ||
    (l.username ?? '').includes(logSearch.value) ||
    (l.action ?? '').includes(logSearch.value)
  )
)

const loadLogs = async () => {
  logsLoading.value = true
  try { logs.value = await request.get('/audit-logs') }
  catch { logs.value = [] }
  finally { logsLoading.value = false }
}

const loadLoginLogs = async () => {
  loginLogsLoading.value = true
  try { loginLogs.value = await request.get('/audit-logs/login') }
  catch { loginLogs.value = [] }
  finally { loginLogsLoading.value = false }
}

const filteredLoginLogs = computed(() =>
  loginLogs.value.filter((l) => {
    const q = loginLogSearch.value.trim()
    const byName = !q || (l.username ?? '').includes(q)
    const byAction = loginActionFilter.value === 'ALL' || l.action === loginActionFilter.value
    return byName && byAction
  })
)

const actionTagType = (action: string): '' | 'success' | 'warning' | 'danger' | 'info' => {
  if (!action) return ''
  const a = action.toUpperCase()
  if (a.includes('DELETE')) return 'danger'
  if (a.includes('CREATE') || a.includes('INSERT')) return 'success'
  if (a.includes('UPDATE')) return 'warning'
  return 'info'
}

// ─── 系统监控 ─────────────────────────────────────────────────────────────────
const health = ref<{ status: string; service: string }>({ status: '', service: '' })

const loadHealth = async () => {
  try {
    const r = await request.get('/health') as { status?: string; service?: string }
    health.value = { status: r.status ?? '未知', service: r.service ?? '未知' }
  } catch { /* ignore */ }
}

onMounted(() => {
  loadUsers()
  loadLogs()
  loadLoginLogs()
  loadHealth()
})
</script>

<style scoped>
.page-wrap { min-height: 100vh; background: #f0f2f5; display: flex; flex-direction: column; }
.page-main { flex: 1; padding: 16px; overflow: auto; }
.system-tabs { min-height: calc(100vh - 100px); }
:deep(.el-tabs__content) { padding: 20px; }
.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.tab-title { font-size: 14px; font-weight: 600; color: #303133; }
</style>
