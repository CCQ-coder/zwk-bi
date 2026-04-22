# AI BI Workspace

技术栈:
- 前端: Vue3 + Element Plus + ECharts
- 后端: Spring Boot + MyBatis
- 数据库: MySQL + ClickHouse
- 数据同步: DataX + ETL

---

## 部署打包

### 需要上传到服务器的文件

| 目录 / 文件 | 说明 |
|---|---|
| `docker-compose.yml` | 数据库容器编排（MySQL + ClickHouse） |
| `database/` | 数据库初始化脚本，容器首次启动时自动执行 |
| `backend/target/backend-0.0.1-SNAPSHOT.jar` | 后端可执行 Jar（下方命令打包产出） |
| `frontend/dist/` | 前端静态文件（下方命令打包产出） |
| `data-integration/` | DataX 同步作业配置（按需上传） |

---

### 一、打包前端

```bash
cd frontend
npm install
npm run build
```

产出目录：`frontend/dist/`，将整个 `dist` 目录部署到 Nginx 的 `html` 根目录。

**Nginx 前端代理配置文件**（建议保存为 `/etc/nginx/conf.d/ai-bi.conf`）：

```nginx
# 可选：定义后端服务地址
upstream ai_bi_backend {
  server 127.0.0.1:8081;
  keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;

  # 前端静态文件目录（请替换为你的实际部署路径）
    root /var/www/ai-bi/dist;
    index index.html;

  # SPA history 模式兜底，避免前端路由 404
    location / {
        try_files $uri $uri/ /index.html;
    }

  # 反代后端 API
    location /api/ {
    proxy_pass http://ai_bi_backend;
    proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    }

  # 后端上传文件访问
    location /uploads/ {
    proxy_pass http://ai_bi_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    }

  # 常用静态资源缓存策略
  location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable";
  }
}
```

Nginx 配置生效命令：

```bash
nginx -t
systemctl reload nginx
```

如果你使用 HTTPS，可在同一文件增加 443 server 块：

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate /etc/nginx/ssl/your-domain.crt;
  ssl_certificate_key /etc/nginx/ssl/your-domain.key;

  root /var/www/ai-bi/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://ai_bi_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /uploads/ {
    proxy_pass http://ai_bi_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

### 二、打包后端

```bash
cd backend
mvn clean package -DskipTests
```

如果你在 Windows 终端里遇到 `mvn` 不存在（CommandNotFoundException），可用以下任一方式：

```powershell
# 方式 1：使用仓库自带脚本（会自动设置 JAVA_HOME 和 Maven 路径）
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
```

```powershell
# 方式 2：直接调用本机 mvn.cmd（示例为 IDEA 自带 Maven）
$env:JAVA_HOME="C:\Users\the\.jdks\ms-17.0.18"
& "E:\Program Files\JetBrains\IntelliJ IDEA 2025.3.4\plugins\maven\lib\maven3\bin\mvn.cmd" clean package -DskipTests
```

产出文件：`backend/target/backend-0.0.1-SNAPSHOT.jar`

**启动命令**（服务器上执行）：

```bash
# 基础启动
java -jar backend-0.0.1-SNAPSHOT.jar

# 携带环境变量覆盖（推荐，避免敏感信息写入配置文件）
java \
  -DAI_BI_DB_URL="jdbc:mysql://127.0.0.1:3306/ai_bi?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai" \
  -DAI_BI_DB_USERNAME=root \
  -DAI_BI_DB_PASSWORD=your_password \
  -DAI_BI_JWT_SECRET=your_jwt_secret_key \
  -DAI_BI_SERVER_PORT=8081 \
  -jar backend-0.0.1-SNAPSHOT.jar

# 后台运行（nohup）
nohup java -jar backend-0.0.1-SNAPSHOT.jar \
  --server.port=8081 \
  > /var/log/ai-bi-backend.log 2>&1 &
```

---

### 三、启动数据库（两种方式任选一种）

#### 方式 A：使用服务器已有的 MySQL（推荐）

无需 Docker，直接在服务器的 MySQL 中建库并执行初始化脚本：

```sql
-- 1. 登录 MySQL
mysql -u root -p

-- 2. 建库（如果还没有）
CREATE DATABASE IF NOT EXISTS ai_bi DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. 执行初始化脚本（包含所有建表和基础数据）
USE ai_bi;
SOURCE /path/to/database/mysql/init.sql;
```

> `init.sql` 内已包含最新完整表结构（版本 V19），**新库直接执行这一个文件即可**，无需再逐个执行 migration 脚本。

初始化完成后，启动后端时通过环境变量指向服务器 MySQL：

```bash
java \
  -DAI_BI_DB_URL="jdbc:mysql://127.0.0.1:3306/ai_bi?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai" \
  -DAI_BI_DB_USERNAME=root \
  -DAI_BI_DB_PASSWORD=your_password \
  -jar backend-0.0.1-SNAPSHOT.jar
```

ClickHouse 同理，可直接在服务器上安装 ClickHouse，然后执行：

