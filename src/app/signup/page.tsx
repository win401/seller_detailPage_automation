"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function getAuthErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit")) {
    return "인증 메일 발송 제한에 걸렸습니다. 잠시 후 다시 시도하거나 Supabase Auth 설정에서 이메일 확인을 비활성화해주세요.";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "이미 가입된 이메일입니다. 로그인 화면에서 로그인해주세요.";
  }
  if (lower.includes("password")) {
    return "비밀번호 조건을 확인해주세요. 6자 이상으로 입력하는 것을 권장합니다.";
  }
  return message;
}

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signUp(event: React.FormEvent) {
    event.preventDefault();

    if (password.length < 6) {
      toast("비밀번호가 너무 짧습니다", { description: "6자 이상으로 입력해주세요." });
      return;
    }

    if (password !== passwordConfirm) {
      toast("비밀번호가 일치하지 않습니다");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast("Supabase 환경변수가 없습니다", {
        description: "Vercel Environment Variables에 공개 URL과 Publishable Key를 추가해주세요.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim() || email.split("@")[0],
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      const message = getAuthErrorMessage(error.message);
      setStatusMessage(message);
      toast("회원가입에 실패했습니다", { description: message });
      return;
    }

    if (data.session) {
      toast("회원가입이 완료되었습니다", { description: "대시보드로 이동합니다." });
      router.push("/dashboard");
      return;
    }

    setStatusMessage(
      "회원가입 요청이 완료되었습니다. Supabase 이메일 확인 설정이 켜져 있으면 메일 확인 후 로그인할 수 있습니다."
    );
    toast("회원가입 요청이 완료되었습니다");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <form
        onSubmit={signUp}
        className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-9 shadow-[var(--shadow-elevated)]"
      >
        <div className="mb-7 flex items-center gap-2.5">
          <span className="size-[18px] rounded-[5px] bg-primary" />
          <span className="text-[15px] font-extrabold tracking-tight">셀러페이지 AI</span>
        </div>

        <h1 className="mb-1.5 text-xl font-bold tracking-tight">계정 만들기</h1>
        <p className="text-[13px] leading-6 text-muted-foreground">
          상품 상세페이지 프로젝트와 스타일 신호를 계정별로 저장합니다
        </p>

        <div className="mt-7 flex flex-col gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="display-name">이름 또는 상점명</Label>
            <Input
              id="display-name"
              placeholder="예: 데일리셀러"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="seller@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="6자 이상"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password-confirm">비밀번호 확인</Label>
            <Input
              id="password-confirm"
              type="password"
              placeholder="비밀번호를 한 번 더 입력"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-[12px] font-semibold leading-5 text-accent">
            {statusMessage}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 h-[42px] w-full text-sm font-bold"
        >
          {isSubmitting ? "계정 생성 중..." : "회원가입"}
        </Button>

        <Link
          href="/login"
          className="mt-3 block w-full rounded-md p-1 text-center text-[13px] font-semibold text-primary"
        >
          이미 계정이 있으신가요? 로그인
        </Link>
      </form>
    </main>
  );
}
