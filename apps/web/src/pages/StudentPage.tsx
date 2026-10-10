import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, inr, statusLabel } from "../api";
import { PageTitle } from "./DashboardPage";

type Profile = {
  id: string;
  admissionNo: string;
  fullName: string;
  dateOfBirth: string;
  gender: string | null;
  status: string;
  campus: string;
  grade: string | null;
  section: string | null;
  rollNo: number | null;
  academicYear: string | null;
  guardians: { name: string; relation: string; mobile: string; email: string | null; isPrimary: boolean; hasPortal: boolean }[];
  attendance: { date: string; status: string; remarks: string | null }[];
  invoices: { id: string; invoiceNo: string; planName: string; amount: number; paid: number; balance: number; dueDate: string; status: string }[];
};

export function StudentPage() {
  const { id } = useParams();
  const [student, setStudent] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api<Profile>(`/v1/students/${id}`)
      .then(setStudent)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) return <p className="text-clay">{error}</p>;
  if (!student) return <p className="text-stone-500">Loading student…</p>;

  return (
    <div>
      <PageTitle
        kicker={student.admissionNo}
        title={student.fullName}
        detail={`${student.grade ?? ""} ${student.section ?? ""} · roll ${student.rollNo ?? "—"}`}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="text-2xl">Record</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Field label="Campus" value={student.campus} />
            <Field label="Year" value={student.academicYear ?? "—"} />
            <Field label="Date of birth" value={student.dateOfBirth} />
            <Field label="Status" value={statusLabel(student.status)} />
          </dl>
          <h2 className="mt-6 text-2xl">Guardians</h2>
          <ul className="mt-3 space-y-3">
            {student.guardians.map((guardian) => (
              <li key={guardian.mobile + guardian.name}>
                <p className="font-medium">
                  {guardian.name} · {guardian.relation}
                  {guardian.isPrimary ? " · primary" : ""}
                </p>
                <p className="text-sm text-stone-600">
                  {guardian.mobile}
                  {guardian.hasPortal ? " · portal access" : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="text-2xl">Recent attendance</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {student.attendance.length === 0 ? <li className="text-stone-500">No attendance yet.</li> : null}
            {student.attendance.map((row) => (
              <li key={row.date} className="flex justify-between border-b border-line py-2">
                <span>{row.date}</span>
                <span>
                  {statusLabel(row.status)}
                  {row.remarks ? ` · ${row.remarks}` : ""}
                </span>
              </li>
            ))}
          </ul>
          {student.invoices.length > 0 ? (
            <>
              <h2 className="mt-6 text-2xl">Fees</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {student.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex justify-between border-b border-line py-2">
                    <span>
                      {invoice.invoiceNo}
                      <span className="block text-stone-500">{invoice.planName}</span>
                    </span>
                    <span>{inr(invoice.balance)} due</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
