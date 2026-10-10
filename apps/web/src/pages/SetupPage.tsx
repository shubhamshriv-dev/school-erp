import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { api } from "../api";
import { PageTitle } from "./DashboardPage";

type Setup = {
  tenant: { name: string };
  legalEntity: { name: string };
  campus: { name: string; code: string; board: string; city: string; pin: string; status: string };
  academicYear: {
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    grades: {
      id: string;
      name: string;
      sections: { id: string; name: string; capacity: number; strength: number; classTeacher: string | null }[];
    }[];
  } | null;
};

export function SetupPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Setup | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    api<Setup>("/v1/setup")
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [user]);

  if (user?.role !== "ADMIN") return <p>Setup is for the school office.</p>;
  if (error) return <p className="text-clay">{error}</p>;
  if (!data?.academicYear) return <p className="text-stone-500">Loading setup…</p>;

  return (
    <div>
      <PageTitle kicker={data.tenant.name} title={data.campus.name} detail={`${data.campus.board} · ${data.campus.city} ${data.campus.pin}`} />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Info label="Legal entity" value={data.legalEntity.name} />
        <Info label="Campus code" value={data.campus.code} />
        <Info label="Academic year" value={`${data.academicYear.name} · ${data.academicYear.status}`} />
      </div>
      <div className="mt-6 grid gap-4">
        {data.academicYear.grades.map((grade) => (
          <section key={grade.id} className="rounded-2xl border border-line bg-card p-5">
            <h2 className="text-2xl">{grade.name}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {grade.sections.map((section) => (
                <div key={section.id} className="rounded-xl bg-paper px-4 py-3">
                  <p className="font-medium">Section {section.name}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {section.strength} / {section.capacity} seats
                  </p>
                  <p className="text-sm text-stone-600">{section.classTeacher ?? "Class teacher not assigned"}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}
