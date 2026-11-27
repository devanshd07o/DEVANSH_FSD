import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export function Navbar({ user, onLogout }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isStaff = user?.roles?.some((r) =>
    ["SUPER_ADMIN", "ADMISSIONS_OFFICER", "REVIEWER", "ACCOUNTS", "REGISTRAR"].includes(r)
  );
  const isCollegeAdmin = user?.roles?.some((r) =>
    ["SUPER_ADMIN", "ADMISSIONS_OFFICER"].includes(r)
  );

  async function handleLogout() {
    await api("/api/v1/auth/logout", { method: "POST" });
    await onLogout();
    navigate("/sign-in");
  }

  const navClass = (active) =>
    `px-3 py-2 text-xs font-medium rounded-control whitespace-nowrap min-h-[36px] inline-flex items-center ${
      active
        ? "bg-accent text-white"
        : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="font-bold text-sm sm:text-base text-text-primary tracking-tight truncate max-w-[240px] sm:max-w-sm">
          {user?.institutionName || "College Admission Portal"}
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/" className={navClass(pathname === "/")}>Home</Link>
          <Link to="/programs" className={navClass(pathname.startsWith("/programs"))}>Programs</Link>
          {!user && (
            <Link to="/register-college" className={navClass(pathname.startsWith("/register-college"))}>
              Register College
            </Link>
          )}
          {user && !isStaff && (
            <Link to="/student/dashboard" className={navClass(pathname.startsWith("/student"))}>
              Dashboard
            </Link>
          )}
          {isStaff && (
            <>
              <Link to="/scrutiny/queue" className={navClass(pathname.startsWith("/scrutiny"))}>
                Scrutiny
              </Link>
              {isCollegeAdmin && (
                <Link to="/admissions/overview" className={navClass(pathname.startsWith("/admissions"))}>
                  College Portal
                </Link>
              )}
              <Link to="/accounts/payments" className={navClass(pathname.startsWith("/accounts"))}>
                Accounts
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <span className="hidden sm:inline text-xs text-text-secondary max-w-[140px] truncate">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 min-h-[36px] text-xs font-medium border border-border rounded-control text-text-primary hover:bg-surface-subtle"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/sign-in"
                className="px-3 py-1.5 min-h-[36px] inline-flex items-center text-xs font-medium border border-border rounded-control text-text-primary hover:bg-surface-subtle"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 min-h-[36px] inline-flex items-center text-xs font-medium bg-accent text-white rounded-control hover:bg-accent-hover"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="md:hidden border-t border-border px-4 py-1.5 flex items-center gap-1 overflow-x-auto">
        <Link to="/" className={navClass(pathname === "/")}>Home</Link>
        <Link to="/programs" className={navClass(pathname.startsWith("/programs"))}>Programs</Link>
        {!user && (
          <Link to="/register-college" className={navClass(pathname.startsWith("/register-college"))}>
            Register College
          </Link>
        )}
        {user && !isStaff && (
          <Link to="/student/dashboard" className={navClass(pathname.startsWith("/student"))}>
            Dashboard
          </Link>
        )}
        {isStaff && (
          <>
            <Link to="/scrutiny/queue" className={navClass(pathname.startsWith("/scrutiny"))}>
              Scrutiny
            </Link>
            {isCollegeAdmin && (
              <Link to="/admissions/overview" className={navClass(pathname.startsWith("/admissions"))}>
                College Portal
              </Link>
            )}
            <Link to="/accounts/payments" className={navClass(pathname.startsWith("/accounts"))}>
              Accounts
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export function StudentHeader() {
  const { pathname } = useLocation();
  const links = [
    { label: "Dashboard", href: "/student/dashboard" },
    { label: "Applications", href: "/student/applications" },
    { label: "Offers", href: "/student/offers" },
    { label: "Payments", href: "/student/payments" },
    { label: "Admission Letter", href: "/student/admission" },
    { label: "Notifications", href: "/student/notifications" },
  ];

  return (
    <div className="border-b border-border bg-surface mb-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <nav className="flex overflow-x-auto gap-1 py-2">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-2 min-h-[40px] inline-flex items-center text-xs sm:text-sm font-medium rounded-control whitespace-nowrap ${
                  active
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

const staffGroups = [
  {
    group: "Scrutiny",
    items: [{ label: "Queue", href: "/scrutiny/queue" }],
  },
  {
    group: "College Portal",
    items: [
      { label: "Overview", href: "/admissions/overview" },
      { label: "Seat Matrix", href: "/admissions/seat-matrix" },
      { label: "Merit List", href: "/admissions/merit" },
      { label: "Seat Allotment", href: "/admissions/rounds" },
      { label: "Staff", href: "/admissions/staff" },
    ],
  },
  {
    group: "Accounts & Registrar",
    items: [
      { label: "Payments", href: "/accounts/payments" },
      { label: "Enrollments", href: "/accounts/enrollments" },
    ],
  },
  {
    group: "System",
    items: [{ label: "Audit Log", href: "/admin/audit" }],
  },
];

export function StaffSidebar() {
  const { pathname } = useLocation();
  const flatItems = staffGroups.flatMap((g) => g.items);

  return (
    <>
      <div className="lg:hidden border-b border-border bg-surface px-4 py-2 overflow-x-auto flex gap-1.5">
        {flatItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`px-3 py-1.5 min-h-[36px] inline-flex items-center text-xs font-medium rounded-control whitespace-nowrap ${
                active
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <aside className="w-56 border-r border-border bg-surface shrink-0 hidden lg:block min-h-[calc(100vh-56px)] p-4">
        <div className="space-y-5">
          {staffGroups.map((g) => (
            <div key={g.group}>
              <div className="px-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                {g.group}
              </div>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`block px-2.5 py-2 text-xs font-medium rounded-control ${
                        active
                          ? "bg-accent text-white"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
