import { MockImportRequestSchema } from '@playgrowth/contracts';
import { validateMockImport } from '@/lib/mock-growth-repository';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = MockImportRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { code: 'INVALID_IMPORT', message: '导入数据格式无效', requestId: crypto.randomUUID() },
      { status: 422 },
    );
  }

  return NextResponse.json(validateMockImport(body.data), {
    status: 201,
    headers: { 'X-Data-Source': 'mock' },
  });
}
