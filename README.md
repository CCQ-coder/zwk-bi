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
- 大屏运行时数据已改为普通图表后端聚合返回，预览画布首屏按批次加载组件数据，降低大数据场景的请求并发与前端卡顿
- 工作台与公共导航视觉已调整为浅色蓝绿 BI 风格，整体配色更接近企业 BI 产品的留白、玻璃卡片和柔和渐变方案
- 大屏编辑器、图表编辑器和右侧属性检查器已同步改为更克制的浅色 BI 编辑界面，去掉重霓虹和过强 AI 风格
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
---
description: Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
alwaysApply: true
---

# Karpathy behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and
减少常见LLM编码错误的行为指南。根据需要与项目相关的说明合并。

权衡：这些指南偏向谨慎而非速度。对于琐碎的任务，用判断力。

1. 在编码前三思
别妄下定论。不要掩饰困惑。表面权衡。

在实施之前：

明确表达你的假设。如果不确定，可以问。
如果存在多种解读，就提出来——不要默默选择。
如果有更简单的方法，请说明。必要时反驳。
如果有什么不清楚的地方，就停止。说出什么让人困惑。问吧。
2. 简洁优先
只需最小限度的代码来解决问题。没有任何猜测性内容。

除了被要求的部分，没有其他特征。
一次性代码不做抽象。
没有没有“灵活性”或“可配置性”，这是他们主动要求的。
不可能的情景没有错误处理。
如果你写了200行，可能只有50行，那就重写。
问问自己：“高级工程师会说这太复杂了吗？”如果是，那就简化。

3. 手术变更
只触碰你必须触碰的部分。只收拾你自己的烂摊子。

编辑现有代码时：

不要“改进”相邻的代码、注释或格式。
不要重构那些没有坏掉的东西。
即使你会用不同的方式，也要匹配现有的风格。
如果你发现了无关的死代码，要提一提——不要删除。
当你的更改产生孤儿时：

移除那些是你自己改动导致没用到的导入/变量/函数。
除非被要求，不要删除已有的死代码。
测试：每一行更改的线条都应直接追踪到用户的请求。

4. 目标驱动执行
定义成功标准。循环直到确认。

将任务转化为可验证的目标：

“添加验证”→“为无效输入写测试，然后让它们通过”
“修复bug”→“写一个复现它的测试，然后让它通过”。
“重构X”→“确保测试在前后通过”
对于多步骤任务，请提出简要计划：

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
强有力的成功标准让你可以独立循环。薄弱的标准（“让它奏效”）需要不断澄清。
示例
真实世界的代码示例展示了这四个原则。每个示例都展示了大型语言模型常见的错误以及如何修复。

1. 在编码前三思
示例1：隐藏假设
用户请求：“添加功能以导出用户数据”

❌ 大型语言模型的作用（错误假设）

def export_users(format='json'):
    """Export all users to a file."""
    users = User.query.all()
    
    if format == 'json':
        with open('users.json', 'w') as f:
            json.dump([u.to_dict() for u in users], f)
    elif format == 'csv':
        with open('users.csv', 'w') as f:
            writer = csv.DictWriter(f, fieldnames=['id', 'email', 'name'])
            writer.writeheader()
            writer.writerows([u.to_dict() for u in users])
    
    return f"Exported {len(users)} users"
问题：

我以为它应该导出所有用户（分页呢？隐私呢？）
未经询问就假设了文件位置
假设包含哪些字段
假设CSV字段名未核实实际数据结构
✅ 应该发生什么（表面假设）

Before implementing, I need to clarify:

1. **Scope**: Export all users or filtered subset? (privacy implications)
2. **Format**: You mentioned "export" - did you mean:
   - Download file in browser?
   - Background job with email notification?
   - API endpoint returning data?
3. **Fields**: Which user fields? (some might be sensitive)
4. **Volume**: How many users typically? (affects approach)

