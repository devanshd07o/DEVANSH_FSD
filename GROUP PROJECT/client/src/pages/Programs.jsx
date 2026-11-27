import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Navbar } from "../components/Layout";
import { api } from "../lib/api";

export default function ProgramsPage({ user, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const college = searchParams.get("college") || "";
  const [data, setData] = useState({ colleges: [], programs: [] });

  useEffect(() => {
    const q = !user && college ? `?college=${college}` : "";
    api(`/api/v1/colleges${q}`).then(setData).catch(() => {});
  }, [user?.institutionId, college]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={onLogout} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{user ? `${user.institutionName} — Programs` : "Programs & Seats"}</h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">Session 2026–27 intake and category quota breakdown.</p>
          </div>
          <Link to="/" className="text-xs font-medium text-text-secondary hover:text-text-primary">Back to Home</Link>
        </div>

        {!user && data.colleges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSearchParams({})}
              className={`px-3 py-1.5 text-xs font-medium rounded-control border ${!college ? "bg-accent text-white border-accent" : "bg-surface text-text-secondary border-border"}`}
            >
              All Colleges
            </button>
            {data.colleges.map((c) => (
              <button
                key={c.id}
                onClick={() => setSearchParams({ college: c.id })}
                className={`px-3 py-1.5 text-xs font-medium rounded-control border ${college === c.id ? "bg-accent text-white border-accent" : "bg-surface text-text-secondary border-border"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {data.programs.map((prog) => {
            const totalCap = prog.seatPools.reduce((sum, p) => sum + p.capacity, 0);
            return (
              <div key={prog.id} className="bg-surface rounded-card border border-border p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <div className="text-xs font-mono text-text-muted">{prog.institution?.name} • {prog.code} • {prog.degree}</div>
                    <h2 className="text-base font-bold mt-0.5">{prog.name}</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-text-secondary tabular-nums">Intake: <strong className="text-text-primary">{totalCap}</strong></span>
                    <Link
                      to={user ? "/student/applications/new" : `/register?college=${prog.institutionId}`}
                      className="px-3.5 py-2 min-h-[36px] inline-flex items-center text-xs font-medium bg-accent text-white rounded-control hover:bg-accent-hover"
                    >
                      Apply
                    </Link>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {prog.seatPools.map((pool) => {
                    const avail = Math.max(0, pool.capacity - (pool.heldCount + pool.confirmedCount));
                    return (
                      <div key={pool.id} className="bg-surface-subtle p-3 rounded-control border border-border text-xs">
                        <div className="font-semibold">{pool.category.code}</div>
                        <div className="mt-1 tabular-nums text-text-secondary">{avail} / {pool.capacity} open</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
