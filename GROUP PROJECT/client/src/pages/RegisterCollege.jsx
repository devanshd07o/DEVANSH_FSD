import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Button, Field } from "../components/UI";
import { api } from "../lib/api";

export default function RegisterCollegePage({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ collegeName: "", collegeCode: "", city: "", adminName: "", adminEmail: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/api/v1/colleges/register", { method: "POST", body: JSON.stringify(form) });
      await onAuth();
      navigate(data.redirectUrl || "/admissions/overview");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <main className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="text-xl sm:text-2xl font-bold tracking-tight">College Admission Portal</Link>
        <p className="text-sm text-text-secondary mt-1">Register New College</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-surface p-6 sm:p-7 rounded-card border border-border space-y-4">
        <Alert>{error}</Alert>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="College Name" id="collegeName" required placeholder="e.g. JSS Academy" value={form.collegeName} onChange={update("collegeName")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="College Code" id="collegeCode" required placeholder="e.g. JSS-091" value={form.collegeCode} onChange={update("collegeCode")} />
            <Field label="City" id="city" required placeholder="e.g. Noida" value={form.city} onChange={update("city")} />
          </div>
          <Field label="Admin Name" id="adminName" required placeholder="Full name" value={form.adminName} onChange={update("adminName")} />
          <Field label="Admin Email" id="adminEmail" type="email" required placeholder="admin@college.edu.in" value={form.adminEmail} onChange={update("adminEmail")} />
          <Field label="Password" id="password" type="password" required minLength={8} placeholder="Minimum 8 characters" value={form.password} onChange={update("password")} />
          <Button type="submit" isLoading={loading} className="w-full">Register College</Button>
        </form>
        <p className="text-center text-xs sm:text-sm text-text-secondary">
          Already registered? <Link to="/sign-in?tab=college" className="font-semibold text-text-primary hover:underline">College Sign In</Link>
        </p>
      </div>
    </main>
  );
}