Simplest approach: Add an API endpoint that returns paginated JSON.
Would need more info for file-based exports.

What's your preference?
示例2：多重解释
用户请求：“加快搜索速度”

❌ 大型语言模型的作用（悄无声息地选择）

# Adds caching, database indexes, and async processing
# without asking which "faster" matters
@lru_cache(maxsize=1000)
async def search(query: str) -> List[Result]:
    # ... 200 lines of optimization code
✅ 应该发生什么

"Make the search faster" could mean:

1. **Faster response time** (< 100ms instead of 500ms)
   - Add database indexes
   - Cache frequent queries
   - Estimated effort: 2 hours

2. **Handle more concurrent searches** (throughput)
   - Add async/await
   - Connection pooling
   - Estimated effort: 4 hours

3. **Faster perceived speed** (UX)
   - Show partial results immediately
   - Progressive loading
   - Estimated effort: 3 hours

Current search takes ~500ms for typical queries. 
Which aspect matters most for your use case?
2. 简洁优先
示例1：过度抽象
用户请求：“添加一个函数来计算折扣”

❌ 大型语言模型的作用（过度设计）

from abc import ABC, abstractmethod
from enum import Enum
from typing import Protocol, Union
from dataclasses import dataclass

class DiscountStrategy(ABC):
    @abstractmethod
    def calculate(self, amount: float) -> float:
        pass

class PercentageDiscount(DiscountStrategy):
    def __init__(self, percentage: float):
        self.percentage = percentage
    
    def calculate(self, amount: float) -> float:
        return amount * (self.percentage / 100)

class FixedDiscount(DiscountStrategy):
    def __init__(self, fixed_amount: float):
        self.fixed_amount = fixed_amount
    
    def calculate(self, amount: float) -> float:
        return min(self.fixed_amount, amount)

@dataclass
class DiscountConfig:
    strategy: DiscountStrategy
    min_purchase: float = 0.0
    max_discount: float = float('inf')

class DiscountCalculator:
    def __init__(self, config: DiscountConfig):
        self.config = config
    
    def apply_discount(self, amount: float) -> float:
        if amount < self.config.min_purchase:
            return 0
        discount = self.config.strategy.calculate(amount)
        return min(discount, self.config.max_discount)

# Usage requires 30+ lines of setup for a simple calculation
✅ 应该发生什么（简单）

def calculate_discount(amount: float, percent: float) -> float:
    """Calculate discount amount. percent should be 0-100."""
    return amount * (percent / 100)

# Usage
discount = calculate_discount(100.0, 10.0)  # $10 off
何时增加复杂度：只有在你真正需要多种折扣类型时才会增加。如果这个要求是后期出现的，那就重构吧。

示例2：推测性特征
用户请求：“将用户偏好保存到数据库”

❌ 大型语言模型的作用（不必要的功能）

class PreferenceManager:
    def __init__(self, db, cache=None, validator=None):
        self.db = db
        self.cache = cache or InMemoryCache()
        self.validator = validator or DefaultValidator()
    
    def save(self, user_id: int, prefs: dict, 
             merge: bool = True, 
             validate: bool = True,
             notify: bool = False) -> bool:
        """Save preferences with optional merging, validation, and notifications."""
        
        if validate:
            errors = self.validator.validate(prefs)
            if errors:
                raise ValidationError(errors)
        
        existing = self.get(user_id) if merge else {}
        
        if merge:
            existing.update(prefs)
            prefs = existing
        
        self.db.execute(
            "UPDATE users SET preferences = ? WHERE id = ?",
            (json.dumps(prefs), user_id)
        )
        
        if self.cache:
            self.cache.set(f"prefs:{user_id}", prefs)
        
        if notify:
            self.notify_preference_change(user_id, prefs)
        
        return True
    
    def notify_preference_change(self, user_id: int, prefs: dict):
        # Another 30 lines for a feature nobody asked for
        pass
✅ 应该发生什么（只是被问到的）

