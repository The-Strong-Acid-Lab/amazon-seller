"use client";

import { useState } from "react";

import type { ImportPreview } from "@/lib/review-import";

const ACCEPTED_FILE_TYPES = ".xlsx,.csv";

export function ImportWorkbench() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("先选择一个 Excel 或 CSV 文件。");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportPreview & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "文件解析失败。");
      }

      setResult(payload);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "文件解析失败。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              Import Workbench
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900">
              上传卖家现有评论文件
            </h2>
          </div>
          <span className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-stone-600">
            V1 / Preview
          </span>
        </div>

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-3 rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-5">
            <span className="text-sm font-medium text-stone-800">
              支持 Excel `.xlsx` 和 `.csv`
            </span>
            <span className="text-sm leading-6 text-stone-600">
              第一版先确保我们能稳定读懂第三方评论导出文件，再进入数据库入库和分析。
            </span>
            <input
              accept={ACCEPTED_FILE_TYPES}
              className="block text-sm text-stone-700 file:mr-4 file:rounded-full file:border-0 file:bg-stone-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-stone-50 hover:file:bg-stone-700"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "正在解析..." : "解析并生成预览"}
            </button>
            {file ? (
              <p className="text-sm text-stone-600">
                当前文件: <span className="font-medium text-stone-900">{file.name}</span>
              </p>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </form>
      </section>

      <section className="rounded-[2rem] border border-stone-300 bg-[#1f1f1c] p-6 text-stone-100 shadow-[0_20px_70px_rgba(15,23,42,0.16)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
          What This Checks
        </p>
        <ul className="mt-5 grid gap-4 text-sm leading-6 text-stone-300">
          <li>按真实 Excel 列坐标读取，避免空单元格导致字段错位。</li>
          <li>自动忽略 `Note` 这类非数据 sheet。</li>
          <li>把评论文件标准化成后续可入库的 review 结构。</li>
          <li>先给出字段、统计和样例预览，再进入数据库和分析阶段。</li>
        </ul>
      </section>

      {result ? (
        <section className="rounded-[2rem] border border-stone-300 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                Import Preview
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900">
                {result.fileName}
              </h3>
              <p className="mt-2 text-sm text-stone-600">
                当前解析 sheet:{" "}
                <span className="font-medium text-stone-900">
                  {result.selectedSheet}
                </span>
              </p>
            </div>
            <div className="grid gap-2 text-right text-sm text-stone-600">
              <span>
                文件类型: <span className="font-medium text-stone-900">{result.fileType}</span>
              </span>
              <span>
                评论行数: <span className="font-medium text-stone-900">{result.totalRows}</span>
              </span>
              <span>
                Sheet 数量:{" "}
                <span className="font-medium text-stone-900">
                  {result.sheetNames.length}
                </span>
              </span>
            </div>
          </div>

          {result.warnings.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {result.warnings.join(" ")}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Unique ASINs" value={String(result.stats.uniqueAsins)} />
            <StatCard label="Image Reviews" value={String(result.stats.reviewsWithImages)} />
            <StatCard label="Video Reviews" value={String(result.stats.reviewsWithVideos)} />
            <StatCard label="Date From" value={result.stats.dateRange.from ?? "-"} />
            <StatCard label="Date To" value={result.stats.dateRange.to ?? "-"} />
            <StatCard
              label="Countries"
              value={String(Object.keys(result.stats.countryDistribution).length)}
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <InfoCard
              title="Detected Header"
              items={result.header}
              emptyLabel="没有检测到表头"
            />
            <InfoCard
              title="Rating Distribution"
              items={Object.entries(result.stats.ratingDistribution).map(
                ([rating, count]) => `${rating} 星: ${count}`,
              )}
              emptyLabel="没有检测到评分"
            />
          </div>

          <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-stone-200">
            <div className="border-b border-stone-200 bg-stone-100 px-4 py-3">
              <h4 className="text-sm font-semibold text-stone-900">Normalized Sample</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-sm">
                <thead className="bg-stone-50 text-left text-stone-600">
                  <tr>
                    {[
                      "ASIN",
                      "标题",
                      "星级",
                      "型号",
                      "国家",
                      "时间",
                      "有图",
                      "有视频",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3 font-medium">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white text-stone-800">
                  {result.sampleRows.map((row, index) => (
                    <tr key={`${row.asin}-${row.reviewTitle}-${index}`}>
                      <td className="px-4 py-3">{row.asin || "-"}</td>
                      <td className="max-w-[26rem] px-4 py-3">{row.reviewTitle || "-"}</td>
                      <td className="px-4 py-3">{row.rating ?? "-"}</td>
                      <td className="px-4 py-3">{row.model || "-"}</td>
                      <td className="px-4 py-3">{row.country || "-"}</td>
                      <td className="px-4 py-3">{row.reviewDate || "-"}</td>
                      <td className="px-4 py-3">{row.imageCount > 0 ? "是" : "否"}</td>
                      <td className="px-4 py-3">{row.hasVideo ? "是" : "否"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
      <h4 className="text-sm font-semibold text-stone-900">{title}</h4>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700"
            >
              {item}
            </span>
          ))
        ) : (
          <p className="text-sm text-stone-500">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}
