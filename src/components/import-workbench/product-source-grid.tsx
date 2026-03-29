"use client";

import { useState } from "react";
import { type UseFormRegister } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACCEPTED_FILE_TYPES } from "@/components/import-workbench/constants";
import { FieldBlock } from "@/components/import-workbench/ui-blocks";
import type {
  CompetitorDraft,
  ImportFormValues,
} from "@/components/import-workbench/types";

export function ProductSourceGrid({
  competitorPool,
  register,
  sourceFiles,
  onSourceFileChange,
  addCompetitorCard,
  updateCompetitorCard,
  removeCompetitorCard,
}: {
  competitorPool: CompetitorDraft[];
  register: UseFormRegister<ImportFormValues>;
  sourceFiles: Record<string, File | null>;
  onSourceFileChange: (sourceId: string, nextFile: File | null) => void;
  addCompetitorCard: () => void;
  updateCompetitorCard: (
    id: string,
    updates: Partial<Omit<CompetitorDraft, "id">>,
  ) => void;
  removeCompetitorCard: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ProductSourceCard
        file={sourceFiles.target ?? null}
        onFileChange={(nextFile) => onSourceFileChange("target", nextFile)}
        title="我的商品"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock label="ASIN（可空）">
            <Input
              placeholder="已上架再填"
              {...register("targetProductAsin")}
            />
          </FieldBlock>
          <FieldBlock label="市场（可空）">
            <Input placeholder="例如: US" {...register("targetMarket")} />
          </FieldBlock>
          <FieldBlock className="md:col-span-2" label="URL（可空）">
            <Input
              placeholder="https://www.amazon.com/..."
              {...register("targetProductUrl")}
            />
          </FieldBlock>
        </div>
      </ProductSourceCard>

      {competitorPool.map((competitor, index) => (
        <ProductSourceCard
          key={competitor.id}
          actions={
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => removeCompetitorCard(competitor.id)}
            >
              删除
            </Button>
          }
          file={sourceFiles[competitor.id] ?? null}
          onFileChange={(nextFile) =>
            onSourceFileChange(competitor.id, nextFile)
          }
          title={`竞品 ${index + 1}`}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock label="ASIN（可空）">
              <Input
                placeholder="如果文件本身有，也可以不填"
                value={competitor.asin}
                onChange={(event) =>
                  updateCompetitorCard(competitor.id, {
                    asin: event.target.value,
                  })
                }
              />
            </FieldBlock>
            <FieldBlock label="市场（建议填写）">
              <Input
                placeholder="例如: US"
                value={competitor.market}
                onChange={(event) =>
                  updateCompetitorCard(competitor.id, {
                    market: event.target.value,
                  })
                }
              />
            </FieldBlock>
            <FieldBlock className="md:col-span-2" label="URL（可空）">
              <Input
                placeholder="https://www.amazon.com/..."
                value={competitor.url}
                onChange={(event) =>
                  updateCompetitorCard(competitor.id, {
                    url: event.target.value,
                  })
                }
              />
            </FieldBlock>
          </div>
        </ProductSourceCard>
      ))}

      <button
        type="button"
        onClick={addCompetitorCard}
        className="grid min-h-[20rem] place-items-center rounded-2xl border border-dashed border-[var(--page-border)] bg-[rgba(255,249,240,0.65)] text-center transition hover:border-stone-400 hover:bg-[rgba(255,249,240,0.92)]"
      >
        <div className="grid gap-2 px-4 py-6">
          <p className="text-3xl font-light leading-none text-stone-500">+</p>
          <p className="text-sm font-semibold text-stone-900">新建竞品</p>
        </div>
      </button>
    </div>
  );
}

function ProductSourceCard({
  title,
  onFileChange,
  file,
  actions,
  children,
}: {
  title: string;
  onFileChange: (nextFile: File | null) => void;
  file: File | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [fileInputKey, setFileInputKey] = useState(0);

  return (
    <div className="grid gap-4 rounded-2xl border border-[var(--page-border)] bg-white/88 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        {actions}
      </div>

      {children}

      <div className="grid gap-3 rounded-xl border border-dashed border-[var(--page-border)] bg-[rgba(255,249,240,0.78)] p-4">
        <div className="grid gap-1">
          <p className="text-sm font-medium text-stone-900">
            上传当前来源商品评论文件
          </p>
          <p className="text-xs leading-6 text-[var(--page-muted)]">
            该文件会绑定到当前卡片商品。支持 Excel `.xlsx` 和 `.csv`。
          </p>
        </div>
        <Input
          key={fileInputKey}
          accept={ACCEPTED_FILE_TYPES}
          className="cursor-pointer border-[var(--page-border)] bg-white/90 file:mr-4 file:rounded-md file:bg-[rgba(154,100,55,0.08)] file:px-3 hover:file:bg-[rgba(154,100,55,0.14)]"
          type="file"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];
            if (!selectedFile) {
              return;
            }
            onFileChange(selectedFile);
          }}
        />
        {file ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--page-muted)]">
              已绑定文件:{" "}
              <span className="font-medium text-stone-900">{file.name}</span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-md border-rose-300 px-2 text-xs text-rose-700 hover:bg-rose-50"
              onClick={() => {
                onFileChange(null);
                setFileInputKey((previous) => previous + 1);
              }}
            >
              移除文件
            </Button>
          </div>
        ) : (
          <p className="text-xs text-[var(--page-muted)]">
            点击选择文件后会切换到此商品来源。
          </p>
        )}
      </div>
    </div>
  );
}
