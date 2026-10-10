import { useEffect, useState } from "react";
import { api, statusLabel } from "../api";
import { PageTitle } from "./DashboardPage";

const statuses = ["PRESENT", "ABSENT", "LATE", "EARLY_LEAVE", "LEAVE"] as const;

type SectionOption = { id: string; label: string };
type Register = {
  section: { id: string; label: string; classTeacher: string | null };
  date: string;
  rows: { studentId: string; admissionNo: string; fullName: string; rollNo: number; status: string | null; remarks: string }[];
};

export function AttendancePage() {
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState("");
  const [register, setRegister] = useState<Register | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<SectionOption[]>("/v1/sections")
      .then((rows) => {
        setSections(rows);
        if (rows[0]) setSectionId(rows[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    const params = new URLSearchParams({ sectionId });
    if (date) params.set("date", date);
    api<Register>(`/v1/attendance/register?${params}`)
      .then((next) => {
        setRegister(next);
        setDate(next.date);
      })
      .catch((err: Error) => setError(err.message));
  }, [sectionId, date]);

  function updateRow(studentId: string, patch: Partial<Register["rows"][number]>) {
    setRegister((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) => (row.studentId === studentId ? { ...row, ...patch } : row)),
          }
        : current,
    );
  }

  async function save() {
    if (!register) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await api<Register>("/v1/attendance/register", {
        method: "PUT",
        body: JSON.stringify({
          sectionId: register.section.id,
          date: register.date,
          records: register.rows.map((row) => ({
            studentId: row.studentId,
            status: row.status ?? "PRESENT",
            remarks: row.remarks || undefined,
          })),
        }),
      });
      setRegister(saved);
      setNotice("Register saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle kicker="Daily register" title={register?.section.label ?? "Attendance"} detail={register?.section.classTeacher ?? ""} />
      <div className="mt-6 flex flex-wrap gap-3">
        <select className="rounded-xl border border-line bg-card px-3 py-2" value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
        <input className="rounded-xl border border-line bg-card px-3 py-2" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <button className="rounded-xl bg-pine px-4 py-2 text-white disabled:opacity-60" disabled={busy || !register} onClick={() => void save()} type="button">
          {busy ? "Saving…" : "Save register"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-pine">{notice}</p> : null}
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100/80 text-stone-600">
            <tr>
              <th className="px-4 py-3 font-medium">Roll</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {register?.rows.map((row) => (
              <tr key={row.studentId} className="border-t border-line">
                <td className="px-4 py-3">{row.rollNo}</td>
                <td className="px-4 py-3">
                  {row.fullName}
                  <span className="block text-stone-500">{row.admissionNo}</span>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-line bg-white px-2 py-1"
                    value={row.status ?? "PRESENT"}
                    onChange={(event) => updateRow(row.studentId, { status: event.target.value })}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    className="w-full rounded-lg border border-line px-2 py-1"
                    value={row.remarks}
                    onChange={(event) => updateRow(row.studentId, { remarks: event.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
