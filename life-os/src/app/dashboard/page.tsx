import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Open Todos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">0</p>
          <p className="text-sm text-neutral-600">Phase 0.5 counter placeholder</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Transcripts Processed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">0</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Todo Started Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">—</p>
        </CardContent>
      </Card>
    </div>
  );
}
