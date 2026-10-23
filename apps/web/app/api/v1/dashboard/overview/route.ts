import { DateRangeSchema } from '@playgrowth/contracts';
import { getMockDashboardOverview, DEFAULT_MOCK_RANGE } from '@/lib/mock-growth-repository';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const range = DateRangeSchema.safeParse({
    from: request.nextUrl.searchParams.get('from') ?? DEFAULT_MOCK_RANGE.from,
    to: request.nextUrl.searchParams.get('to') ?? DEFAULT_MOCK_RANGE.to,
  });

  if (!range.success) {
    return NextResponse.json(
      { code: 'INVALID_DATE_RANGE', message: '日期范围无效', requestId: crypto.randomUUID() },
      { status: 400 },
    );
  }

  return NextResponse.json(getMockDashboardOverview(range.data), {
    headers: { 'Cache-Control': 'no-store', 'X-Data-Source': 'mock' },
  });
}
