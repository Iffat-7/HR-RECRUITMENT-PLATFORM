import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, GripVertical, Plus, Save, X } from "lucide-react";
import { getQuestionSetItems, listQuestions, saveQuestionSetItems } from "../../services/catalog";
import { classifyError, formatDuration, type AppError } from "../../lib/utils";
import { Badge, Button, Card, Skeleton, StatusBadge } from "../../components/ui/core";
import { EmptyState, ErrorState, useToast } from "../../components/ui/feedback";
import { PageHeader } from "../../components/shared";
import type { Question, QuestionSetQuestion } from "../../types";

export default function QuestionSetBuilder() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<QuestionSetQuestion[]>([]);
  const [bank, setBank] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const { push } = useToast();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [its, qs] = await Promise.all([getQuestionSetItems(id), listQuestions()]);
      setItems(its);
      setBank(qs);
      setDirty(false);
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const includedIds = new Set(items.map((i) => i.question_id));
  const available = bank.filter((q) => q.is_active && !includedIds.has(q.id));

  const add = (q: Question) => {
    setItems((prev) => [
      ...prev,
      {
        question_set_id: id!,
        question_id: q.id,
        display_order: prev.length + 1,
        questions: q,
      },
    ]);
    setDirty(true);
  };

  const remove = (qid: string) => {
    setItems((prev) => prev.filter((i) => i.question_id !== qid));
    setDirty(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const swap = index + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await saveQuestionSetItems(
        id,
        items.map((i) => i.question_id)
      );
      push("success", "Order saved — this exact sequence will be snapshotted into interviews.");
      setDirty(false);
    } catch (e) {
      push("error", classifyError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Compose question set"
        description="Pick questions from the bank and order them. The order is what candidates will experience."
        crumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Question sets", to: "/admin/question-sets" },
          { label: "Compose" },
        ]}
        actions={
          <>
            <Link to="/admin/question-sets">
              <Button variant="outline" size="sm" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Back
              </Button>
            </Link>
            <Button size="sm" onClick={save} loading={saving} disabled={!dirty} icon={<Save className="h-3.5 w-3.5" />}>
              Save order
            </Button>
          </>
        }
      />

      {error && <ErrorState error={error} onRetry={load} />}

      {loading && !error && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      )}

      {!loading && !error && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {/* In set */}
          <Card className="animate-fade-up">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-[15px] font-bold text-ink-900">Interview sequence</h2>
              <Badge tone={dirty ? "warning" : "success"}>{dirty ? "unsaved changes" : "saved"}</Badge>
            </div>
            {items.length === 0 ? (
              <div className="px-5 py-10">
                <EmptyState
                  icon={<GripVertical className="h-5 w-5" />}
                  title="Sequence is empty"
                  body="Add questions from the bank on the right. Order matters — candidates answer in this exact sequence."
                />
              </div>
            ) : (
              <ol className="divide-y divide-line/70">
                {items.map((it, i) => (
                  <li key={it.question_id} className="flex items-center gap-2.5 px-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 font-mono text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink-900">
                        {it.questions?.question_text ?? "(question removed from bank)"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {it.questions && (
                          <>
                            <StatusBadge status={it.questions.response_type} />
                            <Badge tone="info">max {formatDuration(it.questions.maximum_duration_seconds)}</Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-primary-700 disabled:opacity-30" aria-label="Move up">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded p-1 text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-primary-700 disabled:opacity-30" aria-label="Move down">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <button onClick={() => remove(it.question_id)} className="shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-100 hover:text-danger-600" aria-label="Remove question">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Bank */}
          <Card className="animate-fade-up [animation-delay:80ms]">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-[15px] font-bold text-ink-900">Question bank</h2>
              <p className="mt-0.5 text-xs text-ink-400">{available.length} active question{available.length === 1 ? "" : "s"} not in this set</p>
            </div>
            {available.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink-400">
                {bank.length === 0
                  ? "The bank is empty — add questions under Question bank first."
                  : "Every active question is already in this set."}
              </p>
            ) : (
              <ul className="max-h-[540px] divide-y divide-line/70 overflow-y-auto">
                {available.map((q) => (
                  <li key={q.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-primary-50/40">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink-900">{q.question_text}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {q.category && <Badge tone="neutral">{q.category}</Badge>}
                        <StatusBadge status={q.response_type} />
                      </div>
                    </div>
                    <Button variant="secondary" size="xs" onClick={() => add(q)} icon={<Plus className="h-3 w-3" />}>
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
