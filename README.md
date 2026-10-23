# 智玩增长中枢（PlayGrowth AI）

儿童益智乐园的 AI 增长与运营中枢。当前处于**阶段 0：工程初始化**，包含可运行的管理台骨架、设计令牌、Mock 数据、健康检查、Worker 占位与本地基础设施配置；尚未实现阶段 1 的真实导入、数据模型、看板聚合或 Agent。

## 架构

```text
apps/web       Next.js 前端 + BFF API
apps/worker    异步任务 Worker（阶段 0 为健康占位）
packages/*     共享配置、领域、契约、UI 包
infra/compose  本地 PostgreSQL / Redis / MinIO
```

采用模块化单体，而不是过早拆分微服务。业务事实将由 PostgreSQL 持有；AI、异步任务和外部集成均通过受控边界接入。

## 本地启动

```bash
cp .env.example .env
pnpm install
pnpm dev
```

- 管理台：`http://localhost:3000/overview`
- 健康检查：`http://localhost:3000/api/health`
- Worker：运行在 `pnpm dev` 的第二个进程中

如需本地基础设施：

```bash
docker compose -f infra/compose/docker-compose.yml up -d
```

## 常用命令

```bash
pnpm typecheck
pnpm build
```

测试、格式化和完整 CI 会与阶段 1 的数据库与导入功能一起接入；阶段 0 的验收以类型检查、健康检查和生产构建为准。

## 阶段边界

- 阶段 0：✅ 初始化仓库、UI Shell、Mock 数据、健康检查、Worker 与基础设施定义。
- 阶段 1：⏸️ 数据库迁移、CSV 导入、事件模型、真实 KPI 与漏斗。
- 阶段 2+：⏸️ 活动内容工厂、Agent/审批、玩具租赁、部署与复盘。

具体实现约束见 [技术开发文档](../outputs/智玩增长中枢_技术开发文档_v1.md) 与 [PRD](../outputs/儿童益智乐园AI增长运营中枢_PRD.md)。
