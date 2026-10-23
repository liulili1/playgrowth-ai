'use client';

import {
  BarChart3,
  Blocks,
  CalendarDays,
  Crown,
  FileUp,
  LayoutDashboard,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const navigation = [
  { label: '总览', icon: LayoutDashboard, href: '/overview' },
  { label: '会员经营', icon: UsersRound, href: '/membership/economics' },
  { label: '数据导入', icon: FileUp, href: '/imports' },
  { label: '活动增长', icon: BarChart3, disabled: true },
  { label: '课程教务', icon: CalendarDays, disabled: true },
  { label: '玩具租赁', icon: Blocks, disabled: true },
  { label: '会员明细', icon: UsersRound, disabled: true },
];

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="console-shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-label="智玩增长中枢">
          <span className="brand-icon">
            <Sparkles size={21} strokeWidth={2.5} />
          </span>
          <span>
            <strong>智玩增长中枢</strong>
            <small>让更多孩子在玩中成长</small>
          </span>
        </div>
        <nav className="sidebar-nav" aria-label="主导航">
          {navigation.map(({ label, icon: Icon, href, disabled }) =>
            href ? (
              <Link className={pathname.startsWith(href) ? 'nav-item nav-item-active' : 'nav-item'} href={href} key={label}>
                <Icon size={20} />
                {label}
              </Link>
            ) : (
              <button className="nav-item nav-item-disabled" disabled={disabled} key={label} type="button">
                <Icon size={20} />
                {label}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-footer">
          <Crown size={18} />
          <span>阶段 1 · 导入闭环</span>
        </div>
      </aside>
      <main className="console-main">
        <header className="console-header">
          <div>
            <p className="eyebrow">光合益智乐园 · 阶段 1 可导入 Demo</p>
            <h1>店长工作台</h1>
          </div>
          <button className="primary-button" type="button" disabled>
            <Sparkles size={18} />
            新建活动（阶段 2）
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}
