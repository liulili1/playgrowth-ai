import {
  DashboardOverviewSchema,
  ImportBatchSchema,
  MembershipEconomicsSchema,
  MembershipImportResultSchema,
  type DashboardOverview,
  type ImportBatch,
  type MembershipEconomics,
  type MembershipImportResult,
  type MockImportRequest,
} from '@playgrowth/contracts';

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) throw new Error(`请求失败（${response.status}）`);
  return (await response.json()) as T;
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  return DashboardOverviewSchema.parse(await requestJson('/api/v1/dashboard/overview'));
}

export async function previewMockImport(input: MockImportRequest): Promise<ImportBatch> {
  return ImportBatchSchema.parse(
    await requestJson('/api/v1/imports', { method: 'POST', body: JSON.stringify(input) }),
  );
}

export async function importMembershipCards(file: File): Promise<MembershipImportResult> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/v1/membership/import', { method: 'POST', body });
  const payload = await response.json();
  const parsedResult = MembershipImportResultSchema.safeParse(payload);
  if (parsedResult.success) return parsedResult.data;
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload && 'message' in payload && typeof payload.message === 'string'
      ? payload.message
      : `请求失败（${response.status}）`;
    throw new Error(detail);
  }
  return MembershipImportResultSchema.parse(payload);
}

export async function fetchMembershipEconomics(windowDays: 30 | 60 | 90): Promise<MembershipEconomics> {
  return MembershipEconomicsSchema.parse(
    await requestJson(`/api/v1/membership/economics?windowDays=${windowDays}`),
  );
}
