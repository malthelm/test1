import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Life OS MVP</h1>
        <p className="mt-2 text-neutral-600">
          Phase 0 foundation + Phase 0.5 transcript vertical slice in progress.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start here</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Link href="/transcripts/new">
              <Button>New Transcript</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
