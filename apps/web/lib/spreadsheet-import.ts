import { inflateRawSync } from 'node:zlib';
import { MembershipCardRecordSchema, type MembershipCardRecord } from '@playgrowth/contracts';

const requiredHeaders = [
  'cardId',
  'childId',
  'cardKind',
  'activatedAt',
  'expiresAt',
  'amountCents',
  'renewedFromCardId',
  'visitDays',
  'peakVisitDays',
  'activityAttendanceCount',
  'sourceCampaign',
] as const;

type RawCell = string | number | boolean | null;
export type CardImportError = { row: number; message: string };

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function textFromXml(xml: string) {
  const chunks = [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((match) => decodeXml(match[1]));
  return chunks.length > 0 ? chunks.join('') : decodeXml(xml.replace(/<[^>]+>/g, ''));
}

function columnIndex(cellRef: string) {
  const letters = cellRef.match(/[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return 0;
  return [...letters].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function unzipXlsxEntry(file: Buffer, offset: number) {
  if (file.readUInt32LE(offset) !== 0x04034b50) throw new Error('Excel 文件的本地条目无效');
  const compression = file.readUInt16LE(offset + 8);
  const compressedSize = file.readUInt32LE(offset + 18);
  const nameLength = file.readUInt16LE(offset + 26);
  const extraLength = file.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const data = file.subarray(dataStart, dataStart + compressedSize);

  if (compression === 0) return data;
  if (compression === 8) return inflateRawSync(data);
  throw new Error('仅支持常见的 Excel 压缩格式');
}

function readZipEntries(arrayBuffer: ArrayBuffer) {
  const file = Buffer.from(arrayBuffer);
  const minimumEnd = 22;
  const scanStart = Math.max(0, file.length - 65_557);
  let endOffset = -1;

  for (let offset = file.length - minimumEnd; offset >= scanStart; offset -= 1) {
    if (file.readUInt32LE(offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }

  if (endOffset < 0) throw new Error('无法识别 Excel 文件');
  const entryCount = file.readUInt16LE(endOffset + 10);
  const centralOffset = file.readUInt32LE(endOffset + 16);
  const entries = new Map<string, Buffer>();
  let cursor = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (file.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Excel 文件目录无效');
    const nameLength = file.readUInt16LE(cursor + 28);
    const extraLength = file.readUInt16LE(cursor + 30);
    const commentLength = file.readUInt16LE(cursor + 32);
    const localOffset = file.readUInt32LE(cursor + 42);
    const name = file.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    entries.set(name, unzipXlsxEntry(file, localOffset));
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function parseXlsxRows(arrayBuffer: ArrayBuffer): RawCell[][] {
  const entries = readZipEntries(arrayBuffer);
  const sharedStringsXml = entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
  const sharedStrings = [...sharedStringsXml.matchAll(/<(?:\w+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((match) =>
    textFromXml(match[1]),
  );
  const sheetPath = [...entries.keys()].filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/.test(entry)).sort()[0];
  if (!sheetPath) throw new Error('Excel 文件中未找到工作表');
  const sheetXml = entries.get(sheetPath)?.toString('utf8') ?? '';
  const rows: RawCell[][] = [];

  for (const rowMatch of sheetXml.matchAll(/<(?:\w+:)?row(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
    const row: RawCell[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<(?:\w+:)?c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attributes = cellMatch[1];
      const content = cellMatch[2] ?? '';
      const ref = attributes.match(/\br="([^"]+)"/)?.[1] ?? 'A1';
      const type = attributes.match(/\bt="([^"]+)"/)?.[1];
      const value = content.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1] ?? '';
      const inline = content.match(/<(?:\w+:)?is>([\s\S]*?)<\/(?:\w+:)?is>/)?.[1];
      const index = columnIndex(ref);
      let parsed: RawCell = value;

      if (type === 's') parsed = sharedStrings[Number(value)] ?? '';
      else if (type === 'inlineStr') parsed = inline ? textFromXml(inline) : '';
      else if (type === 'b') parsed = value === '1';
      else if (type !== 'str' && value !== '' && Number.isFinite(Number(value))) parsed = Number(value);

      row[index] = parsed;
    }
    rows.push(row);
  }

  return rows;
}

function parseCsvRows(text: string): RawCell[][] {
  const rows: RawCell[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function dateValue(value: RawCell) {
  if (typeof value === 'number') {
    const timestamp = Date.UTC(1899, 11, 30) + value * 86_400_000;
    return new Date(timestamp).toISOString().slice(0, 10);
  }
  return String(value ?? '').trim();
}

function numberValue(value: RawCell) {
  if (typeof value === 'number') return value;
  const normalized = String(value ?? '').trim();
  return normalized === '' ? Number.NaN : Number(normalized);
}

function stringOrNull(value: RawCell) {
  const normalized = String(value ?? '').trim();
  return normalized === '' ? null : normalized;
}

export function parseMembershipCardImport(input: {
  fileName: string;
  fileType: 'csv' | 'xlsx';
  content: ArrayBuffer;
}): { rows: MembershipCardRecord[]; errors: CardImportError[]; totalRows: number } {
  const rawRows = input.fileType === 'csv'
    ? parseCsvRows(new TextDecoder('utf-8').decode(input.content))
    : parseXlsxRows(input.content);
  const [headerRow, ...unboundedDataRows] = rawRows;
  const dataRows: RawCell[][] = [];
  for (const rawRow of unboundedDataRows) {
    const isBlank = rawRow.every((value) => value === undefined || value === null || String(value).trim() === '');
    if (isBlank && dataRows.length > 0) break;
    if (!isBlank) dataRows.push(rawRow);
  }
  const headers = (headerRow ?? []).map((value) => String(value ?? '').trim().replace(/^\uFEFF/, ''));
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      totalRows: Math.max(dataRows.length, 0),
      errors: [{ row: 1, message: `缺少模板字段：${missingHeaders.join('、')}` }],
    };
  }

  const importedRows: MembershipCardRecord[] = [];
  const errors: CardImportError[] = [];
  const cardIds = new Set<string>();

  dataRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const record = {
      cardId: stringOrNull(rawRow[headers.indexOf('cardId')]) ?? '',
      childId: stringOrNull(rawRow[headers.indexOf('childId')]) ?? '',
      cardKind: stringOrNull(rawRow[headers.indexOf('cardKind')]) ?? '',
      activatedAt: dateValue(rawRow[headers.indexOf('activatedAt')]),
      expiresAt: dateValue(rawRow[headers.indexOf('expiresAt')]),
      amountCents: numberValue(rawRow[headers.indexOf('amountCents')]),
      renewedFromCardId: stringOrNull(rawRow[headers.indexOf('renewedFromCardId')]),
      visitDays: numberValue(rawRow[headers.indexOf('visitDays')]),
      peakVisitDays: numberValue(rawRow[headers.indexOf('peakVisitDays')]),
      activityAttendanceCount: numberValue(rawRow[headers.indexOf('activityAttendanceCount')]),
      sourceCampaign: stringOrNull(rawRow[headers.indexOf('sourceCampaign')]),
    };
    const parsed = MembershipCardRecordSchema.safeParse(record);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push({ row: rowNumber, message: issue ? `${issue.path.join('.') || '字段'}：${issue.message}` : '字段格式无效' });
      return;
    }
    if (cardIds.has(parsed.data.cardId)) {
      errors.push({ row: rowNumber, message: 'cardId 不能重复' });
      return;
    }

    cardIds.add(parsed.data.cardId);
    importedRows.push(parsed.data);
  });

  const byCardId = new Map(importedRows.map((row) => [row.cardId, row]));
  for (const row of importedRows) {
    if (!row.renewedFromCardId) continue;
    const previous = byCardId.get(row.renewedFromCardId);
    if (!previous) errors.push({ row: dataRows.findIndex((item) => String(item[headers.indexOf('cardId')] ?? '') === row.cardId) + 2, message: '上一张卡不存在' });
    else if (previous.childId !== row.childId) errors.push({ row: dataRows.findIndex((item) => String(item[headers.indexOf('cardId')] ?? '') === row.cardId) + 2, message: '续卡必须属于同一儿童' });
    else if (row.cardId === row.renewedFromCardId) errors.push({ row: dataRows.findIndex((item) => String(item[headers.indexOf('cardId')] ?? '') === row.cardId) + 2, message: '续卡不能关联自身' });
  }

  return { rows: errors.length > 0 ? [] : importedRows, errors, totalRows: dataRows.length };
}
