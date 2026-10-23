# Cloudflare Workers + D1 部署说明

本项目使用 Vinext 将 Next.js App Router 运行在 Cloudflare Workers 中；会员卡导入与卡种经营分析使用 D1 持久化。导入一次 CSV/XLSX 后，即使 Worker 重启，数据仍会保留。

## 前置条件

- Node.js 22 或更高版本。
- 已登录 Cloudflare，且账号具备 Workers 与 D1 的创建权限。
- 在仓库根目录执行命令。

## 本地开发与验证

```bash
pnpm install
pnpm dev
```

开发服务默认启动在 `http://localhost:3001`。首次访问会员经营接口时会自动创建本地表结构并写入演示数据；上传模板 CSV/XLSX 后会替换本地 D1 中的卡明细。

```bash
pnpm --filter @playgrowth/web typecheck
pnpm --filter @playgrowth/web build
```

应用保留了首次启动的幂等建表保护，因此本地 Miniflare 从零开始即可运行。生产环境仍应执行 SQL 迁移，便于后续追踪结构变更。

## 首次生产部署

1. 登录 Cloudflare CLI。若本机还没有登录态，执行：

   ```bash
   cd apps/web
   npx cf auth login
   ```

2. 创建 D1 数据库，并记录命令输出中的数据库 ID：

   ```bash
   npx cf d1 create playgrowth-ai
   ```

3. 在当前终端设置该 ID，执行生产迁移并部署：

   ```bash
   export PLAYGROWTH_D1_DATABASE_ID="<D1_DATABASE_ID>"
   pnpm --filter @playgrowth/web db:migrate:remote -- "$PLAYGROWTH_D1_DATABASE_ID" --dir migrations
   pnpm deploy
   ```

部署成功后，CLI 会输出 `https://playgrowth-ai.<你的子域>.workers.dev` 形式的访问地址。

## 后续部署

数据库 ID 不变时，每次发布只需在终端中保留 `PLAYGROWTH_D1_DATABASE_ID`，然后执行：

```bash
pnpm deploy
```

若新增了 `apps/web/migrations` 下的 SQL 迁移，先执行：

```bash
pnpm --filter @playgrowth/web db:migrate:remote -- "$PLAYGROWTH_D1_DATABASE_ID" --dir migrations
```

再部署 Worker。

## 运行时配置

- Worker 名称：`playgrowth-ai`
- D1 绑定名：`PLAYGROWTH_DB`
- D1 数据库名：`playgrowth-ai`
- 生产数据库 ID：由 `PLAYGROWTH_D1_DATABASE_ID` 在构建/部署时注入，不提交到 Git。
- 数据库迁移：`apps/web/migrations/0001_membership_cards.sql`