```bash
clickhouse-client --queries-file database/clickhouse/init.sql
```

---

#### 方式 B：使用 Docker（本地开发 / 无 MySQL 的服务器）

```bash
# 仅需上传 docker-compose.yml 和 database/ 目录
docker compose up -d
```

首次启动时 Docker 会自动执行 `database/mysql/init.sql` 和 `database/clickhouse/init.sql` 完成建库建表。

---

### 四、完整上线检查清单

1. `docker compose ps` 确认 MySQL 和 ClickHouse 容器均为 `Up`
2. `curl http://127.0.0.1:8081/api/health` 返回 `OK`
3. 浏览器访问前端地址，登录默认账号（`admin` / `123456`）
4. 后端日志中 Flyway 显示 `Successfully applied N migration(s)` 表示数据库已自动升级

---



## 需求落地说明
- 业务系统接入: ERP / MES / CRM / 业务 MySQL
- 数据同步层: DataX + ETL
- 数仓层: ClickHouse
- BI 服务层: Spring Boot API + MySQL 系统库
- 前端层: Vue3 + Element Plus + ECharts

## 业务模块划分
- 前端模块: 登录、数据源管理、数据集 SQL、图表设计、仪表盘、大屏设计、只读预览/分享
- 后端模块: AuthAPI、DatasourceAPI、DatasetAPI、ChartAPI、DashboardAPI、DashboardComponentAPI
- 数据模型: sys_user、sys_role、sys_user_role、sys_menu、sys_role_menu、bi_datasource、bi_dataset、bi_dataset_field、bi_chart、bi_dashboard、bi_dashboard_component、bi_chart_template

## 目录
- `frontend`: 前端项目
- `backend`: 后端项目
- `database`: MySQL / ClickHouse 初始化脚本
- `data-integration`: DataX 与 ETL 示例

## 快速开始

1. 启动数据库

```bash
docker compose up -d
```

2. 启动后端

后端要求 Java 17；运行前请确认 `java -version` 指向 JDK 17，且 Maven 已加入 PATH，或直接使用本机可用的 `mvn.cmd`。

```bash
cd backend
mvn spring-boot:run
```

也可以直接使用仓库内的一键脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\backend\start-backend.ps1
```

工作区的 `.vscode/settings.json` 已为新开的 VS Code 终端固定 `JAVA_HOME` 和 Maven 路径；如果当前终端已经打开，请新开一个终端窗口后再执行启动命令。

后端支持通过环境变量覆盖默认运行配置，避免把本机账号、密码和密钥写死在代码里：

- `AI_BI_DB_URL` / `AI_BI_DB_USERNAME` / `AI_BI_DB_PASSWORD`
- `AI_BI_CLICKHOUSE_URL` / `AI_BI_CLICKHOUSE_USERNAME` / `AI_BI_CLICKHOUSE_PASSWORD`
- `AI_BI_JWT_SECRET` / `AI_BI_JWT_EXPIRE_HOURS`
- `AI_BI_UPLOAD_PATH` / `AI_BI_SERVER_PORT`

3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端开发端口已在 `frontend/vite.config.ts` 中显式配置为 `5173`，后端代理目标为 `http://localhost:8081`。

4. 健康检查
- 后端: `http://localhost:8081/api/health`
- 前端: `http://localhost:5173`

## 当前系统状态
- 仪表盘和大屏组件已升级为实例级配置模型: 共享资产存放在 `bi_chart`，画布实例存放在 `bi_dashboard_component`
- 每个组件实例都可以独立保存名称、数据集、图表类型、字段绑定、样式和交互配置
- 大屏组件数据来源支持两条主链路: 数据集 / 页面编写；页面编写可切换数据库、API 接口、表格文本、JSON 静态数据四种来源
- 数据源管理已支持四种正式类型: 数据库、API 接口、表格、JSON 静态数据；数据集仅允许绑定数据库型数据源
- 数据大屏支持截图生成封面，图片保存到 `bi/index` 目录，并通过 `/uploads/index/**` 对外访问
- 大屏编辑器已改为默认 auto-fit 缩放、右侧属性面板默认折叠、拖拽/缩放过程仅做 transform 预演，抬手后才一次性回写布局
- 模板预览改为右侧按需显示，不再在进入编辑器时默认常驻；画布编辑支持最近 3 次撤销
- 封面截图当前只截取画布区域内容，不包含工具栏和侧栏
- 预览层支持发布控制、分享链接、查询组件筛选和图表点击联动
- RBAC 已改为数据库驱动: 当前用户菜单来自 `sys_user_role -> sys_role_menu -> sys_menu`，前端导航按接口动态渲染
- 数据集字段元数据已结构化入库到 `bi_dataset_field`，数据集创建/更新和应用启动时都会自动同步字段定义
- 茶饮演示数据集已内置化，并新增 5 个茶饮图表模板与一个“茶饮经营分析”演示仪表板，旧库可通过 Flyway 自动补齐

