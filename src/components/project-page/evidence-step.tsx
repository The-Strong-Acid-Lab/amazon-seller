"use client";

import type { ReactNode } from "react";

import { CompetitorListModal } from "@/components/competitor-list-modal";
import { ProductListingEditorModal } from "@/components/product-listing-editor-modal";
import { ProjectSourceImport } from "@/components/project-source-import";

import type { ProjectWorkspaceShellProps } from "./types";

export function EvidenceStep(props: ProjectWorkspaceShellProps) {
  const {
    project,
    targetProduct,
    competitorProducts,
    importFiles,
    reviewCountByProduct,
    importCountByProduct,
    productNameById,
    availableAnalysisProviders,
  } = props;
  const providers =
    availableAnalysisProviders.length > 0
      ? availableAnalysisProviders
      : (["openai"] as Array<"openai" | "gemini">);

  const totalReviews = Object.values(reviewCountByProduct).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="grid gap-0 overflow-hidden rounded-xl border border-[var(--page-border)] bg-white">
      {/* ── Section: 目标产品 ── */}
      <EvidenceSection
        label="目标产品"
        meta={
          targetProduct
            ? `${reviewCountByProduct[targetProduct.id] ?? 0} 条评论`
            : undefined
        }
        action={
          targetProduct ? (
            <ProductListingEditorModal
              product={targetProduct}
              projectId={project.id}
              triggerLabel="编辑 Listing"
            />
          ) : undefined
        }
      >
        {targetProduct ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold text-stone-900">
                {targetProduct.name ?? project.product_name ?? "未命名我的商品"}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-stone-400">
                {targetProduct.asin && <span>ASIN {targetProduct.asin}</span>}
                {targetProduct.market && <span>{targetProduct.market}</span>}
                {targetProduct.product_url && (
                  <a
                    href={targetProduct.product_url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate max-w-xs hover:text-stone-600 transition-colors"
                  >
                    {targetProduct.product_url}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="font-mono text-xl font-semibold text-stone-900">
                  {(
                    reviewCountByProduct[targetProduct.id] ?? 0
                  ).toLocaleString()}
                </p>
                <p className="font-mono text-[10px] text-stone-400">条评论</p>
              </div>
              <div>
                <p className="font-mono text-xl font-semibold text-stone-900">
                  {importCountByProduct[targetProduct.id] ?? 0}
                </p>
                <p className="font-mono text-[10px] text-stone-400">份文件</p>
              </div>
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${
                    targetProduct.is_launched
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${targetProduct.is_launched ? "bg-emerald-500" : "bg-stone-400"}`}
                  />
                  {targetProduct.is_launched ? "已上线" : "未上线"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-400">还没有目标产品，请先创建。</p>
        )}
      </EvidenceSection>

      {/* ── Section: 竞品 ── */}
      <EvidenceSection
        label="竞品"
        meta={`${competitorProducts.length} / 10`}
        action={
          <CompetitorListModal
            availableProviders={providers}
            competitors={competitorProducts}
            importCountByProduct={importCountByProduct}
            projectId={project.id}
            reviews={
              props.reviews.filter((r) =>
                competitorProducts.some((p) => p.id === r.project_product_id),
              ) as Parameters<typeof CompetitorListModal>[0]["reviews"]
            }
          />
        }
      >
        {competitorProducts.length === 0 ? (
          <p className="text-sm text-stone-400">
            还没有竞品，点击右侧「管理竞品」添加。
          </p>
        ) : (
          <div className="divide-y divide-[var(--page-border)]">
            {competitorProducts.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-stone-900">
                    {comp.name ?? "未命名竞品"}
                  </span>
                  {comp.asin && (
                    <span className="ml-2 font-mono text-xs text-stone-400">
                      {comp.asin}
                    </span>
                  )}
                  {comp.market && (
                    <span className="ml-2 font-mono text-xs text-stone-400">
                      {comp.market}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-right font-mono text-xs text-stone-400">
                  <span>
                    {(reviewCountByProduct[comp.id] ?? 0).toLocaleString()} 评论
                  </span>
                  <span
                    className={`${
                      comp.current_title?.trim() || comp.current_bullets?.trim()
                        ? "text-emerald-600"
                        : "text-stone-300"
                    }`}
                  >
                    {comp.current_title?.trim() || comp.current_bullets?.trim()
                      ? "Listing ✓"
                      : "Listing —"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </EvidenceSection>

      {/* ── Section: 评论文件 ── */}
      <EvidenceSection
        label="评论文件"
        meta={`共 ${totalReviews.toLocaleString()} 条`}
        action={
          targetProduct ? (
            <ProjectSourceImport
              projectId={project.id}
              targetMarket={
                targetProduct.market ?? project.target_market ?? "US"
              }
              targetProductId={targetProduct.id}
            />
          ) : undefined
        }
        noPadContent
      >
        {importFiles.length === 0 ? (
          <p className="px-5 py-3 text-sm text-stone-400">还没有评论文件。</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--page-border)] bg-stone-50 font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400">
                <th className="px-5 py-2 text-left font-medium">文件名</th>
                <th className="px-3 py-2 text-left font-medium">关联产品</th>
                <th className="px-3 py-2 text-right font-medium">行数</th>
                <th className="px-3 py-2 text-left font-medium">工作表</th>
                <th className="px-5 py-2 text-right font-medium">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--page-border)]">
              {importFiles.map((file) => (
                <tr
                  key={file.id}
                  className="hover:bg-stone-50/60 transition-colors"
                >
                  <td className="px-5 py-3">
                    <span className="font-medium text-stone-900 truncate block max-w-xs">
                      {file.file_name}
                    </span>
                    {file.error_message && (
                      <span className="mt-0.5 block text-xs text-red-500">
                        {file.error_message}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-stone-500">
                    {file.project_product_id ? (
                      (productNameById[file.project_product_id] ?? "未知")
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-stone-500">
                    {file.row_count.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-stone-400">
                    {file.sheet_name ?? (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${
                        file.import_status === "normalized"
                          ? "bg-emerald-50 text-emerald-700"
                          : file.import_status === "failed"
                            ? "bg-red-50 text-red-600"
                            : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {file.import_status === "normalized"
                        ? "✓ 已入库"
                        : file.import_status === "failed"
                          ? "失败"
                          : file.import_status === "parsed"
                            ? "已解析"
                            : "已上传"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </EvidenceSection>
    </div>
  );
}

function EvidenceSection({
  label,
  meta,
  action,
  children,
  noPadContent,
}: {
  label: string;
  meta?: string;
  action?: ReactNode;
  children: ReactNode;
  noPadContent?: boolean;
}) {
  return (
    <div className="border-b border-[var(--page-border)] last:border-0">
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[var(--page-border)] bg-stone-50/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            {label}
          </span>
          {meta && (
            <span className="font-mono text-[10px] text-stone-400">{meta}</span>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className={noPadContent ? "" : "px-5 py-4"}>{children}</div>
    </div>
  );
}
