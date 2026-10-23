import { serverEnv } from '@playgrowth/config';

const shutdown = (signal: string) => {
  console.info(`[worker] received ${signal}; shutting down cleanly`);
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.info(`[worker] ${serverEnv.APP_NAME} worker is ready (bootstrap mode)`);
console.info('[worker] queues are intentionally disabled until stage 1 introduces persistence.');

// 保持开发 Worker 进程存活；阶段 1 将在此注册导入、日报和归因任务。
setInterval(() => undefined, 60_000);
