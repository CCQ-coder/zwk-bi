# AI BI Workspace

技术栈:
- 前端: Vue3 + Element Plus + ECharts
- 后端: Spring Boot + MyBatis
- 数据库: MySQL + ClickHouse
- 数据同步: DataX + ETL

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

4. 健康检查
- 后端: `http://localhost:8081/api/health`
- 前端: `http://localhost:5173`

## 当前系统状态
- 仪表盘和大屏组件已升级为实例级配置模型: 共享资产存放在 `bi_chart`，画布实例存放在 `bi_dashboard_component`
- 每个组件实例都可以独立保存名称、数据集、图表类型、字段绑定、样式和交互配置
- 大屏组件数据来源支持两条主链路: 数据集 / 页面编写；页面编写可切换数据库、API 接口、表格文本、JSON 静态数据四种来源
- 数据源管理已支持四种正式类型: 数据库、API 接口、表格、JSON 静态数据；数据集仅允许绑定数据库型数据源
- 数据大屏支持截图生成封面，图片保存到 `bi/index` 目录，并通过 `/uploads/index/**` 对外访问
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
