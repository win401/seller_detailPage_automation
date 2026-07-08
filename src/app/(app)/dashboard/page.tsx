"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mockProjectSummaries } from "@/lib/mock-data";
import { PLATFORM_LABELS } from "@/lib/types";

export default function DashboardPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return mockProjectSummaries;
    return mockProjectSummaries.filter(
      (p) => p.name.includes(q) || p.category.includes(q)
    );
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-8 pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">프로젝트</h1>
          <p className="text-[13.5px] text-muted-foreground">
            진행 중인 상세페이지 프로젝트를 관리하세요
          </p>
        </div>
        <Button
          render={<Link href="/projects/new" />}
          className="h-[38px] gap-1.5 px-4 text-[13.5px] font-bold"
        >
          <Plus className="size-4" />
          새 상세페이지 만들기
        </Button>
      </div>

      <div className="mb-5 flex gap-3">
        <div className="flex h-[38px] max-w-[360px] flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground">
          <Search className="size-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="상품명, 카테고리로 검색"
            className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Link
          href="/styles"
          className="flex h-[38px] items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-[13px] font-semibold"
        >
          스타일 세트 관리
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex border-b border-border bg-card-soft px-4.5 py-2.5 text-xs font-bold text-muted-foreground">
          <span className="flex-[2.4]">상품명</span>
          <span className="flex-[1.2]">카테고리</span>
          <span className="flex-1">플랫폼</span>
          <span className="flex-1">수정일</span>
          <span className="flex-[0.8]" />
        </div>
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex items-center border-b border-border px-4.5 py-3.5 text-[13.5px] last:border-b-0"
          >
            <span className="flex-[2.4] font-semibold">{p.name}</span>
            <span className="flex-[1.2] text-muted-foreground">{p.category}</span>
            <span className="flex-1">
              <span className="inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-bold text-accent">
                {PLATFORM_LABELS[p.platform]}
              </span>
            </span>
            <span className="flex-1 text-muted-foreground">{p.updatedAtLabel}</span>
            <span className="flex-[0.8] text-right">
              <Link
                href={`/projects/${p.id}/editor`}
                className="rounded-md border border-border px-3 py-1 text-[12.5px] font-semibold"
              >
                열기
              </Link>
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-4.5 py-10 text-center text-sm text-muted-foreground">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
