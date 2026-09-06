import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, CalendarCheck2, ClipboardList, FileText, ImagePlus, ShieldCheck, Video } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Badge, Button, Card, StatusBadge } from "../../components/ui/core";
import { CopyChip, DefRow } from "../../components/shared";
import FileUpload from "../../components/candidate/FileUpload";
import { CV_RULES, PHOTO_RULES, cvPath, photoPath } from "../../services/storage";
import { updateCandidateFiles } from "../../services/candidates";
import { listCandidateInterviews } from "../../services/interviews";
import { classifyError, formatDate } from "../../lib/utils";

const ANSWERED = ["COMPLETED", "RECORDED", "SKIPPED"] as const;

export default function CandidateHome() {
  const { candidate, user, refreshIdentity } = useAuth();
  const [busyCv, setBusyCv] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);
  const [interview, setInterview] = useState<{ status: string; done: number; total: number } | null>(null);

  useEffect(() => {
    if (!candidate) return;
    let live = true;
    listCandidateInterviews(candidate.id)
      .then((list) => {
        if (!live) return;
        const active = list.find((i) => ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"].includes(i.status));
        if (!active) {
          setInterview(null);
          return;
        }
        const qs = active.interview_questions ?? [];
        setInterview({
          status: active.status,
          done: qs.filter((q) => (ANSWERED as readonly string[]).includes(q.status)).length,
          total: qs.length,
        });
      })
      .catch(() => live && setInterview(null));
    return () => {
      live = false;
    };
  }, [candidate]);

  const cvMeta = useMemo(
    () => (candidate?.cv_path ? { label: "CV / resume" } : null),
    [candidate?.cv_path]
  );

  if (!candidate) {
    return (
      <div className="mx-auto max-w-xl animate-fade-up">
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-navy-900 px-6 py-6 navy-texture">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-300">Candidate portal</p>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
              Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""} — one step to go
            </h1>
          </div>
          <div className="px-6 py-6">
            <p className="text-sm leading-relaxed text-ink-500">
              Your account is active, but your candidate profile isn't complete yet. Register once — your details,
              the position you're applying for, and your consent — and the recruitment team can move you into the pipeline.
            </p>
            <Link to="/candidate/register" className="mt-5 block">
              <Button className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
                Complete registration
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">Candidate portal</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900">
          Hello, {candidate.full_name.split(" ")[0]} — you're in the pipeline.
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Keep this reference code handy for any communication with the recruitment team.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <CopyChip value={candidate.reference_code} label="your reference code" />
          <StatusBadge status={candidate.status} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Documents */}
        <Card className="p-5 lg:col-span-3 animate-fade-up [animation-delay:60ms]">
          <h2 className="mb-1 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
            <FileText className="h-4 w-4 text-primary-600" /> Your documents
          </h2>
          <p className="mb-4 text-[12.5px] leading-relaxed text-ink-500">
            Stored in private buckets under your candidate ID — no public links, ever. Your CV is required before the
            recorded interview can start; the photo is optional.
          </p>

          <div className="space-y-5">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[13px] font-bold text-ink-900">
                CV / resume <Badge tone={candidate.cv_path ? "success" : "danger"} dot>{candidate.cv_path ? "on file" : "required"}</Badge>
              </p>
              {busyCv ? (
                <p className="rounded-lg border border-line bg-paper px-3.5 py-3 text-[12.5px] text-ink-500">Saving…</p>
              ) : (
                <FileUpload
                  bucket="candidate-cvs"
                  rules={CV_RULES}
                  icon="cv"
                  compactLabel={cvMeta ? "CV / resume" : ""}
                  currentPath={candidate.cv_path}
                  makePath={(ext) => cvPath(candidate.id, ext)}
                  onUploaded={async (path) => {
                    setBusyCv(true);
                    try {
                      await updateCandidateFiles({ cv_path: path });
                      await refreshIdentity();
                    } finally {
                      setBusyCv(false);
                    }
                  }}
                />
              )}
            </div>

            <div className="border-t border-line pt-5">
              <p className="mb-2 flex items-center gap-2 text-[13px] font-bold text-ink-900">
                <ImagePlus className="h-3.5 w-3.5 text-primary-600" /> Profile photo{" "}
                <Badge tone="neutral">optional</Badge>
              </p>
              {busyPhoto ? (
                <p className="rounded-lg border border-line bg-paper px-3.5 py-3 text-[12.5px] text-ink-500">Saving…</p>
              ) : (
                <FileUpload
                  bucket="candidate-profile-photos"
                  rules={PHOTO_RULES}
                  icon="photo"
                  compactLabel="Profile photo"
                  currentPath={candidate.profile_photo_path}
                  makePath={(ext) => photoPath(candidate.id, ext)}
                  onUploaded={async (path) => {
                    setBusyPhoto(true);
                    try {
                      await updateCandidateFiles({ profile_photo_path: path });
                      await refreshIdentity();
                    } finally {
                      setBusyPhoto(false);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {/* Interview status — live */}
          <Card className="p-5 animate-fade-up [animation-delay:120ms]">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <Video className="h-4 w-4 text-primary-600" /> Interview status
            </h2>
            {!interview ? (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
                No interview assigned yet. Once a recruiter creates one, your questions appear here — recorded at your
                own pace, saved after every answer.
              </p>
            ) : (
              <>
                <div className="mt-2.5 flex items-center gap-2">
                  <StatusBadge status={interview.status} />
                  {interview.status === "IN_PROGRESS" && (
                    <span className="font-mono text-[11px] font-semibold text-ink-500">
                      {interview.done}/{interview.total} answered
                    </span>
                  )}
                </div>
                {interview.status === "IN_PROGRESS" && interview.total > 0 && (
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink-900/8">
                    <div
                      className="h-full rounded-full bg-success-600 transition-[width] duration-500"
                      style={{ width: `${(interview.done / interview.total) * 100}%` }}
                    />
                  </div>
                )}
                <p className="mt-2 text-[12px] leading-relaxed text-ink-400">
                  {interview.status === "NOT_STARTED" && !candidate.cv_path
                    ? "Upload your CV above to unlock the start button."
                    : interview.status === "NOT_STARTED"
                      ? "Ready when you are — your CV is on file."
                      : interview.status === "IN_PROGRESS"
                        ? "Pick up exactly where you left off; uploaded answers are safe."
                        : "Submitted — confirmation details are on the Complete step."}
                </p>
              </>
            )}
            <Link to="/candidate/interview" className="mt-3.5 block">
              <Button className="w-full" icon={<CalendarCheck2 className="h-4 w-4" />}>
                {interview?.status === "IN_PROGRESS" ? "Resume interview" : interview ? "Go to interview" : "Check interview"}
              </Button>
            </Link>
          </Card>

          <Card className="p-5 animate-fade-up [animation-delay:180ms]">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <BookOpenCheck className="h-4 w-4 text-primary-600" /> Instructions
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
              Prep timer, auto-stop at the time limit, preview before submit, limited retakes — two minutes of reading
              saves you retakes.
            </p>
            <Link to="/candidate/instructions" className="mt-3 block">
              <Button variant="secondary" className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
                Read instructions
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 animate-fade-up [animation-delay:220ms]">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
            <ClipboardList className="h-4 w-4 text-primary-600" /> Your application
          </h2>
          <dl className="mt-2">
            <DefRow label="Position">{candidate.positions?.title ?? "Not selected"}</DefRow>
            <DefRow label="Department">{candidate.positions?.department ?? "—"}</DefRow>
            <DefRow label="Registered">{formatDate(candidate.created_at)}</DefRow>
            <DefRow label="Consent">
              <span className="inline-flex items-center gap-1.5 font-semibold text-success-700">
                <ShieldCheck className="h-4 w-4" /> given {candidate.consent_timestamp ? formatDate(candidate.consent_timestamp) : ""}
              </span>
            </DefRow>
          </dl>
        </Card>

        <div className="rounded-xl border border-line bg-white px-5 py-4 animate-fade-up [animation-delay:260ms]">
          <p className="flex flex-wrap items-center gap-2 text-[12.5px] leading-relaxed text-ink-500">
            <Badge tone="info">privacy</Badge>
            Your CV, photo and recordings are stored in private buckets. Only the reviewers assigned to your
            application can access them — through short-lived signed links, never public URLs. Retakes replace your
            answer; previous takes stay sealed for audit.
          </p>
        </div>
      </div>
    </div>
  );
}
