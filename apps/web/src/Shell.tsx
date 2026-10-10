import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./App";

const links = [
  { to: "/", label: "Home", roles: ["ADMIN", "TEACHER", "PARENT"] },
  { to: "/setup", label: "Setup", roles: ["ADMIN"] },
  { to: "/students", label: "Students", roles: ["ADMIN", "TEACHER", "PARENT"] },
  { to: "/attendance", label: "Attendance", roles: ["ADMIN", "TEACHER"] },
  { to: "/fees", label: "Fees", roles: ["ADMIN", "PARENT"] },
];

export function Shell() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col bg-sidebar text-sidebar-ink md:min-h-screen">
        <div className="px-5 pt-6 pb-4">
          <p className="text-xs tracking-[0.18em] text-amber-200/80 uppercase">School ERP</p>
          <p className="display mt-2 text-2xl leading-none text-white">Riverside</p>
          <p className="mt-1 text-sm text-stone-300">Public School, Pune</p>
        </div>
        <nav className="flex gap-2 overflow-auto px-3 pb-4 md:flex-col">
          {links
            .filter((link) => link.roles.includes(user.role))
            .map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 text-sm whitespace-nowrap md:rounded-lg ${
                    isActive ? "bg-white/12 text-white" : "text-stone-300 hover:bg-white/8 hover:text-white"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 px-5 py-4 md:block">
          <p className="text-sm text-white">{user.name}</p>
          <p className="text-xs text-stone-400">{user.role.toLowerCase()}</p>
          <button className="mt-3 text-sm text-amber-200" onClick={() => void logout()} type="button">
            Sign out
          </button>
        </div>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b border-line px-5 py-3 md:hidden">
          <p className="text-sm">{user.name}</p>
          <button className="text-sm text-clay" onClick={() => void logout()} type="button">
            Sign out
          </button>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
