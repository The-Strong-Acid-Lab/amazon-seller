import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function LoginPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/console");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(214,183,142,0.2),transparent_40%),linear-gradient(180deg,#f8f5ee_0%,#f4efe6_100%)] px-4 py-8 text-stone-950 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
        <section className="grid w-full gap-6 rounded-[2rem] border border-white/70 bg-white/85 px-8 py-10 shadow-[0_30px_80px_rgba(49,33,15,0.08)] backdrop-blur">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
              邮箱验证码登录
            </h1>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              输入邮箱后，系统会发送 6
              位验证码到你的邮箱。输入验证码后即可登录并管理自己的项目和 API
              Key。
            </p>
          </div>
          <AuthForm />
        </section>
      </div>
    </main>
  );
}
