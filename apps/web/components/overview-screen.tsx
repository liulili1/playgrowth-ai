'use client';

import { fetchDashboardOverview } from '@/lib/dashboard-api';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Database,
  PackageOpen,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';

const metricIconByKey = {
  REVENUE: WalletCards,
  TRIAL_BOOKINGS: CalendarDays,
  CHECK_IN_RATE: ShieldCheck,
  ACTIVE_RENTALS: PackageOpen,
} as const;

const metricToneByKey = {
  REVENUE: 'mint',
  TRIAL_BOOKINGS: 'yellow',
  CHECK_IN_RATE: 'lavender',
  ACTIVE_RENTALS: 'coral',
} as const;

function displayMetric(value: number, format: 'currency_cents' | 'count' | 'percent') {
  if (format === 'currency_cents') return `¥ ${new Intl.NumberFormat('zh-CN').format(value / 100)}`;
  if (format === 'percent') return `${Math.round(value * 100)}%`;
  return new Intl.NumberFormat('zh-CN').format(value);
}

function displayChange(change: number, unit: 'percent' | 'percentage_points') {
  const prefix = change > 0 ? '+' : '';
  const value = Math.abs(change) < 10 ? change.toFixed(1) : Math.round(change).toString();
  return `${prefix}${value}${unit === 'percent' ? '%' : ' 个百分点'}`;
}

export function OverviewScreen() {
  const overview = useQuery({
    queryKey: ['dashboard-overview', 'mock-v1'],
    queryFn: fetchDashboardOverview,
  });

  if (overview.isPending) {
    return <div className="loading-panel">正在从 Mock 事件仓储计算经营看板…</div>;
  }

  if (overview.isError || !overview.data) {
    return (
      <div className="error-panel">
        <CircleAlert size={20} />
        <div>
          <strong>经营数据暂时不可用</strong>
          <p>{overview.error instanceof Error ? overview.error.message : '请稍后重试'}</p>
        </div>
        <button className="outline-button" onClick={() => overview.refetch()} type="button">
          <RefreshCw size={16} /> 重试
        </button>
      </div>
    );
  }

  const data = overview.data;
  const maxFunnelCount = Math.max(...data.funnel.map((stage) => stage.count), 1);

  return (
    <section className="overview-grid">
      <div className="overview-primary">
        <div className="welcome-card">
          <div>
            <p className="eyebrow">{data.dateRange.from} 至 {data.dateRange.to} · 经营事件已接入</p>
            <h2>早上好，今天的增长机会</h2>
            <p>当前由 Mock 事件仓储计算。阶段 1 已验证指标、漏斗与活动归因的服务端数据路径。</p>
          </div>
          <Sparkles className="welcome-icon" size={34} />
        </div>

        <div className="metric-grid">
          {data.metrics.map((item) => {
            const Icon = metricIconByKey[item.key];
            const isPositive = item.change >= 0;
            const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
            return (
              <article className="metric-card" key={item.key}>
                <span className={`metric-icon metric-icon-${metricToneByKey[item.key]}`}><Icon size={19} /></span>
                <p>{item.label}</p>
                <strong>{displayMetric(item.value, item.format)}</strong>
                <span className={isPositive ? 'trend trend-up' : 'trend trend-down'}>
                  <TrendIcon size={14} /> {displayChange(item.change, item.changeUnit)} {item.comparisonLabel}
                </span>
              </article>
            );
          })}
        </div>

        <article className="panel funnel-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">从扫码到付费 · Mock 事件模型</p>
              <h3>本周转化漏斗</h3>
            </div>
            <a className="status-chip" href="/api/v1/growth-events?limit=10" target="_blank">
              查看事件数据
            </a>
          </div>
          <div className="funnel-bars">
            {data.funnel.map((stage) => (
              <div className="funnel-column" key={stage.key}>
                <span className="bar-value">{stage.count}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${Math.max((stage.count / maxFunnelCount) * 100, 15)}%` }} />
                </div>
                <span>{stage.label}</span>
                <small>上周 {stage.previousCount}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel attribution-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">活动归因 · 最后可识别触点</p>
              <h3>本周营收归因覆盖</h3>
            </div>
            <strong className="attribution-rate">{Math.round(data.attribution.coverageRate * 100)}%</strong>
          </div>
          <p className="muted-copy">{data.attribution.note}</p>
          <div className="attribution-track" aria-label="营收归因覆盖率">
            <span style={{ width: `${data.attribution.coverageRate * 100}%` }} />
          </div>
          <p className="attribution-legend">
            已归因 ¥ {(data.attribution.attributedRevenueCents / 100).toLocaleString('zh-CN')} ·
            {' '}{data.attribution.attributedPaymentCount} 笔支付
          </p>
        </article>
      </div>

      <aside className="overview-aside">
        <article className="panel agent-panel">
          <div className="panel-heading">
            <div className="agent-title">
              <span className="agent-icon"><Sparkles size={20} /></span>
              <h3>AI 增长助手</h3>
            </div>
            <span className="status-chip">阶段 3</span>
          </div>
          <p className="question-bubble">为什么本周试听到报名下降？</p>
          <p className="muted-copy">阶段 1 已提供 Agent 后续需要的漏斗、归因与事件查询 API；AI、工具调用和审批仍未启用。</p>
          <button className="disabled-action" type="button" disabled>
            <ShieldCheck size={17} /> Agent 需在阶段 3 启用
          </button>
        </article>

        <article className="panel readiness-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">阶段 1 数据状态</p>
              <h3>看板已接入 API</h3>
            </div>
            <Database size={21} className="panel-icon" />
          </div>
          <ul className="check-list">
            <li><span>✓</span> 经营事件与漏斗计算</li>
            <li><span>✓</span> 上周期对比与租赁快照</li>
            <li><span>✓</span> 活动来源归因与下钻 API</li>
            <li><span>✓</span> Mock 导入校验</li>
          </ul>
        </article>

        <article className="panel insight-panel">
          <div className="panel-heading">
            <h3>数据观察</h3>
            <span className="source-badge">Mock</span>
          </div>
          <ul className="insight-list">
            {data.insights.map((insight) => (
              <li key={insight.title}>
                <CircleAlert size={16} className={insight.severity === 'attention' ? 'attention-icon' : 'info-icon'} />
                <div><strong>{insight.title}</strong><p>{insight.description}</p></div>
              </li>
            ))}
          </ul>
        </article>
      </aside>
    </section>
  );
}
