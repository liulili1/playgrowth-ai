import { MembershipImportResultSchema } from '@playgrowth/contracts';
import { replaceMembershipCards } from '@/lib/membership-card-store';
import { parseMembershipCardImport } from '@/lib/spreadsheet-import';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const maxFileSize = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const candidate = formData?.get('file');

  if (!candidate || typeof candidate === 'string') {
    return NextResponse.json(
      { code: 'MISSING_FILE', message: '请选择 CSV 或 Excel 文件', requestId: crypto.randomUUID() },
      { status: 422 },
    );
  }
  if (candidate.size === 0 || candidate.size > maxFileSize) {
    return NextResponse.json(
      { code: 'FILE_TOO_LARGE', message: '文件需大于 0 且不超过 2MB', requestId: crypto.randomUUID() },
      { status: 422 },
    );
  }

  const extension = candidate.name.split('.').pop()?.toLowerCase();
  if (extension !== 'csv' && extension !== 'xlsx') {
    return NextResponse.json(
      { code: 'UNSUPPORTED_FILE', message: '仅支持 .csv 或 .xlsx 文件', requestId: crypto.randomUUID() },
      { status: 422 },
    );
  }

  try {
    const result = parseMembershipCardImport({
      fileName: candidate.name,
      fileType: extension,
      content: await candidate.arrayBuffer(),
    });
    const status = result.errors.length === 0 && result.rows.length > 0 ? 'IMPORTED' : 'REJECTED';
    if (status === 'IMPORTED') replaceMembershipCards(result.rows);

    return NextResponse.json(
      MembershipImportResultSchema.parse({
        status,
        fileName: candidate.name,
        fileType: extension,
        totalRows: result.totalRows,
        importedRows: status === 'IMPORTED' ? result.rows.length : 0,
        invalidRows: result.errors.length,
        errors: result.errors.slice(0, 20),
        dataSource: status === 'IMPORTED' ? 'imported' : 'mock',
        importedAt: new Date().toISOString(),
      }),
      {
        status: status === 'IMPORTED' ? 201 : 422,
        headers: { 'X-Data-Source': status === 'IMPORTED' ? 'imported' : 'mock' },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        code: 'IMPORT_PARSE_FAILED',
        message: error instanceof Error ? error.message : '文件解析失败，请使用下载的模板重试',
        requestId: crypto.randomUUID(),
      },
      { status: 422 },
    );
  }
}
