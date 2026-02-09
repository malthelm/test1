"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workspaceFetch } from "@/components/workspace-fetch";

type Summary = {
  openTodos: number;
  transcriptsProcessed: number;
  dueThisWeek: number;
  createdLast7d: number;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    void workspaceFetch("/api/operational/summary")
      .then((res) => res.json() as Promise<Summary>)
      .then(setSummary);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Open Todos" value={summary?.openTodos} />
        <StatCard title="Transcripts Processed" value={summary?.transcriptsProcessed} />
        <StatCard title="Due This Week" value={summary?.dueThisWeek} />
        <StatCard title="Created Last 7d" value={summary?.createdLast7d} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operational Surfaces</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link href="/todos" className="rounded border px-3 py-1.5 hover:bg-neutral-100">
            Todos
          </Link>
          <Link href="/timeline" className="rounded border px-3 py-1.5 hover:bg-neutral-100">
            Timeline
          </Link>
          <Link href="/weekly-plan" className="rounded border px-3 py-1.5 hover:bg-neutral-100">
            Weekly Plan
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{typeof value === "number" ? value : "—"}</p>
      </CardContent>
    </Card>
  );
}
