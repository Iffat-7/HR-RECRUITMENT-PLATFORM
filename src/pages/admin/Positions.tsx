import { useCallback, useEffect, useState } from "react";
import { Briefcase, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPosition, deletePosition, listPositions, updatePosition } from "../../services/catalog";
import { positionSchema, type PositionInput } from "../../lib/validation/schemas";
import { classifyError, formatDate, type AppError } from "../../lib/utils";
import { Badge, Button, Card, Skeleton } from "../../components/ui/core";
import { Field, TextArea, TextInput, Toggle } from "../../components/ui/fields";
import { ConfirmDialog, EmptyState, ErrorState, Modal, useToast } from "../../components/ui/feedback";
import { PageHeader } from "../../components/shared";
import type { Position } from "../../types";

export default function Positions() {
  const [rows, setRows] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Position | null>(null);
  const [deleting, setDeleting] = useState<Position | null>(null);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  const form = useForm<PositionInput>({ resolver: zodResolver(positionSchema) });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listPositions());
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
    form.reset({ title: "", description: "", department: "" });
    setModal("create");
  };

  const openEdit = (p: Position) => {
    setEditing(p);
    form.reset({ title: p.title, description: p.description ?? "", department: p.department ?? "" });
    setModal("edit");
  };

  const onSubmit = async (input: PositionInput) => {
    setBusy(true);
    try {
      if (editing) {
        await updatePosition(editing.id, input);
        push("success", `Position "${input.title}" updated.`);
      } else {
        await createPosition(input);
        push("success", `Position "${input.title}" created.`);
      }
      setModal(null);
      load();
    } catch (e) {
      push("error", classifyError(e).message);
    } finally {
      setBusy(false);
    }
  };

  const onToggleActive = async (p: Position, active: boolean) => {
    try {
      await updatePosition(p.id, { is_active: active });
      push("success", active ? `"${p.title}" is now accepting candidates.` : `"${p.title}" deactivated — hidden from candidates.`);
      load();
    } catch (e) {
      push("error", classifyError(e).message);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deletePosition(deleting.id);
      push("success", `Position "${deleting.title}" deleted.`);
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
        title="Positions"
        description="Open roles candidates can apply for. Deactivate a position to hide it from the candidate portal without losing history."
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Positions" }]}
        actions={
          <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
            New position
          </Button>
        }
      />

      {error && <ErrorState error={error} onRetry={load} />}

      {loading && !error && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<Briefcase className="h-5.5 w-5.5" />}
          title="No positions yet"
          body="Create your first open role — it becomes selectable during candidate registration immediately."
          action={
            <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
              Create position
            </Button>
          }
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <Card className="overflow-hidden animate-fade-up">
          <ul>
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line/70 px-5 py-4 transition-colors last:border-0 hover:bg-primary-50/40 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-ink-900">{p.title}</p>
                    {p.department && <Badge tone="neutral">{p.department}</Badge>}
                    {!p.is_active && <Badge tone="warning">inactive</Badge>}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">{p.description || "No description"}</p>
                </div>
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-400">since {formatDate(p.created_at)}</span>
                <div className="flex items-center gap-2">
                  <Toggle checked={p.is_active} onChange={(v) => onToggleActive(p, v)} label={`Toggle ${p.title} active`} />
                  <Button variant="ghost" size="xs" onClick={() => openEdit(p)} aria-label={`Edit ${p.title}`} icon={<Pencil className="h-3.5 w-3.5" />} />
                  <Button variant="ghost" size="xs" onClick={() => setDeleting(p)} aria-label={`Delete ${p.title}`} className="hover:bg-danger-100 hover:text-danger-700" icon={<Trash2 className="h-3.5 w-3.5" />} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={editing ? "Edit position" : "New position"}
        subtitle={editing ? undefined : "Candidates will be able to select this role during registration."}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Title" required error={form.formState.errors.title?.message}>
            <TextInput placeholder="e.g. Senior Frontend Engineer" invalid={!!form.formState.errors.title} {...form.register("title")} />
          </Field>
          <Field label="Department" error={form.formState.errors.department?.message}>
            <TextInput placeholder="e.g. Engineering" {...form.register("department")} />
          </Field>
          <Field label="Description" error={form.formState.errors.description?.message}>
            <TextArea rows={4} placeholder="Responsibilities, requirements, team…" {...form.register("description")} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {editing ? "Save changes" : "Create position"}
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
        title="Delete position?"
        confirmLabel="Delete permanently"
        body={
          deleting
            ? `"${deleting.title}" will be removed. If candidates have already applied to it, the database will block deletion — deactivate it instead.`
            : ""
        }
      />
    </div>
  );
}
