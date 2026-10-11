import { Fragment, useEffect, useState } from "react";
import { api, statusLabel } from "../api";
import { useAuth } from "../App";
import { PageTitle } from "./DashboardPage";

type SectionOption = { id: string; label: string };
type Period = { day: string; startTime: string; endTime: string; subject: string };

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const slots = [
  ["09:00", "09:40"],
  ["09:40", "10:20"],
  ["10:40", "11:20"],
  ["11:20", "12:00"],
  ["12:00", "12:40"],
] as const;

function key(day: string, start: string) {
  return `${day}|${start}`;
}

export function TimetablePage() {
  const { user } = useAuth();
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [label, setLabel] = useState("");
  const [cells, setCells] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const editable = user?.role === "ADMIN";

  useEffect(() => {
    api<SectionOption[]>("/v1/timetable/sections")
      .then((rows) => {
        setSections(rows);
        setSectionId((current) => current || rows[0]?.id || "");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    api<{ section: { id: string; label: string }; periods: Period[] }>(`/v1/timetable?sectionId=${sectionId}`)
      .then((data) => {
        setLabel(data.section.label);
        const next: Record<string, string> = {};
        for (const period of data.periods) {
          next[key(period.day, period.startTime)] = period.subject;
        }
        setCells(next);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [sectionId]);

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const periods = days.flatMap((day) =>
        slots.flatMap(([startTime, endTime]) => {
          const subject = cells[key(day, startTime)]?.trim() ?? "";
          return subject ? [{ day, startTime, endTime, subject }] : [];
        }),
      );
      const saved = await api<{ section: { label: string }; periods: Period[] }>("/v1/timetable", {
        method: "PUT",
        body: JSON.stringify({ sectionId, periods }),
      });
      setLabel(saved.section.label);
      setNotice("Timetable saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the timetable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle kicker="Weekly" title={label || "Timetable"} detail="Monday to Friday." />
      <div className="mt-6 flex flex-wrap gap-3">
        <select
          className="rounded-xl border border-line bg-card px-3 py-2"
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
        >
          {sections.length === 0 ? <option value="">No class</option> : null}
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
        {editable ? (
          <button className="rounded-xl bg-pine px-4 py-2 text-white disabled:opacity-60" disabled={busy || !sectionId} onClick={() => void save()} type="button">
            {busy ? "Saving…" : "Save timetable"}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-pine">{notice}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-stone-100/80 text-stone-600">
            <tr>
              <th className="px-3 py-3 font-medium">Time</th>
              {days.map((day) => (
                <th key={day} className="px-3 py-3 font-medium">
                  {statusLabel(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(([start, end], index) => (
              <Fragment key={start}>
                {index === 2 ? (
                  <tr className="border-t border-line bg-stone-50 text-stone-500">
                    <td className="px-3 py-2">10:20–10:40</td>
                    <td className="px-3 py-2" colSpan={5}>
                      Break
                    </td>
                  </tr>
                ) : null}
                <tr className="border-t border-line">
                  <td className="px-3 py-3 whitespace-nowrap">
                    {start}–{end}
                  </td>
                  {days.map((day) => (
                    <td key={day} className="px-3 py-3">
                      {editable ? (
                        <input
                          className="w-full rounded-lg border border-line bg-white px-2 py-1"
                          value={cells[key(day, start)] ?? ""}
                          onChange={(event) =>
                            setCells((current) => ({ ...current, [key(day, start)]: event.target.value }))
                          }
                          aria-label={`${statusLabel(day)} ${start}`}
                        />
                      ) : (
                        <span>{cells[key(day, start)] || "—"}</span>
                      )}
                    </td>
                  ))}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
