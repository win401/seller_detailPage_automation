"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminRecentProject, AdminUsageStats } from "@/app/api/admin/usage-dashboard/route";

type AdminGateStatus = "checking" | "allowed" | "denied" | "signedOut";

const STAT_CARDS: { key: keyof AdminUsageStats; label: string }[] = [
  { key: "totalUsers", label: "총 사용자 수" },
  { key: "totalProjects", label: "총 프로젝트 수" },
  { key: "totalGenerations", label: "AI 생성 횟수" },
  { key: "totalZipDownloads", label: "ZIP 다운로드 횟수" },
];

/**
 * 관리자 회원/사용량 대시보드 (docs/TASKS.md "보류/리서치 후보" -> 승격).
 * 집계는 전부 SECURITY DEFINER RPC(admin_usage_stats/admin_recent_projects)를
 * 통하므로 profiles/detail_page_projects/agent_runs/usage_events 자체의
 * RLS는 owner-only 그대로다. ZIP 다운로드 횟수는 이 기능이 배포된 시점부터
 * 기록된 usage_events만 집계 — 과거 다운로드는 소급 반영되지 않는다.
 */
export default function AdminUsageDashboardPage() {
  const [gate, setGate] = useState<AdminGateStatus>("checking");
  const [stats, setStats] = useState<AdminUsageStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<AdminRecentProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const supabase = client;
    let cancelled = false;

    async function loadDashboard(accessToken: string) {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/usage-dashboard", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const body = (await response.json()) as
          | { stats: AdminUsageStats; recentProjects: AdminRecentProject[] }
          | { error: string };
        if (cancelled) return;
        if (!response.ok || "error" in body) {
          setError("error" in body ? body.error : "대시보드를 불러오지 못했습니다.");
          return;
        }
        setStats(body.stats);
        setRecentProjects(body.recentProjects);
      } catch {
        if (!cancelled) setError("네트워크 오류로 대시보드를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setGate("signedOut");
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (cancelled) return;
      if (profile?.role !== "admin") {
        setGate("denied");
        return;
      }
      setGate("allowed");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) void loadDashboard(session.access_token);
    }

    void checkAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  if (gate === "checking") {
    return <div className="mx-auto w-full max-w-[900px] flex-1 px-6 py-8 text-[13px] text-muted-foreground">확인 중...</div>;
  }
  if (gate === "signedOut" || gate === "denied") {
    return (
      <div className="mx-auto w-full max-w-[900px] flex-1 px-6 py-8">
        <p className="text-[13.5px] text-muted-foreground">
          {gate === "signedOut" ? "로그인이 필요합니다." : "관리자만 접근할 수 있는 화면입니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[900px] flex-1 px-6 py-8 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">회원/사용량 대시보드 (관리자)</h1>
        <p className="text-[13.5px] text-muted-foreground">
          전체 사용자·프로젝트·AI 생성·ZIP 다운로드 현황입니다. ZIP 다운로드 횟수는 이 화면이
          배포된 시점 이후의 다운로드만 집계됩니다.
        </p>
      </div>

      {error && <p className="mb-4 text-[12.5px] text-destructive">{error}</p>}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="rounded-xl border border-border bg-card p-4.5">
            <p className="text-[12px] font-semibold text-muted-foreground">{card.label}</p>
            <p className="mt-1.5 text-2xl font-extrabold tracking-tight">
              {isLoading || !stats ? "-" : stats[card.key].toLocaleString("ko-KR")}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-[15px] font-bold">최근 프로젝트</h2>
        {!isLoading && recentProjects.length === 0 && (
          <p className="text-[12.5px] text-muted-foreground">아직 생성된 프로젝트가 없습니다.</p>
        )}
        {recentProjects.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">제목</th>
                  <th className="px-4 py-2.5 font-semibold">카테고리</th>
                  <th className="px-4 py-2.5 font-semibold">플랫폼</th>
                  <th className="px-4 py-2.5 font-semibold">작성자</th>
                  <th className="px-4 py-2.5 font-semibold">생성일</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((project) => (
                  <tr key={project.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-semibold">{project.title}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{project.category}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{project.selectedPlatform}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{project.ownerEmail ?? "-"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(project.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
