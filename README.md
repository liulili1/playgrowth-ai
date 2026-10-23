# 智玩增长中枢（PlayGrowth AI）

儿童益智乐园的 AI 增长与运营中枢。当前完成了**阶段 1 的最小可演示闭环**：门店可以下载卡种经营模板，导入 CSV 或 Excel 卡明细，并按 30 / 60 / 90 天 cohort 对比月卡与次卡的实收、续卡及使用情况。

## 阶段 1 已实现

- 月卡/次卡经营数据导入页，提供 CSV 与 XLSX 模板下载。
- CSV、XLSX 上传、字段校验、重复卡号与续卡关联校验。
- 卡种经营看板：累计实收、单客实收、30 天续卡率、到店天数、峰时占比与活动参与率。
- 30 / 60 / 90 天首购 cohort 观察窗口与样本不足提示。

这是一个演示版闭环：导入数据暂存于服务进程内存，重启服务后会恢复内置 Mock 数据；持久化数据库与真实购卡/签到流水接入留待下一阶段。

## 架构

```text
apps/web       Next.js 前端 + BFF API
apps/worker    异步任务 Worker（当前为健康占位）
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
- 数据导入：`http://localhost:3000/imports`
- 会员经营：`http://localhost:3000/membership/economics`
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

当前验收以类型检查、健康检查、生产构建，以及 CSV/XLSX 导入到经营看板的最小闭环为准。

## 阶段边界

- 阶段 0：✅ 初始化仓库、UI Shell、Mock 数据、健康检查、Worker 与基础设施定义。
- 阶段 1：✅ 模板下载、CSV/XLSX 导入、卡种数据校验、月卡/次卡 cohort 看板。
- 阶段 2+：⏸️ 活动内容工厂、Agent/审批、玩具租赁、部署与复盘。
