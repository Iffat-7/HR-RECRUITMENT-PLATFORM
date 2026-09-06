import { lazy, Suspense, type ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./components/ui/feedback";
import { PageLoader } from "./components/ui/core";
import { Forbidden, NotFound } from "./pages/public/Misc";

const Landing = lazy(() => import("./pages/public/Landing"));
const Login = lazy(() => import("./pages/auth/Login"));
const AdminShell = lazy(() => import("./components/admin/AdminShell"));
const CandidateShell = lazy(() => import("./components/candidate/CandidateShell"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Candidates = lazy(() => import("./pages/admin/Candidates"));
const CandidateDetail = lazy(() => import("./pages/admin/CandidateDetail"));
const Positions = lazy(() => import("./pages/admin/Positions"));
const Questions = lazy(() => import("./pages/admin/Questions"));
const QuestionSets = lazy(() => import("./pages/admin/QuestionSets"));
const QuestionSetBuilder = lazy(() => import("./pages/admin/QuestionSetBuilder"));
const Evaluations = lazy(() => import("./pages/admin/Evaluations"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const UsersPage = lazy(() => import("./pages/admin/Users"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const CandidateHome = lazy(() => import("./pages/candidate/Home"));
const CandidateRegister = lazy(() => import("./pages/candidate/Register"));
const Instructions = lazy(() => import("./pages/candidate/Instructions"));
const CandidateInterview = lazy(() => import("./pages/candidate/Interview"));
const CandidateComplete = lazy(() => import("./pages/candidate/Complete"));

/** Require an authenticated session; data-level authorization stays in RLS. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  if (initializing) return <PageLoader label="Checking session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Client-side mirror of the server-side RLS role checks (defense in depth). */
function RequireHrRole({ children }: { children: ReactNode }) {
  const { isHr, initializing } = useAuth();
  if (initializing) return <PageLoader label="Verifying role…" />;
  if (!isHr) return <Forbidden />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />

              <Route
                path="/candidate"
                element={
                  <RequireAuth>
                    <CandidateShell />
                  </RequireAuth>
                }
              >
                <Route index element={<CandidateHome />} />
                <Route path="register" element={<CandidateRegister />} />
                <Route path="instructions" element={<Instructions />} />
                <Route path="interview" element={<CandidateInterview />} />
                <Route path="complete" element={<CandidateComplete />} />
              </Route>

              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <RequireHrRole>
                      <AdminShell />
                    </RequireHrRole>
                  </RequireAuth>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="candidates" element={<Candidates />} />
                <Route path="candidates/:id" element={<CandidateDetail />} />
                <Route path="positions" element={<Positions />} />
                <Route path="questions" element={<Questions />} />
                <Route path="question-sets" element={<QuestionSets />} />
                <Route path="question-sets/:id" element={<QuestionSetBuilder />} />
                <Route path="evaluations" element={<Evaluations />} />
                <Route path="reports" element={<Reports />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
