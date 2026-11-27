import { useEffect, useState } from "react";
import { StaffSidebar } from "../../components/Layout";
import { Alert, Badge, Button, Field, SelectField } from "../../components/UI";
import { api } from "../../lib/api";

export default function CollegeStaff({ user }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", roleCode: "REVIEWER" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function loadStaff() {
    api("/api/v1/college/staff")
      .then((d) => setRows(d.staffRows || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadStaff(); }, []);

  async function addStaff(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    setSaving(true);
    try {
      await api("/api/v1/college/staff", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", email: "", password: "", roleCode: "REVIEWER" });
      setMsg("Staff member added to college.");
      loadStaff();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
      <StaffSidebar />
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">College Staff Directory</h1>
        <p className="text-sm text-zinc-500 mb-6">{user?.institutionName}</p>

        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        {msg && <div className="mb-4"><Alert type="success">{msg}</Alert></div>}

        <form onSubmit={addStaff} className="bg-white border border-zinc-200 rounded-md p-5 mb-6 grid sm:grid-cols-4 gap-3 items-end">
          <Field label="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Field label="Password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <SelectField label="Role" value={form.roleCode} onChange={(e) => setForm({ ...form, roleCode: e.target.value })}>
            <option value="REVIEWER">Reviewer</option>
            <option value="ACCOUNTS">Accounts</option>
            <option value="REGISTRAR">Registrar</option>
            <option value="ADMISSIONS_OFFICER">Admissions Officer</option>
          </SelectField>
          <div className="sm:col-span-4">
            <Button type="submit" isLoading={saving}>Add Staff Member</Button>
          </div>
        </form>

        <div className="bg-white border border-zinc-200 rounded-md overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-zinc-500">Loading staff...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium text-zinc-900">{r.user?.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{r.user?.email}</td>
                      <td className="px-4 py-3"><Badge variant="info">{r.role?.displayName || r.role?.code}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
