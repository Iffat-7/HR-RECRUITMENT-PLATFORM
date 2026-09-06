import { useCallback, useEffect, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEvaluation, listEvaluationCategories, listEvaluations } from "../../services/evaluations";
import { listCandidates } from "../../services/candidates";
import { listInterviews } from "../../services/interviews";
import { evaluationSchema, type EvaluationInput } from "../../lib/validation/schemas";
import { classifyError, formatDate, type AppError } from "../../lib/utils";
import { Badge, Button, Card, Skeleton, StatusBadge } from "../../components/ui/core";
import { Field, SelectInput, TextArea, TextInput } from "../../components/ui/fields";
import { EmptyState, ErrorState, Modal, useToast } from "../../components/ui/feedback";
import { PageHeader } from "../../components/shared";
import {
  RECOMMENDATIONS,
  RECOMMENDATION_LABELS,
  type Candidate,
  type Evaluation,
  type EvaluationCategory,
  type Interview,
} from "../../types";

export default function Evaluations() {
  const [rows, setRows] = useState<Evaluation[]>([]);
  const [categories, setCategories] = useState<EvaluationCategory[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const { push } = useToast();

  const form = useForm<EvaluationInput>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: { overall_score: 60, recommendation: "MAYBE", interview_id: null, notes: "" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listEvaluations());
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = async () => {
    setModalOpen(true);
    try {
      const [cats, cands, ints] = await Promise.all([
        listEvaluationCategories(),
        listCandidates({ pageSize: 200 }),
        listInterviews(),
      ]);
      setCategories(cats);
      setCandidates(cands.rows);
      setInterviews(ints);
      setScores(Object.fromEntries(cats.map((c) => [c.id, Math.round((c.min_score + c.max_score) / 2)])));
    } catch (e) {
      push("error", classifyError(e).message);
    }
  };

  const onSubmit = async (input: EvaluationInput) => {
    setBusy(true);
    try {
      await createEvaluation(
        input,
        Object.entries(scores).map(([category_id, score]) => ({ category_id, score }))
      );
      push("success", "Evaluation submitted — scores and audit entry recorded.");
      setModalOpen(false);
      form.reset({ overall_score: 60, recommendation: "MAYBE", interview_id: null, notes: "" });
      load();
    } catch (e) {
      push("error", classifyError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Evaluations"
        description="Structured reviewer scoring. Categories are configured in the database — not hardcoded — so your competency model can evolve without a redeploy."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Evaluations" }]}
        actions={
          <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
            New evaluation
          </Button>
        }
      />

      {error && <ErrorState error={error} onRetry={load} />}

      {loading && !error && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<ShieldCheck className="h-5.5 w-5.5" />}
          title="No evaluations yet"
          body="After interviews are reviewed, submit structured evaluations: an overall score, a recommendation and per-category scores."
          action={
            <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
              Submit evaluation
            </Button>
          }
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-3 animate-fade-up">
          {rows.map((e) => (
            <Card key={e.id} className="p-5 transition-all hover:border-primary-300">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-bold text-ink-900">
                    {e.candidates?.full_name ?? "Candidate"}
                    <span className="ml-2 font-mono text-[10.5px] font-medium tracking-wider text-ink-400">{e.candidates?.reference_code}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    Reviewed by {e.profiles?.full_name ?? "—"} · {formatDate(e.created_at)}
                  </p>
                </div>
                <StatusBadge status={e.recommendation} />
                <Badge tone="info">overall {e.overall_score}/100</Badge>
              </div>
              {e.evaluation_scores && e.evaluation_scores.length > 0 && (
                <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {e.evaluation_scores.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="w-40 truncate text-xs text-ink-500">{s.evaluation_categories?.name}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-900/6">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${(s.score / (s.evaluation_categories?.max_score || 5)) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] font-semibold text-ink-700">
                        {s.score}/{s.evaluation_categories?.max_score ?? 5}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {e.notes && <p className="mt-4 rounded-lg bg-paper px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-700">{e.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New evaluation" subtitle="AI may assist reviewers in a later milestone — the recommendation below is always a human decision." wide>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Candidate" required error={form.formState.errors.candidate_id?.message}>
              <SelectInput invalid={!!form.formState.errors.candidate_id} defaultValue="" {...form.register("candidate_id")}>
                <option value="" disabled>
                  Select candidate…
                </option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} — {c.reference_code}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Interview" hint="optional">
              <SelectInput defaultValue="" {...form.register("interview_id")}>
                <option value="">Not linked</option>
                {interviews.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.id.slice(0, 8)}… · {i.status.replace(/_/g, " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          {/* Dynamic categories — fetched from evaluation_categories */}
          <div className="rounded-xl border border-line bg-paper/50 p-4">
            <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Scoring categories ({categories.length})
            </p>
            {categories.length === 0 ? (
              <p className="text-sm text-ink-400">No active scoring categories in the database.</p>
            ) : (
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {categories.map((cat) => (
                  <div key={cat.id}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] font-semibold text-ink-700">{cat.name}</span>
                      <span className="font-mono text-[11px] font-bold text-primary-700">
                        {scores[cat.id] ?? 0}/{cat.max_score}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={cat.min_score}
                      max={cat.max_score}
                      step={0.5}
                      value={scores[cat.id] ?? 0}
                      onChange={(e) => setScores((s) => ({ ...s, [cat.id]: Number(e.target.value) }))}
                      className="mt-1 w-full accent-primary-600"
                      aria-label={`Score for ${cat.name}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Overall score (0–100)" required error={form.formState.errors.overall_score?.message}>
              <Controller
                control={form.control}
                name="overall_score"
                render={({ field }) => (
                  <TextInput type="number" min={0} max={100} invalid={!!form.formState.errors.overall_score} {...field} onChange={(e) => field.onChange(e.target.value)} />
                )}
              />
            </Field>
            <Field label="Recommendation" required error={form.formState.errors.recommendation?.message}>
              <SelectInput {...form.register("recommendation")}>
                {RECOMMENDATIONS.map((r) => (
                  <option key={r} value={r}>
                    {RECOMMENDATION_LABELS[r]}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <Field label="Notes" error={form.formState.errors.notes?.message}>
            <TextArea rows={3} placeholder="Context for the hiring decision…" {...form.register("notes")} />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Submit evaluation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