## 本次改造对应的后端与数据库更新
- 后端已支持组件实例配置持久化: `bi_dashboard_component.config_json`
- 后端已支持预览查询联动: `GET /api/charts/{id}/data?filterJson=...`
- 后端已支持页面编写多来源查询: `POST /api/charts/query/page-source`
- 后端已支持数据源原始内容预览: `GET /api/datasources/{id}/preview-data`
- 后端已支持大屏封面上传分类: `POST /api/upload/image?category=index`
- 后端已支持按 ID 获取报告: `GET /api/dashboard/{id}`
- 后端已支持获取当前登录用户菜单: `GET /api/menus/current`
- 后端已正式接入 Flyway，启动时会自动执行 `backend/src/main/resources/db/migration` 下的版本化迁移
- 数据库初始化脚本已更新: `database/mysql/init.sql`
- 数据库初始化脚本已同步数据源种类字段: `bi_datasource.source_kind`、`bi_datasource.config_json`
- 增量迁移脚本已新增: `database/mysql/migration_v6_component_config.sql`
- 增量迁移脚本已新增: `database/mysql/migration_v8_rbac_menu_and_dataset_fields.sql`
- 增量迁移脚本已新增: `database/mysql/migration_v17_datasource_source_kind_and_config.sql`
- 增量迁移脚本已新增: `database/mysql/migration_v18_repair_orphan_tea_demo_datasets.sql`
- 增量迁移脚本已新增: `database/mysql/migration_v19_seed_tea_demo_report_assets.sql`

默认情况下，不再需要手工记忆执行数据库升级脚本：

- 新库初始化可直接使用 `database/mysql/init.sql`
- 已有库在启动后端时会由 Flyway 自动从 baseline v4 升级到当前版本
- `database/mysql/migration_v5.sql`、`database/mysql/migration_v6_component_config.sql`、`database/mysql/migration_v8_rbac_menu_and_dataset_fields.sql` 保留为离线兜底脚本，仅在无法通过应用启动自动迁移时手动执行
- 茶饮演示资产相关兜底脚本为 `database/mysql/migration_v18_repair_orphan_tea_demo_datasets.sql` 与 `database/mysql/migration_v19_seed_tea_demo_report_assets.sql`

如需手工兜底，可执行:

```sql
SOURCE database/mysql/migration_v5.sql;
SOURCE database/mysql/migration_v6_component_config.sql;
SOURCE database/mysql/migration_v8_rbac_menu_and_dataset_fields.sql;
SOURCE database/mysql/migration_v17_datasource_source_kind_and_config.sql;
SOURCE database/mysql/migration_v18_repair_orphan_tea_demo_datasets.sql;
SOURCE database/mysql/migration_v19_seed_tea_demo_report_assets.sql;
```

## 本次功能的全链路校验
- 前端: 已接入四类数据源管理、页面编写多来源切换、数据集仅展示数据库型数据源、大屏封面截图与显示
- 后端: 已存在并复用多类型数据源统一预览服务、页面来源查询接口、封面上传分类和静态映射，无需再新增接口
- 数据库: 已确认 `database/mysql/init.sql` 与 `migration_v17_datasource_source_kind_and_config.sql` 覆盖数据源新字段，无需新增本轮表结构脚本
- 数据集成: 已检查 `data-integration`，本次仅扩展 BI 配置和预览能力，不涉及 DataX / ETL 同步链路，因此无需变更
- 本轮编辑器流畅度与交互优化仅涉及前端 `ScreenDesignerPanel.vue`；已复核后端接口、数据库结构与数据集成脚本，当前无需联动修改

## 全链路同步要求
- 任何功能变更都必须同时检查前端、后端、数据库、数据脚本四层是否受影响，不能只改一层
- 如果前端新增字段、配置或交互，必须同步确认后端接口、MyBatis 映射、数据库初始化脚本和增量 migration 是否已更新
- 如果涉及数据表结构、指标口径、同步链路或数仓表，必须同步更新 `data-integration` 下的 DataX/ETL 脚本
- 如果本次改动不影响 DataX/ETL，也要在说明中明确写出“数据层无需变更”，不能省略判断
- 完成改动后，README 需要同步更新到当前真实状态，不能继续保留旧表名或旧流程

## 后端 API（基础骨架）
- POST `/api/auth/login`
- GET `/api/datasources`
- GET `/api/datasources/{id}/preview-data`
- GET `/api/datasets`
- GET `/api/charts`
- GET `/api/charts/{id}/data`
- POST `/api/charts/query/dataset`
- POST `/api/charts/query/page-sql`
- POST `/api/charts/query/page-source`
- GET `/api/dashboard/default`
- GET `/api/dashboard/{id}`
- GET `/api/dashboard/{id}/components`

## DataX 示例
DataX 任务示例位于 `data-integration/datax/job/mysql_to_clickhouse.json`，示例为 MySQL 订单明细同步到 ClickHouse `bi_order_detail`。

## ETL 示例
SQL 同步示例位于 `data-integration/etl/sync.sql`，包含订单明细导入与 KPI 日汇总逻辑。
