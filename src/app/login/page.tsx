"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("seller@example.com");
  const [password, setPassword] = useState("password1234");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function goDashboard(event?: React.FormEvent) {
    event?.preventDefault();
    router.push("/dashboard");
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast("Supabase 환경변수가 없습니다", {
        description: "데모 계정으로 진입하거나 .env.local에 Supabase URL/anon key를 추가해주세요.",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (error) {
      toast("로그인에 실패했습니다", { description: error.message });
      return;
    }

    toast("로그인되었습니다");
    router.push("/dashboard");
  }

  async function signUp() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast("Supabase 환경변수가 없습니다", {
        description: "Supabase 프로젝트 생성 후 .env.local에 공개 URL과 anon key를 넣어주세요.",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: email.split("@")[0],
        },
      },
    });
    setIsSubmitting(false);

    if (error) {
      toast("회원가입에 실패했습니다", { description: error.message });
      return;
    }

    toast("회원가입 요청이 완료되었습니다", {
      description: "Supabase 이메일 확인 설정에 따라 바로 로그인되거나 확인 메일이 발송됩니다.",
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <form
        onSubmit={signIn}
        className="w-full max-w-[380px] rounded-2xl border border-border bg-card p-9 shadow-[var(--shadow-elevated)]"
      >
        <div className="mb-7 flex items-center gap-2.5">
          <span className="size-[18px] rounded-[5px] bg-primary" />
          <span className="text-[15px] font-extrabold tracking-tight">셀러페이지 AI</span>
        </div>

        <h1 className="mb-1.5 text-xl font-bold tracking-tight">다시 만나서 반가워요</h1>
        <p className="text-[13px] leading-6 text-muted-foreground">
          쿠팡·스마트스토어 셀러를 위한 상세페이지 제작 자동화 도구
        </p>

        <div className="mt-7 flex flex-col gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="seller@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 h-[42px] w-full text-sm font-bold"
        >
          {isSubmitting ? "처리 중..." : "로그인"}
        </Button>
        <button
          type="button"
          onClick={signUp}
          disabled={isSubmitting}
          className="mt-2.5 w-full rounded-md p-1 text-[13px] font-semibold text-primary"
        >
          계정이 없으신가요? 회원가입
        </button>

        <div className="my-5 flex items-center gap-2.5">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-foreground">또는</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={goDashboard}
          className="h-10 w-full bg-secondary text-[13px] font-semibold"
        >
          데모 계정으로 시작하기
        </Button>
      </form>
    </main>
  );
}
