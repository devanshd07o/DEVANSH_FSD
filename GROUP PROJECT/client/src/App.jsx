import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Layout";
import { api } from "./lib/api";

import Home from "./pages/Home";
import Programs from "./pages/Programs";
import Verify from "./pages/Verify";
import SignIn from "./pages/SignIn";
import Register from "./pages/Register";
import RegisterCollege from "./pages/RegisterCollege";
import RegisterStaff from "./pages/RegisterStaff";

import StudentDashboard from "./pages/student/Dashboard";
import StudentApplications from "./pages/student/Applications";
import ApplicationForm from "./pages/student/ApplicationForm";
import Tracker from "./pages/student/Tracker";
import Corrections from "./pages/student/Corrections";
import Offers from "./pages/student/Offers";
import Payments from "./pages/student/Payments";
import AdmissionLetter from "./pages/student/AdmissionLetter";
import Notifications from "./pages/student/Notifications";

import ScrutinyQueue from "./pages/staff/ScrutinyQueue";
import ScrutinyDesk from "./pages/staff/ScrutinyDesk";
import Overview from "./pages/staff/Overview";
import SeatMatrix from "./pages/staff/SeatMatrix";
import MeritList from "./pages/staff/MeritList";
import SeatAllotment from "./pages/staff/SeatAllotment";
import CollegeStaff from "./pages/staff/CollegeStaff";
import AccountsPayments from "./pages/staff/AccountsPayments";
import Enrollments from "./pages/staff/Enrollments";
import AuditLog from "./pages/staff/AuditLog";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMISSIONS_OFFICER", "REVIEWER", "ACCOUNTS", "REGISTRAR"];

function isStaffUser(user) {
  return user?.roles?.some((r) => STAFF_ROLES.includes(r));
}

function StudentGuard({ user, loading, onLogout }) {
  if (loading) return <p className="p-8 text-sm text-zinc-500">Loading...</p>;
  if (!user) return <Navigate to="/sign-in" replace />;
  if (isStaffUser(user)) return <Navigate to="/admissions/overview" replace />;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={onLogout} />
      <Outlet />
    </div>
  );
}

function StaffGuard({ user, loading, onLogout }) {
  if (loading) return <p className="p-8 text-sm text-zinc-500">Loading...</p>;
  if (!user) return <Navigate to="/sign-in?tab=staff" replace />;
  if (!isStaffUser(user)) return <Navigate to="/student/dashboard" replace />;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={onLogout} />
      <Outlet />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const data = await api("/api/v1/auth/me");
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refreshUser(); }, []);

  return (
    <Routes>
      <Route path="/" element={<Home user={user} onLogout={refreshUser} />} />
      <Route path="/programs" element={<Programs user={user} onLogout={refreshUser} />} />
      <Route path="/verify/:token" element={<Verify />} />

      <Route path="/sign-in" element={<SignIn onAuth={refreshUser} />} />
      <Route path="/register" element={<Register onAuth={refreshUser} />} />
      <Route path="/register-college" element={<RegisterCollege onAuth={refreshUser} />} />
      <Route path="/register-staff" element={<RegisterStaff onAuth={refreshUser} />} />

      <Route element={<StudentGuard user={user} loading={loading} onLogout={refreshUser} />}>
        <Route path="/student/dashboard" element={<StudentDashboard user={user} />} />
        <Route path="/student/applications" element={<StudentApplications />} />
        <Route path="/student/applications/new" element={<StudentApplications />} />
        <Route path="/student/applications/:id" element={<Tracker />} />
        <Route path="/student/applications/:id/edit" element={<ApplicationForm />} />
        <Route path="/student/applications/:id/corrections" element={<Corrections />} />
        <Route path="/student/offers" element={<Offers />} />
        <Route path="/student/payments" element={<Payments />} />
        <Route path="/student/admission" element={<AdmissionLetter />} />
        <Route path="/student/notifications" element={<Notifications />} />
      </Route>

      <Route element={<StaffGuard user={user} loading={loading} onLogout={refreshUser} />}>
        <Route path="/scrutiny/queue" element={<ScrutinyQueue />} />
        <Route path="/scrutiny/:id" element={<ScrutinyDesk />} />
        <Route path="/admissions/overview" element={<Overview user={user} />} />
        <Route path="/admissions/seat-matrix" element={<SeatMatrix />} />
        <Route path="/admissions/merit" element={<MeritList />} />
        <Route path="/admissions/rounds" element={<SeatAllotment />} />
        <Route path="/admissions/staff" element={<CollegeStaff user={user} />} />
        <Route path="/accounts/payments" element={<AccountsPayments />} />
        <Route path="/accounts/enrollments" element={<Enrollments />} />
        <Route path="/admin/audit" element={<AuditLog />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
