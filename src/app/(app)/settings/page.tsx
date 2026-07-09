"use client";

import { useEffect, useState } from "react";
import { Mail, ShieldCheck, UserRound } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    async function loadUser() {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (cancelled) return;
      setEmail(user?.email ?? null);
      setDisplayName(
        typeof user?.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : null
      );
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[960px] flex-1 px-6 py-8 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">설정</h1>
        <p className="text-[13.5px] text-muted-foreground">
          계정 상태와 프로젝트 환경을 확인합니다
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4.5">
          <div className="mb-4 flex items-center gap-2 text-[13px] font-bold">
            <UserRound className="size-4 text-primary" />
            계정 정보
          </div>
          <div className="grid gap-3 text-[13px]">
            <div className="flex items-center justify-between gap-4 rounded-lg bg-card-soft px-3 py-2.5">
              <span className="text-muted-foreground">이름/상점명</span>
              <span className="truncate font-semibold">{displayName ?? "미설정"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-card-soft px-3 py-2.5">
              <span className="text-muted-foreground">이메일</span>
              <span className="truncate font-semibold">{email ?? "데모 사용자"}</span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4.5">
          <div className="mb-4 flex items-center gap-2 text-[13px] font-bold">
            <ShieldCheck className="size-4 text-primary" />
            인증 상태
          </div>
          <div className="rounded-lg bg-card-soft px-3 py-3 text-[12.5px] leading-6 text-muted-foreground">
            Supabase Auth 세션을 기준으로 프로젝트와 스타일 신호가 사용자별로 저장됩니다.
            테스트 계정은 Supabase Dashboard에서 직접 생성한 뒤 로그인 검증을 진행합니다.
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4.5 md:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-[13px] font-bold">
            <Mail className="size-4 text-primary" />
            이메일 발송 설정
          </div>
          <div className="grid gap-2 text-[12.5px] leading-6 text-muted-foreground">
            <p>
              현재 MVP 테스트는 Supabase Dashboard에서 직접 만든 테스트 계정으로 진행합니다.
            </p>
            <p>
              정식 회원가입 메일 발송은 추후 Resend SMTP 연결 후 다시 활성화합니다.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
