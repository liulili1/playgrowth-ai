# 智玩增长中枢（PlayGrowth AI）

儿童益智乐园的 AI 增长与运营中枢。当前完成了**阶段 1 的最小可演示闭环**：门店可以下载卡种经营模板，导入 CSV 或 Excel 卡明细，并按 30 / 60 / 90 天 cohort 对比月卡与次卡的实收、续卡及使用情况。

## 阶段 1 已实现

- 月卡/次卡经营数据导入页，提供 CSV 与 XLSX 模板下载。
- CSV、XLSX 上传、字段校验、重复卡号与续卡关联校验。
- 卡种经营看板：累计实收、单客实收、30 天续卡率、到店天数、峰时占比与活动参与率。
- 30 / 60 / 90 天首购 cohort 观察窗口与样本不足提示。

这是一个可部署的最小闭环：在 Cloudflare Workers 上运行，并将导入数据保存到 Cloudflare D1。首次访问会写入内置 Mock 数据；成功导入 CSV/XLSX 后，数据会持久化并立即参与月卡/次卡分析。

## 架构

```text
apps/web       Vinext/Next.js 前端 + Workers BFF API + D1 访问层
apps/worker    异步任务 Worker（当前为健康占位）
packages/*     共享配置、领域、契约、UI 包
infra/compose  后续阶段的本地基础设施草案
```

采用模块化单体，而不是过早拆分微服务。当前 MVP 的会员卡经营事实由 D1 持有；AI、异步任务和外部集成均通过受控边界接入。

## 本地启动

```bash
pnpm install
pnpm dev
```

- 管理台：`http://localhost:3001/overview`
- 数据导入：`http://localhost:3001/imports`
- 会员经营：`http://localhost:3001/membership/economics`
- 健康检查：`http://localhost:3001/api/health`
- 本地数据：由 Cloudflare Vite 插件提供的 Miniflare D1 模拟。

如需本地基础设施：

```bash
docker compose -f infra/compose/docker-compose.yml up -d
```

## 常用命令

```bash
pnpm typecheck
pnpm build
pnpm deploy
```

当前验收以类型检查、Workers 生产构建，以及 CSV/XLSX 导入到 D1 后的经营看板分析为准。具体部署步骤见 [Cloudflare 部署说明](docs/cloudflare-deployment.md)。

## 阶段边界

- 阶段 0：✅ 初始化仓库、UI Shell、Mock 数据、健康检查、Worker 与基础设施定义。
- 阶段 1：✅ 模板下载、CSV/XLSX 导入、卡种数据校验、月卡/次卡 cohort 看板。
- 阶段 2+：⏸️ 活动内容工厂、Agent/审批、玩具租赁、真实购卡/签到流水接入与复盘。
