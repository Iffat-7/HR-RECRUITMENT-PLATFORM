import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Hourglass } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { listCandidateInterviews, type CandidateInterview } from "../../services/interviews";
import { Button, Card } from "../../components/ui/core";
import { CopyChip } from "../../components/shared";

export default function CandidateComplete() {
  const { candidate } = useAuth();
  const [interviews, setInterviews] = useState<CandidateInterview[] | null>(null);

  useEffect(() => {
    if (!candidate) return;
    listCandidateInterviews(candidate.id).then(setInterviews).catch(() => setInterviews([]));
  }, [candidate]);

  const submitted = interviews?.find((i) => i.status === "SUBMITTED" || i.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-xl">
      {submitted ? (
        <Card className="overflow-hidden animate-fade-up">
          <div className="border-b border-line bg-success-100/60 px-6 py-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-600 text-white shadow-lift">
              <CheckCircle2 className="h-7 w-7" />
            </span>
          </div>
          <div className="px-6 py-7 text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Interview submitted — thank you.</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              Your answers are safely stored and visible only to the reviewers assigned to your application. You'll
              hear from the recruitment team at the email you registered with.
            </p>
            <div className="mt-5 flex justify-center">
              <CopyChip value={candidate?.reference_code ?? ""} label="your reference code" />
            </div>
            <Link to="/candidate" className="mt-6 inline-block">
              <Button variant="outline">Back to my dashboard</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center animate-fade-up">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-100 text-warning-600">
            <Hourglass className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold tracking-tight text-ink-900">Nothing submitted yet</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            {candidate
              ? "This page confirms your submission once your recorded interview is in. If a recruiter has assigned you questions, you'll find them under the Interview tab."
              : "Complete registration first — then a recruiter can assign your interview."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to={candidate ? "/candidate/interview" : "/candidate/register"}>
              <Button>{candidate ? "Go to interview" : "Register"}</Button>
            </Link>
            <Link to="/candidate">
              <Button variant="ghost">Home</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
