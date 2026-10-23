import { HealthResponseSchema } from '@playgrowth/contracts';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = HealthResponseSchema.parse({
    status: 'ok',
    service: 'web',
    stage: 'bootstrap',
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
