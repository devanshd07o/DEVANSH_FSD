import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Layout";
import { api } from "../lib/api";

export default function HomePage({ user, onLogout }) {
  const [data, setData] = useState({ colleges: [], programs: [] });

  useEffect(() => {
    api("/api/v1/colleges").then(setData).catch(() => {});
  }, [user?.institutionId]);

  const isStaff = user?.roles?.some((r) =>
    ["SUPER_ADMIN", "ADMISSIONS_OFFICER", "REVIEWER", "ACCOUNTS", "REGISTRAR"].includes(r)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={onLogout} />
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
        <section className="bg-surface border border-border rounded-card p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            {user ? `${user.institutionName} Admissions` : "College Admission Portal 2026–27"}
          </h1>
          <p className="text-sm text-text-secondary mt-2 max-w-prose">
            {user
              ? `Signed in to ${user.institutionName}. Access your college applications, verification, and seat allotments.`
              : "Apply to a participating college, upload documents, track verification, or register a new college portal."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {user ? (
              <Link
                to={isStaff ? "/admissions/overview" : "/student/dashboard"}
                className="px-4 py-2.5 min-h-[44px] inline-flex items-center text-sm font-medium bg-accent text-white rounded-control hover:bg-accent-hover"
              >
                {isStaff ? "Open College Portal" : "Open Dashboard"}
              </Link>
            ) : (
              <>
                <Link to="/register" className="px-4 py-2.5 min-h-[44px] inline-flex items-center text-sm font-medium bg-accent text-white rounded-control hover:bg-accent-hover">
                  Student Register
                </Link>
                <Link to="/sign-in" className="px-4 py-2.5 min-h-[44px] inline-flex items-center text-sm font-medium bg-surface text-text-primary border border-border rounded-control hover:bg-surface-subtle">
                  Sign In
                </Link>
                <Link to="/register-college" className="px-4 py-2.5 min-h-[44px] inline-flex items-center text-sm font-medium bg-surface text-text-primary border border-border rounded-control hover:bg-surface-subtle">
                  Register College
                </Link>
              </>
            )}
          </div>
        </section>

        {!user && (
          <section className="bg-surface border border-border rounded-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Participating Colleges</h2>
              <Link to="/register-college" className="text-xs font-medium text-text-primary hover:underline">+ Register College</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[600px]">
                <thead className="bg-surface-subtle text-text-secondary border-b border-border text-xs">
                  <tr>
                    <th className="py-2.5 px-5 font-medium">Code</th>
                    <th className="py-2.5 px-5 font-medium">College</th>
                    <th className="py-2.5 px-5 font-medium">Programs</th>
                    <th className="py-2.5 px-5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.colleges.map((col) => (
                    <tr key={col.id} className="hover:bg-surface-subtle">
                      <td className="py-3 px-5 font-mono text-xs font-semibold">{col.code}</td>
                      <td className="py-3 px-5 font-medium">{col.name}</td>
                      <td className="py-3 px-5 tabular-nums text-text-secondary">{col._count?.programs || 0}</td>
                      <td className="py-3 px-5 text-right space-x-3">
                        <Link to={`/register?college=${col.id}`} className="text-xs font-semibold hover:underline">Apply</Link>
                        <Link to={`/sign-in?tab=college&college=${col.id}`} className="text-xs text-text-secondary hover:text-text-primary hover:underline">College Login</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="bg-surface border border-border rounded-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">{user ? "College Programs & Seats" : "Programs & Available Seats"}</h2>
            <Link to="/programs" className="text-xs font-medium text-text-secondary hover:text-text-primary">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
              <thead className="bg-surface-subtle text-text-secondary border-b border-border text-xs">
                <tr>
                  {!user && <th className="py-2.5 px-5 font-medium">College</th>}
                  <th className="py-2.5 px-5 font-medium">Code</th>
                  <th className="py-2.5 px-5 font-medium">Program</th>
                  <th className="py-2.5 px-5 font-medium">Level</th>
                  <th className="py-2.5 px-5 font-medium text-right">Available / Total</th>
                  <th className="py-2.5 px-5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.programs.map((prog) => {
                  const total = prog.seatPools.reduce((s, p) => s + p.capacity, 0);
                  const used = prog.seatPools.reduce((s, p) => s + p.confirmedCount + p.heldCount, 0);
                  return (
                    <tr key={prog.id} className="hover:bg-surface-subtle">
                      {!user && <td className="py-3 px-5 text-xs text-text-secondary">{prog.institution?.name}</td>}
                      <td className="py-3 px-5 font-mono text-xs font-semibold">{prog.code}</td>
                      <td className="py-3 px-5 font-medium">{prog.name}</td>
                      <td className="py-3 px-5 text-text-secondary">{prog.degree}</td>
                      <td className="py-3 px-5 text-right tabular-nums">{Math.max(0, total - used)} / {total}</td>
                      <td className="py-3 px-5 text-right">
                        <Link to={user ? "/student/applications/new" : `/register?college=${prog.institutionId}`} className="text-xs font-semibold hover:underline">Apply</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
