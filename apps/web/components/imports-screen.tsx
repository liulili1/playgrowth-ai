'use client';

import { importMembershipCards } from '@/lib/dashboard-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, FileSpreadsheet, RefreshCw, ShieldAlert, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

export function ImportsScreen() {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const importer = useMutation({
    mutationFn: importMembershipCards,
    onSuccess: async (result) => {
      if (result.status === 'IMPORTED') {
        await queryClient.invalidateQueries({ queryKey: ['membership-economics'] });
      }
    },
  });

  const selectFile = (nextFile: File | null) => {
    setFile(nextFile);
    importer.reset();
  };

  return (
    <section className="imports-layout">
      <article className="panel import-hero">
        <div className="import-hero-icon"><FileSpreadsheet size={28} /></div>
        <div>
          <p className="eyebrow">阶段 1 · 卡种经营数据</p>
          <h2>用一份卡明细，比较月卡和次卡的真实表现</h2>
          <p>这是本地演示闭环：导入后立即替换当前 Mock 卡数据，并在会员经营页按 90 天窗口计算收入、续卡和使用情况。</p>
        </div>
      </article>

      <article className="panel template-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">第 1 步</p><h3>下载并填写模板</h3></div>
          <span className="source-badge">仅 1 个工作表</span>
        </div>
        <p className="muted-copy">每行代表一张已激活的月卡或次卡。金额单位为“分”，288 元请填 28800；续卡请填写上一张卡号。</p>
        <div className="template-actions">
          <a className="outline-button" href="/templates/card-economics-import-template.xlsx" download>
            <Download size={16} /> 下载 Excel 模板
          </a>
          <a className="outline-button" href="/templates/card-economics-import-template.csv" download>
            <Download size={16} /> 下载 CSV 模板
          </a>
        </div>
        <ul className="field-check-list">
          <li><code>cardKind</code> 仅支持 <code>MONTHLY_CARD</code> 或 <code>TIMES_CARD</code></li>
          <li><code>renewedFromCardId</code> 为空表示首购卡</li>
          <li><code>visitDays</code> 与 <code>peakVisitDays</code> 用于观察使用强度</li>
        </ul>
      </article>

      <article className="panel import-form-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">第 2 步</p><h3>上传并导入</h3></div>
          <span className="source-badge">CSV / XLSX · ≤ 2MB</span>
        </div>
        <input
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          ref={inputRef}
          type="file"
        />
        <button className="file-dropzone" onClick={() => inputRef.current?.click()} type="button">
          <UploadCloud size={26} />
          <span>{file ? file.name : '点击选择 CSV 或 Excel 文件'}</span>
          <small>{file ? `${Math.ceil(file.size / 1024)} KB · 可重新选择` : '先下载模板，保留第一行字段名'}</small>
        </button>
        <button
          className="primary-button"
          disabled={!file || importer.isPending}
          onClick={() => file && importer.mutate(file)}
          type="button"
        >
          {importer.isPending ? <RefreshCw className="spin" size={17} /> : <FileSpreadsheet size={17} />}
          导入并生成分析
        </button>
        {importer.isError && <p className="form-error">{importer.error instanceof Error ? importer.error.message : '导入失败，请重试'}</p>}
      </article>

      {importer.data && (
        <article className="panel import-result-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">导入结果</p>
              <h3>{importer.data.status === 'IMPORTED' ? '数据已导入到本次演示' : '请修正模板后重新导入'}</h3>
            </div>
            {importer.data.status === 'IMPORTED' ? <CheckCircle2 className="success-icon" /> : <ShieldAlert className="attention-icon" />}
          </div>
          <div className="import-stats">
            <div><span>数据行</span><strong>{importer.data.totalRows}</strong></div>
            <div><span>已导入</span><strong className="success-text">{importer.data.importedRows}</strong></div>
            <div><span>错误</span><strong className="danger-text">{importer.data.invalidRows}</strong></div>
          </div>
          {importer.data.status === 'IMPORTED' ? (
            <div className="import-success-callout">
              <p>卡明细已保存到 D1，并替换当前演示数据；重新打开或重启 Worker 后仍会保留。</p>
              <Link className="primary-button" href="/membership/economics">查看月卡 vs 次卡分析</Link>
            </div>
          ) : (
            <ul className="import-errors">
              {importer.data.errors.map((error) => <li key={`${error.row}-${error.message}`}>第 {error.row} 行：{error.message}</li>)}
            </ul>
          )}
        </article>
      )}
    </section>
  );
}
