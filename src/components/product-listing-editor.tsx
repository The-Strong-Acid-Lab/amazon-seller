"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ProductListingEditor({
  projectId,
  product,
}: {
  projectId: string;
  product: {
    id: string;
    role: "target" | "competitor";
    name: string | null;
    asin: string | null;
    product_url: string | null;
    market: string | null;
    current_title: string | null;
    current_bullets: string | null;
    current_description: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(product.name ?? "");
  const [asin, setAsin] = useState(product.asin ?? "");
  const [productUrl, setProductUrl] = useState(product.product_url ?? "");
  const [market, setMarket] = useState(product.market ?? "");
  const [currentTitle, setCurrentTitle] = useState(product.current_title ?? "");
  const [currentBullets, setCurrentBullets] = useState(product.current_bullets ?? "");
  const [currentDescription, setCurrentDescription] = useState(product.current_description ?? "");
  const [notes, setNotes] = useState(product.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/products/${product.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            asin,
            productUrl,
            market,
            currentTitle,
            currentBullets,
            currentDescription,
            notes,
          }),
        },
      );

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "保存 listing 失败。");
      }

      setSuccess("Listing 信息已保存。");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存 listing 失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="rounded-[2rem]">
      <CardHeader>
        <CardTitle>
          {product.role === "target" ? "目标商品 Listing 输入" : "竞品 Listing 输入"}
        </CardTitle>
        <CardDescription>
          先手动粘贴标题、bullet 和描述。后续分析会把评论和 listing 一起看。
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock label="商品名称">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </FieldBlock>
          <FieldBlock label="市场">
            <Input value={market} onChange={(event) => setMarket(event.target.value)} />
          </FieldBlock>
          <FieldBlock label="ASIN">
            <Input value={asin} onChange={(event) => setAsin(event.target.value)} />
          </FieldBlock>
          <FieldBlock label="URL">
            <Input value={productUrl} onChange={(event) => setProductUrl(event.target.value)} />
          </FieldBlock>
        </div>

        <FieldBlock label="当前标题">
          <Textarea
            className="min-h-[88px]"
            value={currentTitle}
            onChange={(event) => setCurrentTitle(event.target.value)}
          />
        </FieldBlock>

        <FieldBlock label="当前 Bullets">
          <Textarea
            className="min-h-[140px]"
            placeholder="每条 bullet 一行，或者直接整段粘贴也可以。"
            value={currentBullets}
            onChange={(event) => setCurrentBullets(event.target.value)}
          />
        </FieldBlock>

        <FieldBlock label="当前描述">
          <Textarea
            className="min-h-[140px]"
            value={currentDescription}
            onChange={(event) => setCurrentDescription(event.target.value)}
          />
        </FieldBlock>

        <FieldBlock label="备注">
          <Textarea
            className="min-h-[88px]"
            placeholder="比如：这是 2026-03 的版本，主打办公室/冥想双场景。"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </FieldBlock>

        <div className="flex flex-wrap items-center gap-3">
          <Button className="rounded-full" disabled={isSaving} onClick={handleSave}>
            {isSaving ? "正在保存..." : "保存 Listing 信息"}
          </Button>
          {success ? <p className="text-sm text-stone-600">{success}</p> : null}
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>保存失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-stone-900">{label}</p>
      {children}
    </div>
  );
}
