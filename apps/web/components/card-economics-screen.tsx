'use client';

import { fetchMembershipEconomics } from '@/lib/dashboard-api';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleAlert, Database, RefreshCw, TicketCheck, TrendingUp, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const formatCurrency = (value: number | null) => value === null ? '—' : `¥ ${new Intl.NumberFormat('zh-CN').format(value / 100)}`;
const formatPercent = (value: number | null) => value === null ? '—' : `${Math.round(value * 100)}%`;

export function CardEconomicsScreen() {
  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(90);
  const economics = useQuery({
    queryKey: ['membership-economics', windowDays],
    queryFn: () => fetchMembershipEconomics(windowDays),
  });

  if (economics.isPending) return <div className="loading-panel">正在计算月卡与次卡的 cohort 数据…</div>;
  if (economics.isError || !economics.data) {
    return (
      <div className="error-panel">
        <CircleAlert size={20} />
        <div><strong>会员经营数据暂时不可用</strong><p>{economics.error instanceof Error ? economics.error.message : '请稍后重试'}</p></div>
        <button className="outline-button" onClick={() => economics.refetch()} type="button"><RefreshCw size={16} /> 重试</button>
      </div>
    );
  }

  const data = economics.data;
  const [monthly, times] = data.rows;
  const revenueLeader = monthly.revenuePerEligibleChildCents === null || times.revenuePerEligibleChildCents === null
    ? null
    : monthly.revenuePerEligibleChildCents >= times.revenuePerEligibleChildCents ? monthly : times;
  const totalEligible = monthly.eligibleSampleSize + times.eligibleSampleSize;

  return (
    <section className="economics-layout">
      <article className="panel economics-hero">
        <div>
          <p className="eyebrow">会员经营 · 首购 cohort</p>
          <h2>月卡和次卡，哪一种带来更高的长期实收？</h2>
          <p>以儿童首张激活卡为起点，比较固定观察窗口内的卡费与续卡收入。当前仅为门店演示口径，尚未接入固定成本分摊。</p>
        </div>
        <div className="window-toggle" aria-label="观察窗口">
          {([30, 60, 90] as const).map((value) => (
            <button className={windowDays === value ? 'window-option window-option-active' : 'window-option'} key={value} onClick={() => setWindowDays(value)} type="button">
              {value} 天
            </button>
          ))}
        </div>
      </article>

      <div className="economics-summary-grid">
        <article className="metric-card">
          <span className="metric-icon metric-icon-mint"><TrendingUp size={19} /></span>
          <p>{windowDays} 天单客实收领先</p>
          <strong>{revenueLeader?.label ?? '观察中'}</strong>
          <span className="trend trend-up">{revenueLeader ? formatCurrency(revenueLeader.revenuePerEligibleChildCents) : '样本不足'}</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-yellow"><UsersRound size={19} /></span>
          <p>已完成观察儿童</p>
          <strong>{totalEligible}</strong>
          <span className="trend">月卡 {monthly.eligibleSampleSize} · 次卡 {times.eligibleSampleSize}</span>
        </article>
        <article className="metric-card">
          <span className="metric-icon metric-icon-lavender"><TicketCheck size={19} /></span>
          <p>当前数据来源</p>
          <strong>{data.dataSource === 'imported' ? '已导入' : 'Mock'}</strong>
          <span className="trend">截至 {data.asOf}</span>
        </article>
      </div>

      <article className="panel economics-table-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">可比 cohort · {windowDays} 天窗口</p><h3>卡种收益与使用对比</h3></div>
          <Link className="outline-button" href="/imports"><Database size={16} /> 导入自己的数据</Link>
        </div>
        <div className="economics-table-scroll">
          <table className="economics-table">
            <thead>
              <tr>
                <th>卡种</th>
                <th>样本 / 完成观察</th>
                <th>{windowDays} 天累计实收</th>
                <th>单客实收</th>
                <th>30 天续卡率</th>
                <th>同卡续卡</th>
                <th>换卡率</th>
                <th>平均到店天数</th>
                <th>峰时占比</th>
                <th>活动参与</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.cardKind}>
                  <td><strong>{row.label}</strong><small>{row.cardKind}</small></td>
                  <td>{row.sampleSize} / {row.eligibleSampleSize}{row.observingSampleSize > 0 && <small>另有 {row.observingSampleSize} 观察中</small>}</td>
                  <td>{formatCurrency(row.netRevenueCents)}</td>
                  <td className={revenueLeader?.cardKind === row.cardKind ? 'economics-emphasis' : ''}>{formatCurrency(row.revenuePerEligibleChildCents)}</td>
                  <td>{formatPercent(row.renewalRate30d)}</td>
                  <td>{formatPercent(row.sameKindRenewalRate30d)}</td>
                  <td>{formatPercent(row.switchedCardRate30d)}</td>
                  <td>{row.averageVisitDays === null ? '—' : `${row.averageVisitDays} 天`}</td>
                  <td>{formatPercent(row.peakVisitShare)}</td>
                  <td>{formatPercent(row.activityParticipationRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="economics-bottom-grid">
        <article className="panel comparison-panel">
          <p className="eyebrow">当前读法</p>
          <h3>{revenueLeader ? `${revenueLeader.label}在已完成 cohort 中的单客实收更高` : '暂不能比较卡种收益'}</h3>
          <p className="muted-copy">这不是取消或调价建议。请同时看样本量、续卡率、峰时占用和家长反馈；样本不足时应继续收集，而不是下结论。</p>
          <span className="insight-arrow"><ArrowRight size={17} /> 下一步：补齐到店签到与续卡关联</span>
        </article>
        <article className="panel data-quality-panel">
          <div className="panel-heading"><h3>数据完整度</h3><span className="source-badge">{data.dataSource === 'imported' ? '导入数据' : '示例数据'}</span></div>
          {data.rows.map((row) => (
            <div className="quality-row" key={row.cardKind}>
              <span>{row.label}到店数据覆盖</span>
              <strong>{formatPercent(row.visitDataCoverageRate)}</strong>
              <div className="quality-track"><i style={{ width: `${row.visitDataCoverageRate * 100}%` }} /></div>
            </div>
          ))}
        </article>
      </div>

      {data.warnings.length > 0 && (
        <article className="economics-warnings">
          <CircleAlert size={18} />
          <div>{data.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
        </article>
      )}
    </section>
  );
}
