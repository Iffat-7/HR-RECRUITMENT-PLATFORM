import { useCallback, useEffect, useState } from "react";
import { Clapperboard, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createQuestion, deleteQuestion, listQuestions, updateQuestion } from "../../services/catalog";
import { questionSchema, type QuestionInput } from "../../lib/validation/schemas";
import { classifyError, formatDuration, type AppError } from "../../lib/utils";
import { Badge, Button, Card, Skeleton, StatusBadge } from "../../components/ui/core";
import { CheckboxInput, Field, SelectInput, TextArea, TextInput, Toggle } from "../../components/ui/fields";
import { ConfirmDialog, EmptyState, ErrorState, Modal, useToast } from "../../components/ui/feedback";
import { PageHeader } from "../../components/shared";
import { QUESTION_CATEGORIES, RESPONSE_TYPES, type Question } from "../../types";

export default function Questions() {
  const [rows, setRows] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  const form = useForm<QuestionInput>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      category: "BEHAVIORAL",
      response_type: "VIDEO",
      maximum_duration_seconds: 120,
      preparation_time_seconds: 30,
      maximum_retakes: 2,
      is_required: true,
      is_active: true,
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listQuestions());
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = categoryFilter ? rows.filter((q) => q.category === categoryFilter) : rows;

  const openCreate = () => {
    setEditing(null);
    form.reset({
      question_text: "",
      category: "BEHAVIORAL",
      response_type: "VIDEO",
      maximum_duration_seconds: 120,
      preparation_time_seconds: 30,
      maximum_retakes: 2,
      is_required: true,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    form.reset({
      question_text: q.question_text,
      category: q.category ?? "GENERAL",
      response_type: q.response_type,
      maximum_duration_seconds: q.maximum_duration_seconds,
      preparation_time_seconds: q.preparation_time_seconds,
      maximum_retakes: q.maximum_retakes,
      is_required: q.is_required,
      is_active: q.is_active,
    });
    setModalOpen(true);
  };

  const onSubmit = async (input: QuestionInput) => {
    setBusy(true);
    try {
      if (editing) {
        await updateQuestion(editing.id, input);
        push("success", "Question updated. Existing interviews keep their frozen snapshots.");
      } else {
        await createQuestion(input);
        push("success", "Question added to the bank.");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      push("error", classifyError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const onToggle = async (q: Question, active: boolean) => {
    try {
      await updateQuestion(q.id, { is_active: active });
      load();
    } catch (e) {
      push("error", classifyError(e).message);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteQuestion(deleting.id);
      push("success", "Question deleted from the bank.");
      setDeleting(null);
      load();
    } catch (e) {
      push("error", classifyError(e).message);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Question bank"
        description="The master library of interview questions. Questions are snapshotted into each interview, so editing here never rewrites a candidate's existing interview."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Question bank" }]}
        actions={
          <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
            New question
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SelectInput value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-48" aria-label="Filter by category">
          <option value="">All categories</option>
          {QUESTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectInput>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-ink-400">
          {loading ? "…" : `${visible.length} question${visible.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {error && <ErrorState error={error} onRetry={load} />}

      {loading && !error && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <EmptyState
          icon={<Clapperboard className="h-5.5 w-5.5" />}
          title={rows.length === 0 ? "The question bank is empty" : "Nothing in this category"}
          body={
            rows.length === 0
              ? "Add position-specific questions with response type, duration, prep time and retake limits."
              : "Try another category filter."
          }
          action={rows.length === 0 ? <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>Add first question</Button> : undefined}
        />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="space-y-2.5 animate-fade-up">
          {visible.map((q) => (
            <Card key={q.id} className="group flex flex-wrap items-start gap-3 p-4 transition-all hover:border-primary-300 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <p className={`text-[14px] leading-snug font-semibold ${q.is_active ? "text-ink-900" : "text-ink-400 line-through decoration-ink-300"}`}>
                  {q.question_text}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {q.category && <Badge tone="neutral">{q.category}</Badge>}
                  <StatusBadge status={q.response_type} />
                  <Badge tone="info">max {formatDuration(q.maximum_duration_seconds)}</Badge>
                  <Badge tone="warning">{formatDuration(q.preparation_time_seconds)} prep</Badge>
                  <Badge tone="neutral">{q.maximum_retakes} retake{q.maximum_retakes === 1 ? "" : "s"}</Badge>
                  {q.is_required && <Badge tone="danger">required</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Toggle checked={q.is_active} onChange={(v) => onToggle(q, v)} label={`Toggle question active`} />
                <Button variant="ghost" size="xs" onClick={() => openEdit(q)} aria-label="Edit question" icon={<Pencil className="h-3.5 w-3.5" />} />
                <Button variant="ghost" size="xs" onClick={() => setDeleting(q)} aria-label="Delete question" className="hover:bg-danger-100 hover:text-danger-700" icon={<Trash2 className="h-3.5 w-3.5" />} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit question" : "New question"} subtitle="These limits drive the live recording flow: prep timer, max duration, retakes — frozen into each interview." wide>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Question text" required error={form.formState.errors.question_text?.message}>
            <TextArea rows={3} placeholder='e.g. "Describe a project you shipped under a tight deadline."' invalid={!!form.formState.errors.question_text} {...form.register("question_text")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" required error={form.formState.errors.category?.message}>
              <SelectInput {...form.register("category")}>
                {QUESTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Response type" required error={form.formState.errors.response_type?.message}>
              <SelectInput {...form.register("response_type")}>
                {RESPONSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Max duration (seconds)" required error={form.formState.errors.maximum_duration_seconds?.message}>
              <TextInput type="number" min={10} max={1800} {...form.register("maximum_duration_seconds")} />
            </Field>
            <Field label="Preparation time (seconds)" required error={form.formState.errors.preparation_time_seconds?.message}>
              <TextInput type="number" min={0} max={600} {...form.register("preparation_time_seconds")} />
            </Field>
            <Field label="Maximum retakes" required error={form.formState.errors.maximum_retakes?.message}>
              <TextInput type="number" min={0} max={10} {...form.register("maximum_retakes")} />
            </Field>
            <div className="flex items-end gap-6 pb-1.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
                <CheckboxInput {...form.register("is_required")} /> Required
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
                <CheckboxInput {...form.register("is_active")} /> Active
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {editing ? "Save changes" : "Add question"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        danger
        loading={busy}
        title="Delete question?"
        confirmLabel="Delete"
        body="The question is removed from the bank and from sets. Interviews already created keep their frozen snapshot and are unaffected."
      />
    </div>
  );
}
