import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Lamp,
  Mic2,
  MonitorSmartphone,
  RotateCcw,
  TimerReset,
  Volume2,
  Wifi,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Badge, Button, Card } from "../../components/ui/core";

const CHECKLIST = [
  { icon: <Wifi className="h-4.5 w-4.5" />, title: "Stable internet", body: "A wired or strong Wi-Fi connection prevents uploads from stalling mid-way." },
  { icon: <Mic2 className="h-4.5 w-4.5" />, title: "Working microphone", body: "Answer audio must be clearly audible — test it in any voice recorder app first." },
  { icon: <Lamp className="h-4.5 w-4.5" />, title: "Good lighting", body: "Face a window or lamp. Reviewers evaluate communication — let them see you." },
  { icon: <Volume2 className="h-4.5 w-4.5" />, title: "Quiet room", body: "Background noise is the most common reason candidates retake answers." },
  { icon: <MonitorSmartphone className="h-4.5 w-4.5" />, title: "Camera permission", body: "Your browser will ask for camera/microphone access — allow it for this site." },
];

const FLOW = [
  { icon: <TimerReset className="h-4 w-4" />, title: "Preparation", body: "Each question gives you a fixed prep window (e.g. 30 seconds) to collect your thoughts." },
  { icon: <Clock3 className="h-4 w-4" />, title: "Recording", body: "Answer within the maximum duration (e.g. 2 minutes). The recorder stops automatically." },
  { icon: <BadgeCheck className="h-4 w-4" />, title: "Preview", body: "Watch or listen to your answer before submitting — you decide what the reviewers see." },
  { icon: <RotateCcw className="h-4 w-4" />, title: "Retakes", body: "Each question allows a limited number of retakes (shown on the question card). Only your final take is kept." },
];

export default function Instructions() {
  const { candidate } = useAuth();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="animate-fade-up">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">Step 2 — Instructions</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900">How your recorded interview works</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
          Five minutes of reading now saves you retakes later. The recording module ships in V1.2 — the rules below
          are already configured per question by the recruitment team.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {FLOW.map((f, i) => (
          <Card key={f.title} className="p-5 animate-fade-up" >
            <div className="flex items-center gap-3" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">{f.icon}</span>
              <h2 className="font-display text-[14.5px] font-bold text-ink-900">{f.title}</h2>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">{f.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6 animate-fade-up [animation-delay:120ms]">
        <h2 className="font-display text-[15px] font-bold text-ink-900">Before you start — checklist</h2>
        <ul className="mt-4 space-y-3.5">
          {CHECKLIST.map((c) => (
            <li key={c.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">{c.icon}</span>
              <div>
                <p className="text-[13.5px] font-semibold text-ink-900">{c.title}</p>
                <p className="text-[12.5px] leading-relaxed text-ink-500">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6 overflow-hidden animate-fade-up [animation-delay:180ms]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/60 px-6 py-4">
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink-900">Fairness & privacy, in writing</h2>
            <p className="mt-0.5 text-xs text-ink-400">The same commitments the recruitment team is held to.</p>
          </div>
          <Badge tone="success" dot>enforced in database</Badge>
        </div>
        <ul className="space-y-2 px-6 py-4 text-[13px] leading-relaxed text-ink-700">
          <li>• Your recordings are stored privately — there are no public links, ever.</li>
          <li>• Only reviewers assigned to your application can play them, via expiring signed URLs.</li>
          <li>• Questions are frozen the moment your interview is created — they can't change under you.</li>
          <li>• AI may later assist reviewers, but a human always makes the hiring decision.</li>
        </ul>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 animate-fade-up [animation-delay:240ms]">
        <Link to="/candidate" className="text-[13px] font-semibold text-ink-500 transition-colors hover:text-primary-700">
          ← Back to home
        </Link>
        <Link to="/candidate/interview">
          <Button icon={<ArrowRight className="h-4 w-4" />}>
            {candidate ? "Go to my interview" : "Continue"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
