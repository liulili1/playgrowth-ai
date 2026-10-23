import { DateRangeSchema, GrowthEventTypeSchema } from '@playgrowth/contracts';
import { DEFAULT_MOCK_RANGE, listMockGrowthEvents } from '@/lib/mock-growth-repository';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const range = DateRangeSchema.safeParse({
    from: params.get('from') ?? DEFAULT_MOCK_RANGE.from,
    to: params.get('to') ?? DEFAULT_MOCK_RANGE.to,
  });
  const eventType = params.get('eventType');
  const parsedEventType = eventType ? GrowthEventTypeSchema.safeParse(eventType) : undefined;
  const limit = Number(params.get('limit') ?? '20');

  if (!range.success || (parsedEventType && !parsedEventType.success) || !Number.isFinite(limit)) {
    return NextResponse.json(
      { code: 'INVALID_QUERY', message: '查询参数无效', requestId: crypto.randomUUID() },
      { status: 400 },
    );
  }

  return NextResponse.json(
    listMockGrowthEvents({
      range: range.data,
      campaignId: params.get('campaignId') ?? undefined,
      eventType: parsedEventType?.data,
      cursor: params.get('cursor') ?? undefined,
      limit,
    }),
    { headers: { 'Cache-Control': 'no-store', 'X-Data-Source': 'mock' } },
  );
}
