import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImportWorkbench } from "@/components/import-workbench";

const checklist = [
  "先读懂卖家已有评论文件，而不是先做爬虫。",
  "导入时保留原始字段和证据链，后续分析才可信。",
  "把 Excel / CSV 解析稳定后，再接数据库和 VOC 分析。",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-950 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-10 pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] tracking-[0.24em] text-stone-600">
              AMAZON SELLER RESEARCH CONSOLE
            </Badge>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
              先把评论导入链路做扎实，再谈 VOC 分析和转化策略。
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
              当前这一版只解决第一件关键小事: 让系统稳定读取卖家手里的
              Excel / CSV 评论文件，并给出标准化预览。只要这一步稳了，后面的数据库、
              洞察和策略页都会顺很多。
            </p>
          </div>

          <Card className="rounded-[2rem] border-stone-800 bg-stone-950 text-stone-100 shadow-[0_20px_70px_rgba(15,23,42,0.18)]">
            <CardContent className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Current Focus
            </p>
            <ul className="mt-5 grid gap-4 text-sm leading-6 text-stone-300">
              {checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            </CardContent>
          </Card>
        </section>

        <ImportWorkbench />
      </div>
    </main>
  );
}
