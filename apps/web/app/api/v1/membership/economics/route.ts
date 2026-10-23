import { getMembershipEconomics } from '@/lib/membership-card-store';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const candidate = Number(request.nextUrl.searchParams.get('windowDays') ?? '90');
  if (candidate !== 30 && candidate !== 60 && candidate !== 90) {
    return NextResponse.json(
      { code: 'INVALID_WINDOW', message: '观察窗口仅支持 30、60 或 90 天', requestId: crypto.randomUUID() },
      { status: 400 },
    );
  }

  return NextResponse.json(getMembershipEconomics(candidate), {
    headers: { 'Cache-Control': 'no-store', 'X-Data-Source': 'mock' },
  });
}
