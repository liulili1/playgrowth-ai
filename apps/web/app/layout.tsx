import type { Metadata } from 'next';
import '@playgrowth/ui/styles.css';
import './globals.css';
import { AppProviders } from './providers';

export const metadata: Metadata = {
  title: '智玩增长中枢',
  description: '儿童益智乐园 AI 增长与运营中枢',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