def save_preferences(db, user_id: int, preferences: dict):
    """Save user preferences to database."""
    db.execute(
        "UPDATE users SET preferences = ? WHERE id = ?",
        (json.dumps(preferences), user_id)
    )
如有需要，稍后添加：缓存（性能重要时）、验证（出现不良数据时）、合并（需求出现时）。

3. 手术变更
示例1：驾车重构
用户请求：“修复空邮件导致验证器崩溃的漏洞”

❌ 大型语言模型的作用（太多了）

  def validate_user(user_data):
-     # Check email format
-     if not user_data.get('email'):
+     """Validate user data."""
+     email = user_data.get('email', '').strip()
+     
+     # Validate email
+     if not email:
          raise ValueError("Email required")
-     
-     # Basic email validation
-     if '@' not in user_data['email']:
+     if '@' not in email or '.' not in email.split('@')[1]:
          raise ValueError("Invalid email")
      
-     # Check username
-     if not user_data.get('username'):
+     # Validate username
+     username = user_data.get('username', '').strip()
+     if not username:
          raise ValueError("Username required")
+     if len(username) < 3:
+         raise ValueError("Username too short")
+     if not username.isalnum():
+         raise ValueError("Username must be alphanumeric")
      
      return True
问题：

除了修复漏洞之外，邮件验证功能“改进”
添加了用户名验证，没人要求
修改了评论
新增文件
✅ 应该发生什么（外科手术）

  def validate_user(user_data):
      # Check email format
-     if not user_data.get('email'):
+     email = user_data.get('email', '')
+     if not email or not email.strip():
          raise ValueError("Email required")
      
      # Basic email validation
-     if '@' not in user_data['email']:
+     if '@' not in email:
          raise ValueError("Invalid email")
      
      # Check username
      if not user_data.get('username'):
          raise ValueError("Username required")
      
      return True
仅做了更改：具体的话，就是解决空邮件处理问题的具体行。

示例2：风格漂移
用户请求：“在上传功能中添加日志”

❌ LLM的作用（重新格式化一切）

- def upload_file(file_path, destination):
+ def upload_file(file_path: str, destination: str) -> bool:
+     """Upload file to destination with logging."""
+     logger.info(f"Uploading {file_path} to {destination}")
+     
      try:
-         with open(file_path, 'rb') as f:
-             data = f.read()
-         
-         response = requests.post(destination, files={'file': data})
-         
-         if response.status_code == 200:
-             return True
-         else:
-             return False
+         with open(file_path, "rb") as f:
+             data = f.read()
+         response = requests.post(destination, files={"file": data})
+         success = response.status_code == 200
+         
+         if success:
+             logger.info(f"Upload successful: {file_path}")
+         else:
+             logger.error(f"Upload failed: {file_path}, status={response.status_code}")
+         
+         return success
      except Exception as e:
-         print(f"Error: {e}")
+         logger.exception(f"Upload error for {file_path}: {e}")
          return False
问题：

更改引号样式（'' 改为 “””
添加了没人要求的类型提示
新增文件
重新格式化的空白空间
更改了布尔返回逻辑
✅ 应该发生什么（匹配现有风格）

+ import logging
+ 
+ logger = logging.getLogger(__name__)
+ 
  def upload_file(file_path, destination):
+     logger.info(f'Starting upload: {file_path}')
      try:
          with open(file_path, 'rb') as f:
              data = f.read()
          
          response = requests.post(destination, files={'file': data})
          
          if response.status_code == 200:
+             logger.info(f'Upload successful: {file_path}')
              return True
          else:
+             logger.error(f'Upload failed: {file_path}, status={response.status_code}')
              return False
      except Exception as e:
-         print(f"Error: {e}")
+         logger.exception(f'Upload error: {file_path}')
          return False
匹配：单引号，无类型提示，已有布尔模式，间距样式。

4. 目标驱动执行
示例1：模糊与可验证
用户请求：“修复认证系统”

