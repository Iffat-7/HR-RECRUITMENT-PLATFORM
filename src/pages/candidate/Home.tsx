import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, CalendarCheck2, ClipboardList, ShieldCheck, Video } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Badge, Button, Card, StatusBadge } from "../../components/ui/core";
import { CopyChip, DefRow } from "../../components/shared";
import { formatDate } from "../../lib/utils";

export default function CandidateHome() {
  const { candidate, user } = useAuth();

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
        <Card className="p-5 lg:col-span-3 animate-fade-up [animation-delay:60ms]">
          <h2 className="mb-3 flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
            <ClipboardList className="h-4 w-4 text-primary-600" /> Your application
          </h2>
          <dl>
            <DefRow label="Position">{candidate.positions?.title ?? "Not selected"}</DefRow>
            <DefRow label="Department">{candidate.positions?.department ?? "—"}</DefRow>
            <DefRow label="Registered">{formatDate(candidate.created_at)}</DefRow>
            <DefRow label="Consent">
              <span className="inline-flex items-center gap-1.5 font-semibold text-success-700">
                <ShieldCheck className="h-4 w-4" /> given {candidate.consent_timestamp ? formatDate(candidate.consent_timestamp) : ""}
              </span>
            </DefRow>
          </dl>
          <div className="mt-4 rounded-lg bg-paper px-4 py-3 text-[12.5px] leading-relaxed text-ink-500">
            Need to correct something? Contact the recruitment team quoting your reference code — profiles are locked
            after registration to keep the process auditable.
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5 animate-fade-up [animation-delay:120ms]">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <BookOpenCheck className="h-4 w-4 text-primary-600" /> Next step
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
              Read the interview instructions so you know exactly how the recorded interview works.
            </p>
            <Link to="/candidate/instructions" className="mt-3 block">
              <Button variant="secondary" className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
                Read instructions
              </Button>
            </Link>
          </Card>

          <Card className="p-5 animate-fade-up [animation-delay:180ms]">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
              <Video className="h-4 w-4 text-primary-600" /> Interview status
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
              Once a recruiter assigns you an interview, your questions appear under the Interview tab. Recording
              itself arrives in V1.2.
            </p>
            <Link to="/candidate/interview" className="mt-3 block">
              <Button variant="outline" className="w-full" icon={<CalendarCheck2 className="h-4 w-4" />}>
                Check interview
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white px-5 py-4 animate-fade-up [animation-delay:220ms]">
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-500">
          <Badge tone="info">privacy</Badge>
          Your CV, photo and recordings are stored in private buckets. Only the reviewers assigned to your application
          can access them — never through public links.
        </p>
      </div>
    </div>
  );
}
