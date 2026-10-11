import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, statusLabel } from "../api";
import { useAuth } from "../App";
import { PageTitle } from "./DashboardPage";

type Exam = {
  id: string;
  name: string;
  status: string;
  grades: { id: string; name: string; subjects: { id: string; name: string; maxMarks: number }[] }[];
};

type SectionOption = { id: string; label: string; gradeName: string };

type Sheet = {
  exam: { id: string; name: string; status: string };
  section: { id: string; label: string };
  subjects: { id: string; name: string; maxMarks: number }[];
  rows: {
    studentId: string;
    admissionNo: string;
    fullName: string;
    rollNo: number;
    marks: Record<string, number | null>;
  }[];
};

const starterSubjects = [
  { name: "English", maxMarks: "100" },
  { name: "Hindi", maxMarks: "100" },
  { name: "Mathematics", maxMarks: "100" },
  { name: "Environmental Studies", maxMarks: "100" },
];

export function ExamsPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [examId, setExamId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [name, setName] = useState("Term 1");
  const [gradeId, setGradeId] = useState("");
  const [subjects, setSubjects] = useState(starterSubjects);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = exams.find((exam) => exam.id === examId) ?? null;
  const sectionChoices = sections.filter((section) =>
    selected?.grades.some((grade) => grade.name === section.gradeName),
  );

  async function loadExams() {
    const data = await api<{ grades: { id: string; name: string }[]; exams: Exam[] }>("/v1/exams");
    setGrades(data.grades);
    setExams(data.exams);
    setGradeId((current) => current || data.grades[0]?.id || "");
    setExamId((current) => current || data.exams[0]?.id || "");
  }

  useEffect(() => {
    loadExams().catch((err: Error) => setError(err.message));
    api<SectionOption[]>("/v1/sections")
      .then(setSections)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!sectionChoices.some((section) => section.id === sectionId)) {
      setSectionId(sectionChoices[0]?.id ?? "");
    }
  }, [examId, sections, exams]);

  useEffect(() => {
    if (!examId || !sectionId) {
      setSheet(null);
      return;
    }
    api<Sheet>(`/v1/exams/${examId}/marks?sectionId=${sectionId}`)
      .then(setSheet)
      .catch((err: Error) => setError(err.message));
  }, [examId, sectionId]);

  async function createExam(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await api<Exam>("/v1/exams", {
        method: "POST",
        body: JSON.stringify({
          name,
          gradeId,
          subjects: subjects
            .filter((subject) => subject.name.trim())
            .map((subject) => ({ name: subject.name.trim(), maxMarks: Number(subject.maxMarks) })),
        }),
      });
      await loadExams();
      setExamId(created.id);
      setNotice(`${created.name} is ready for marks.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the exam");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!examId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/v1/exams/${examId}/publish`, { method: "POST" });
      await loadExams();
      setNotice("Report cards are published for parents.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  function setMark(studentId: string, subjectId: string, value: string) {
    setSheet((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) =>
              row.studentId === studentId
                ? { ...row, marks: { ...row.marks, [subjectId]: value === "" ? null : Number(value) } }
                : row,
            ),
          }
        : current,
    );
  }

  async function saveMarks() {
    if (!sheet) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const records = sheet.rows.flatMap((row) =>
        sheet.subjects.map((subject) => ({
          studentId: row.studentId,
          subjectId: subject.id,
          marks: row.marks[subject.id] ?? null,
        })),
      );
      const saved = await api<Sheet>(`/v1/exams/${sheet.exam.id}/marks`, {
        method: "PUT",
        body: JSON.stringify({ sectionId: sheet.section.id, records }),
      });
      setSheet(saved);
      setNotice("Marks saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save marks");
    } finally {
      setBusy(false);
    }
  }

  const locked = sheet?.exam.status === "PUBLISHED";

  if (user?.role === "PARENT") {
    return <Navigate to="/report-cards" replace />;
  }

  return (
    <div>
      <PageTitle kicker="CBSE" title="Exams" detail="Enter marks, then publish the report cards." />
      {user?.role === "ADMIN" ? (
        <form className="mt-6 rounded-2xl border border-line bg-card p-5" onSubmit={(event) => void createExam(event)}>
          <h2 className="text-2xl">New exam</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              className="rounded-xl border border-line bg-white px-3 py-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Term 1"
            />
            <select
              className="rounded-xl border border-line bg-white px-3 py-2"
              value={gradeId}
              onChange={(event) => setGradeId(event.target.value)}
            >
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 space-y-2">
            {subjects.map((subject, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2"
                  value={subject.name}
                  onChange={(event) =>
                    setSubjects((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, name: event.target.value } : row)))
                  }
                  placeholder="Subject"
                />
                <input
                  className="w-28 rounded-xl border border-line bg-white px-3 py-2"
                  inputMode="numeric"
                  value={subject.maxMarks}
                  onChange={(event) =>
                    setSubjects((rows) =>
                      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, maxMarks: event.target.value } : row)),
                    )
                  }
                  aria-label="Maximum marks"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              className="text-sm text-clay"
              type="button"
              onClick={() => setSubjects((rows) => [...rows, { name: "", maxMarks: "100" }])}
            >
              Add subject
            </button>
            <button className="rounded-xl bg-pine px-4 py-2 text-white disabled:opacity-60" disabled={busy} type="submit">
              {busy ? "Saving…" : "Save exam"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select className="rounded-xl border border-line bg-card px-3 py-2" value={examId} onChange={(event) => setExamId(event.target.value)}>
          {exams.length === 0 ? <option value="">No exams yet</option> : null}
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name} · {statusLabel(exam.status)}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-line bg-card px-3 py-2"
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
        >
          {sectionChoices.length === 0 ? <option value="">No class</option> : null}
          {sectionChoices.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
        {user?.role === "ADMIN" && selected?.status === "DRAFT" ? (
          <button className="rounded-xl border border-line bg-card px-4 py-2" disabled={busy} onClick={() => void publish()} type="button">
            Publish report cards
          </button>
        ) : null}
      </div>
      {selected ? (
        <p className="mt-3 text-sm text-stone-500">
          {selected.grades.map((grade) => `${grade.name}: ${grade.subjects.map((subject) => subject.name).join(", ")}`).join(" · ")}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-pine">{notice}</p> : null}

      {sheet && sheet.rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100/80 text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Roll</th>
                <th className="px-4 py-3 font-medium">Student</th>
                {sheet.subjects.map((subject) => (
                  <th key={subject.id} className="px-4 py-3 font-medium">
                    {subject.name}
                    <span className="block font-normal text-stone-400">/{subject.maxMarks}</span>
                  </th>
                ))}
                <th className="px-4 py-3 font-medium">Card</th>
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row) => (
                <tr key={row.studentId} className="border-t border-line">
                  <td className="px-4 py-3">{row.rollNo}</td>
                  <td className="px-4 py-3">
                    {row.fullName}
                    <span className="block text-stone-500">{row.admissionNo}</span>
                  </td>
                  {sheet.subjects.map((subject) => (
                    <td key={subject.id} className="px-4 py-3">
                      <input
                        className="w-20 rounded-lg border border-line bg-white px-2 py-1"
                        inputMode="numeric"
                        disabled={locked}
                        value={row.marks[subject.id] ?? ""}
                        onChange={(event) => setMark(row.studentId, subject.id, event.target.value)}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <Link className="text-clay" to={`/report-cards/${row.studentId}?examId=${sheet.exam.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-stone-500">Choose an exam and a class to enter marks.</p>
      )}
      {sheet && sheet.rows.length > 0 ? (
        <button
          className="mt-4 rounded-xl bg-pine px-4 py-2 text-white disabled:opacity-60"
          disabled={busy || locked}
          onClick={() => void saveMarks()}
          type="button"
        >
          {locked ? "Published" : busy ? "Saving…" : "Save marks"}
        </button>
      ) : null}
    </div>
  );
}
