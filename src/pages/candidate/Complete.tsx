import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Hourglass } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { listCandidateInterviews, type CandidateInterview } from "../../services/interviews";
import { Button, Card, Skeleton, StatusBadge } from "../../components/ui/core";
import { CopyChip, DefRow } from "../../components/shared";
import { formatDateTime } from "../../lib/utils";

export default function CandidateComplete() {
  const { candidate } = useAuth();
  const [interviews, setInterviews] = useState<CandidateInterview[] | null>(null);

  useEffect(() => {
    if (!candidate) return;
    listCandidateInterviews(candidate.id).then(setInterviews).catch(() => setInterviews([]));
  }, [candidate]);

  if (!candidate) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center animate-fade-up">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink-900">Complete registration first</h1>
        <p className="mt-2 text-sm text-ink-500">This page confirms your interview submission once it's in.</p>
        <Link to="/candidate/register" className="mt-5 inline-block">
          <Button>Register</Button>
        </Link>
      </Card>
    );
  }

  if (interviews === null) {
    return <Skeleton className="mx-auto h-80 max-w-xl rounded-xl" />;
  }

  const submitted = interviews.find((i) => i.status === "SUBMITTED");

  if (!submitted) {
    const inProgress = interviews.find((i) => i.status === "IN_PROGRESS" || i.status === "NOT_STARTED");
    return (
      <Card className="mx-auto max-w-xl p-8 text-center animate-fade-up">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-100 text-warning-600">
          <Hourglass className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold tracking-tight text-ink-900">Nothing submitted yet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
          {inProgress
            ? "This page confirms your submission the moment your recorded interview is in. Your progress so far is safe — pick up where you left off."
            : "Once a recruiter assigns your interview and you submit it, the confirmation appears here."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {inProgress && (
            <Link to="/candidate/interview">
              <Button>{inProgress.status === "NOT_STARTED" ? "Start interview" : "Resume interview"}</Button>
            </Link>
          )}
          <Link to="/candidate">
            <Button variant="ghost">Home</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const answered = (submitted.interview_questions ?? []).filter((q) =>
    ["COMPLETED", "RECORDED", "SKIPPED"].includes(q.status)
  ).length;

  return (
    <Card className="mx-auto max-w-xl overflow-hidden animate-fade-up">
      <div className="relative border-b border-line bg-navy-900 px-6 py-8 text-center navy-texture">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-success-600/25 blur-3xl" />
        <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success-600 text-white shadow-pop">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="relative mt-4 font-display text-2xl font-bold tracking-tight text-white">Interview complete — thank you.</h1>
        <p className="relative mt-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary-300">
          Confirmation · {candidate.reference_code}
        </p>
      </div>

      <div className="px-6 py-6">
        <dl>
          <DefRow label="Candidate reference">
            <CopyChip value={candidate.reference_code} label="reference code" />
          </DefRow>
          <DefRow label="Position">{candidate.positions?.title ?? "—"}</DefRow>
          <DefRow label="Submitted">{formatDateTime(submitted.submitted_at)}</DefRow>
          <DefRow label="Answers recorded">
            {answered} of {submitted.interview_questions?.length ?? 0}
          </DefRow>
          <DefRow label="Status">
            <StatusBadge status={submitted.status} />
          </DefRow>
        </dl>

        <p className="mt-5 rounded-lg bg-paper px-4 py-3 text-[12.5px] leading-relaxed text-ink-500">
          Your recordings are stored privately and visible only to the reviewers assigned to your application. The
          recruitment team will contact you at <span className="font-semibold text-ink-900">{candidate.email ?? "your registered email"}</span>.
          Quote your reference code in any message.
        </p>

        <div className="mt-5 flex justify-center gap-2">
          <Link to="/candidate">
            <Button variant="outline">Back to my dashboard</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
