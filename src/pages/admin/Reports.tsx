import { BarChart3, BellRing, LineChart, PieChart } from "lucide-react";
import { Badge, Card } from "../../components/ui/core";
import { PageHeader } from "../../components/shared";

const PLANNED_REPORTS = [
  { icon: <PieChart className="h-4.5 w-4.5" />, title: "Pipeline conversion", body: "Stage-to-stage conversion and drop-off per position and department." },
  { icon: <LineChart className="h-4.5 w-4.5" />, title: "Time-to-hire", body: "Days from application to offer, split by position and recruiter." },
  { icon: <BarChart3 className="h-4.5 w-4.5" />, title: "Interview completion", body: "Completed vs abandoned interviews, average answer duration, retake usage." },
  { icon: <BellRing className="h-4.5 w-4.5" />, title: "Reviewer activity", body: "Evaluations per reviewer, score distribution and category trends." },
];

export default function Reports() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analytics land in V1.3 — after recordings and evaluations generate real data worth measuring."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Reports" }]}
        actions={<Badge tone="warning" dot>V1.3 — planned</Badge>}
      />

      <Card className="p-6 animate-fade-up">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-primary-300">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">Nothing to chart yet — deliberately</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-500">
              V1.1 builds the relational foundation (candidates, applications, interviews, evaluations, audit logs)
              that makes reporting honest. Shipping dashboards before the recording pipeline would mean dashboards of
              empty tables — so this module stays clearly marked as upcoming.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {PLANNED_REPORTS.map((r, i) => (
          <Card key={r.title} className="p-5 opacity-90 animate-fade-up" >
            <div className="flex items-center justify-between" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">{r.icon}</span>
              <Badge tone="neutral">V1.3</Badge>
            </div>
            <h3 className="mt-3 font-display text-[14.5px] font-bold text-ink-900">{r.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{r.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