❌ 大型语言模型的作用（模糊方法）

I'll fix the authentication system by:
1. Reviewing the code
2. Identifying issues
3. Making improvements
4. Testing the changes

[Proceeds to make changes without clear success criteria]
✅ 应发生的事情（可验证目标）

To "fix authentication," I need to define success criteria. 
What specific issue are we solving?

If the issue is "users stay logged in after password change":

Plan:
1. Write test: Change password → verify old session invalidated
   Verify: Test fails (reproduces bug)

2. Implement: Invalidate sessions on password change
   Verify: Test passes

3. Check edge cases: Multiple active sessions, concurrent changes
   Verify: Additional tests pass

4. Verify no regression: Existing auth tests still pass
   Verify: Full test suite green

Current test coverage for auth: [shows coverage]
What's the specific auth issue you're seeing?
示例2：多步骤验证
用户请求：“为 API 添加速率限制”

❌ 大型语言模型的作用（同时）

# Implements full rate limiting with Redis, multiple strategies,
# configuration system, and monitoring in one 300-line commit
# No clear verification steps
✅ 应发生什么（带验证的增量）

Plan for rate limiting:

1. Add basic in-memory rate limiting (single endpoint)
   Verify: 
   - Test: 100 requests → first 10 succeed, rest get 429
   - Manual: curl endpoint 11 times, see rate limit error

2. Extract to middleware (apply to all endpoints)
   Verify:
   - Test: Rate limits apply to /users and /posts
   - Existing endpoint tests still pass

3. Add Redis backend (for multi-server)
   Verify:
   - Test: Rate limit persists across app restarts
   - Test: Two app instances share rate limit counter

4. Add configuration (rates per endpoint)
   Verify:
   - Test: /search allows 10/min, /users allows 100/min
   - Config file parsed correctly

Each step is independently verifiable and deployable.
Start with step 1?
示例3：测试优先验证
用户请求：“当分数重复时，排序会中断”

❌ 大型语言模型的作用（修复而不复制）

# Immediately changes sort logic without confirming the bug
def sort_scores(scores):
    return sorted(scores, key=lambda x: (-x['score'], x['name']))
✅ 应该发生什么（先繁殖）

# 1. First, write a test that reproduces the issue
def test_sort_with_duplicate_scores():
    """Test sorting when multiple items have same score."""
    scores = [
        {'name': 'Alice', 'score': 100},
        {'name': 'Bob', 'score': 100},
        {'name': 'Charlie', 'score': 90},
    ]
    
    result = sort_scores(scores)
    
    # The bug: order is non-deterministic for duplicates
    # Run this test multiple times, it should be consistent
    assert result[0]['score'] == 100
    assert result[1]['score'] == 100
    assert result[2]['score'] == 90

# Verify: Run test 10 times → fails with inconsistent ordering

# 2. Now fix with stable sort
def sort_scores(scores):
    """Sort by score descending, then name ascending for ties."""
    return sorted(scores, key=lambda x: (-x['score'], x['name']))

# Verify: Test passes consistently
反模式总结
原理	反模式	修复
写代码前先思考	默默认定文件格式、字段、范围	明确列出假设，要求澄清
简洁优先	单一折现计算的策略模式	在真正需要复杂度之前，只有一个函数
手术变更	重排引言，添加字体提示，同时修复错误	只更换能解决报告问题的线路
目标驱动	“我会审查并改进代码。”	“写测试漏洞X，→让它通过→验证没有回归”
关键见解
“过于复杂”的例子并不明显错误——它们遵循设计模式和最佳实践。问题在于时机：它们在需要之前就增加了复杂性，这也就是：

这让代码更难理解
引入更多漏洞
实施时间更长
更难测试
“简单”版本有：

更容易理解
实现更快
更容易测试
当需要复杂度时，可以进行重构
好的代码是能简单解决当下问题的代码，而不是过早地解决明天的问题