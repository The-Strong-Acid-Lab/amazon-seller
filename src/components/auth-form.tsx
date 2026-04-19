"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { buildConsoleUrlInBrowser } from "@/lib/host-routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { isConsoleSubdomainEnabled } from "@/lib/runtime-flags";

export function AuthForm() {
  const router = useRouter();
  const useSubdomain = isConsoleSubdomainEnabled();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setShowOtp(true);
      setMessage("验证码已发送到邮箱。");
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error ? caughtError.message : "发送验证码失败。";
      setError(nextError);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });

      if (verifyError) {
        throw verifyError;
      }

      if (useSubdomain) {
        const session = data.session;

        if (!session) {
          throw new Error("登录成功但未返回会话。");
        }

        const hash = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }).toString();

        window.location.assign(buildConsoleUrlInBrowser(`/auth/bridge#${hash}`));
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error ? caughtError.message : "验证码校验失败。";
      setError(nextError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-stone-900" htmlFor="email">
            邮箱
          </label>
          <Input
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </div>
        <Button disabled={submitting || !email} type="submit">
          {submitting && !showOtp ? "发送中..." : "发送验证码"}
        </Button>
      </form>

      {showOtp ? (
        <form className="grid gap-4" onSubmit={handleVerifyOtp}>
          <div className="grid gap-2">
            <p className="text-sm font-medium text-stone-900">输入验证码</p>
            <InputOTP
              maxLength={6}
              onChange={setOtpCode}
              value={otpCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button disabled={submitting || otpCode.length !== 6} type="submit">
            {submitting ? "验证中..." : "验证并登录"}
          </Button>
        </form>
      ) : null}

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
