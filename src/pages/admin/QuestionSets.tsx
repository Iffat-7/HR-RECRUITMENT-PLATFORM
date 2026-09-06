import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck, ListOrdered, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createQuestionSet,
  deleteQuestionSet,
  getQuestionSetItems,
  listPositions,
  listQuestionSets,
  updateQuestionSet,
} from "../../services/catalog";
import { questionSetSchema, type QuestionSetInput } from "../../lib/validation/schemas";
import { classifyError, type AppError } from "../../lib/utils";
import { Button, Card, Skeleton } from "../../components/ui/core";
import { Field, SelectInput, TextArea, TextInput, Toggle } from "../../components/ui/fields";
import { ConfirmDialog, EmptyState, ErrorState, Modal, useToast } from "../../components/ui/feedback";
import { PageHeader } from "../../components/shared";
import type { Position, QuestionSet } from "../../types";

export default function QuestionSets() {
  const [rows, setRows] = useState<QuestionSet[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionSet | null>(null);
  const [deleting, setDeleting] = useState<QuestionSet | null>(null);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  const form = useForm<QuestionSetInput>({ resolver: zodResolver(questionSetSchema) });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sets, pos] = await Promise.all([listQuestionSets(), listPositions(true)]);
      setRows(sets);
      setPositions(pos);
      const counts: Record<string, number> = {};
      await Promise.all(
        sets.map(async (s) => {
          try {
            counts[s.id] = (await getQuestionSetItems(s.id)).length;
          } catch {
            counts[s.id] = 0;
          }
        })
      );
      setItemCounts(counts);
    } catch (e) {
      setError(classifyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", description: "", position_id: null });
    setModalOpen(true);
  };

  const openEdit = (s: QuestionSet) => {
    setEditing(s);
    form.reset({ name: s.name, description: s.description ?? "", position_id: s.position_id });
    setModalOpen(true);
  };

  const onSubmit = async (input: QuestionSetInput) => {
    setBusy(true);
    try {
      if (editing) {
        await updateQuestionSet(editing.id, { name: input.name, description: input.description || null, position_id: input.position_id });
        push("success", "Question set updated.");
      } else {
        await createQuestionSet(input);
        push("success", "Question set created — now add questions to it.");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      push("error", classifyError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const onToggle = async (s: QuestionSet, active: boolean) => {
    try {
      await updateQuestionSet(s.id, { is_active: active });
      load();
    } catch (e) {
      push("error", classifyError(e).message);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteQuestionSet(deleting.id);
      push("success", "Question set deleted.");
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
        title="Question sets"
        description="Reusable interview templates. Assign a set to a candidate's interview and its questions are frozen as snapshots at that moment."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Question sets" }]}
        actions={
          <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
            New set
          </Button>
        }
      />

      {error && <ErrorState error={error} onRetry={load} />}

      {loading && !error && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<ClipboardCheck className="h-5.5 w-5.5" />}
          title="No question sets yet"
          body="Sets are templates like 'Frontend Engineer — Round 1'. Create one, then compose it from the question bank."
          action={
            <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
              Create set
            </Button>
          }
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 animate-fade-up">
          {rows.map((s) => (
            <Card key={s.id} className="flex flex-col p-5 transition-all hover:border-primary-300 hover:shadow-lift">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-[15px] font-bold text-ink-900">{s.name}</h3>
                  <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-400">
                    {s.positions?.title ?? "Any position"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Toggle checked={s.is_active} onChange={(v) => onToggle(s, v)} label={`Toggle ${s.name}`} />
                  <Button variant="ghost" size="xs" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`} icon={<Pencil className="h-3.5 w-3.5" />} />
                  <Button variant="ghost" size="xs" onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`} className="hover:bg-danger-100 hover:text-danger-700" icon={<Trash2 className="h-3.5 w-3.5" />} />
                </div>
              </div>
              <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-ink-500">{s.description || "No description"}</p>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-ink-500">
                  <ListOrdered className="h-3.5 w-3.5" />
                  {itemCounts[s.id] ?? 0} question{(itemCounts[s.id] ?? 0) === 1 ? "" : "s"}
                </span>
                <Link
                  to={`/admin/question-sets/${s.id}`}
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-700 transition-colors hover:text-primary-800"
                >
                  Compose set <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit question set" : "New question set"}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Name" required error={form.formState.errors.name?.message}>
            <TextInput placeholder="e.g. Customer Support — Screen 1" invalid={!!form.formState.errors.name} {...form.register("name")} />
          </Field>
          <Field label="Linked position" hint="optional">
            <SelectInput {...form.register("position_id")}>
              <option value="">Any position</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Description" error={form.formState.errors.description?.message}>
            <TextArea rows={3} placeholder="What is this set used for?" {...form.register("description")} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {editing ? "Save changes" : "Create set"}
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
        title="Delete question set?"
        confirmLabel="Delete"
        body={`"${deleting?.name}" and its ordering will be removed. Questions themselves stay in the bank, and existing interviews keep their snapshots.`}
      />
    </div>
  );
}
