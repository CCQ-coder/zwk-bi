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
- 前端模块: 登录、数据源管理、数据集 SQL、图表设计、仪表盘
- 后端模块: AuthAPI、DatasourceAPI、DatasetAPI、ChartAPI、DashboardAPI
- 数据模型: bi_datasource、bi_dataset、bi_chart、bi_dashboard、bi_dashboard_chart、bi_user

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

```bash
cd backend
mvn spring-boot:run
```

3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

4. 健康检查
- 后端: `http://localhost:8080/api/health`
- 前端: `http://localhost:5173`

## 后端 API（基础骨架）
- POST `/api/auth/login`
- GET `/api/datasources`
- GET `/api/datasets`
- GET `/api/charts`
- GET `/api/dashboard/default`

## DataX 示例
DataX 任务示例位于 `data-integration/datax/job/mysql_to_clickhouse.json`，示例为 MySQL 订单明细同步到 ClickHouse `bi_order_detail`。

## ETL 示例
SQL 同步示例位于 `data-integration/etl/sync.sql`，包含订单明细导入与 KPI 日汇总逻辑。
