import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr, statusLabel } from "../api";

type StaffHome = {
  role: "ADMIN" | "TEACHER";
  campusName: string;
  today: string;
  strength: number;
  markedToday: number;
  unmarkedToday: number;
  outstanding: number;
  sections: { id: string; label: string; strength: number; marked: number }[];
};

type ParentHome = {
  role: "PARENT";
  campusName: string;
  today: string;
  children: {
    id: string;
    fullName: string;
    grade: string | null;
    section: string | null;
    todayStatus: string;
    balance: number;
  }[];
};

export function DashboardPage() {
  const [data, setData] = useState<StaffHome | ParentHome | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<StaffHome | ParentHome>("/v1/dashboard")
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="text-clay">{error}</p>;
  if (!data) return <p className="text-stone-500">Loading the day…</p>;

  if (data.role === "PARENT") {
    return (
      <div>
        <PageTitle kicker={data.campusName} title="Your children" detail={data.today} />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {data.children.map((child) => (
            <Link key={child.id} to={`/students/${child.id}`} className="rounded-2xl border border-line bg-card p-5">
              <p className="display text-3xl">{child.fullName}</p>
              <p className="mt-1 text-stone-600">
                {child.grade} {child.section}
              </p>
              <div className="mt-5 flex justify-between text-sm">
                <span>Today</span>
                <span>{statusLabel(child.todayStatus)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span>Fees due</span>
                <span>{inr(child.balance)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle kicker={data.campusName} title={data.role === "ADMIN" ? "Campus today" : "Your class today"} detail={data.today} />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Students" value={String(data.strength)} />
        <Stat label="Attendance still open" value={String(data.unmarkedToday)} />
        {data.role === "ADMIN" ? <Stat label="Fees still due" value={inr(data.outstanding)} /> : <Stat label="Marked today" value={String(data.markedToday)} />}
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100/80 text-stone-600">
            <tr>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Strength</th>
              <th className="px-4 py-3 font-medium">Marked today</th>
            </tr>
          </thead>
          <tbody>
            {data.sections.map((section) => (
              <tr key={section.id} className="border-t border-line">
                <td className="px-4 py-3">{section.label}</td>
                <td className="px-4 py-3">{section.strength}</td>
                <td className="px-4 py-3">
                  {section.marked} / {section.strength}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PageTitle({ kicker, title, detail }: { kicker: string; title: string; detail?: string }) {
  return (
    <div>
      <p className="text-sm text-clay">{kicker}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl">{title}</h1>
        {detail ? <p className="text-sm text-stone-500">{detail}</p> : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="display mt-2 text-3xl">{value}</p>
    </div>
  );
}
