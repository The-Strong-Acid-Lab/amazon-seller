import { ApiKeySettingsForm } from "@/components/api-key-settings-form";
import { ConsoleShell } from "@/components/console-shell";
import { requireUser } from "@/lib/auth";
import { getUserApiKeySettings } from "@/lib/user-api-keys";

export default async function DashboardSettingsPage() {
  const user = await requireUser();
  const apiKeySettings = await getUserApiKeySettings(user.id);

  return (
    <ConsoleShell
      description="管理你的登录账户和个人 API Key。服务端会优先使用你在这里保存的密钥。"
      title="Settings"
      userEmail={user.email ?? null}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(280px,0.7fr)]">
        <section className="rounded-[1.75rem] border border-[var(--page-border)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(54,40,24,0.05)]">
          <h2 className="text-xl font-semibold tracking-tight text-stone-950">
            个人 API Key
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--page-muted)]">
            保存后，项目分析和图片生成会优先读取你自己的 OpenAI / Gemini
            Key；没有保存时才回退到系统环境变量。
          </p>
          <div className="mt-6">
            <ApiKeySettingsForm initial={apiKeySettings} />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[var(--page-border)] bg-[var(--page-surface-strong)] p-6 shadow-[0_18px_50px_rgba(54,40,24,0.05)]">
          <h2 className="text-xl font-semibold tracking-tight text-stone-950">
            账户信息
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-stone-700">
            <div>
              <p className="font-medium text-stone-900">当前邮箱</p>
              <p className="mt-1">{user.email ?? "未知邮箱"}</p>
            </div>
            <div>
              <p className="font-medium text-stone-900">OpenAI Key</p>
              <p className="mt-1">
                {apiKeySettings.hasOpenAiKey
                  ? `sk-**********${apiKeySettings.openAiLast4}`
                  : "未保存"}
              </p>
            </div>
            <div>
              <p className="font-medium text-stone-900">Gemini Key</p>
              <p className="mt-1">
                {apiKeySettings.hasGeminiKey
                  ? `AIza**********${apiKeySettings.geminiLast4}`
                  : "未保存"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </ConsoleShell>
  );
}

