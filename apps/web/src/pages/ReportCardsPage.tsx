import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, statusLabel } from "../api";
import { PageTitle } from "./DashboardPage";

type StudentOption = {
  id: string;
  fullName: string;
  admissionNo: string;
  grade: string;
  section: string;
  rollNo: number;
};

type ExamOption = { id: string; name: string; status: string };

type Card = {
  student: StudentOption;
  academicYear: string;
  exam: { id: string; name: string; status: string };
  subjects: { subjectId: string; name: string; maxMarks: number; marks: number | null }[];
  total: number;
  maxTotal: number;
  percentage: number | null;
  complete: boolean;
};

export function ReportCardsPage() {
  const { studentId: routeStudentId } = useParams();
  const [params, setParams] = useSearchParams();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [studentId, setStudentId] = useState(routeStudentId ?? "");
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState("");

  const examId = params.get("examId") ?? "";

  useEffect(() => {
    api<{ students: StudentOption[]; exams: ExamOption[] }>("/v1/report-cards")
      .then((data) => {
        setStudents(data.students);
        setExams(data.exams);
        setStudentId((current) => current || routeStudentId || data.students[0]?.id || "");
        if (!params.get("examId") && data.exams[0]) {
          setParams({ examId: data.exams[0].id }, { replace: true });
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [routeStudentId]);

  useEffect(() => {
    if (routeStudentId) setStudentId(routeStudentId);
  }, [routeStudentId]);

  useEffect(() => {
    if (!studentId || !examId) return;
    api<Card>(`/v1/report-cards/${studentId}?examId=${examId}`)
      .then((next) => {
        setCard(next);
        setError("");
      })
      .catch((err: Error) => {
        setCard(null);
        setError(err.message);
      });
  }, [studentId, examId]);

  return (
    <div>
      <PageTitle kicker="CBSE" title="Report card" detail={card ? `${card.academicYear} · ${card.exam.name}` : ""} />
      <div className="mt-6 flex flex-wrap gap-3">
        <select
          className="rounded-xl border border-line bg-card px-3 py-2"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.fullName} · {student.grade} {student.section}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-line bg-card px-3 py-2"
          value={examId}
          onChange={(event) => setParams({ examId: event.target.value })}
        >
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name} · {statusLabel(exam.status)}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      {card ? (
        <article className="mt-6 max-w-2xl rounded-2xl border border-line bg-card p-6">
          <p className="text-sm text-clay">Riverside Public School, Pune</p>
          <h2 className="mt-2 text-3xl">{card.student.fullName}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {card.student.admissionNo} · {card.student.grade} {card.student.section} · roll {card.student.rollNo}
          </p>
          {card.subjects.length === 0 ? <p className="mt-5 text-sm text-stone-500">This exam has no subjects for this class.</p> : null}
          <table className="mt-5 w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                <th className="py-2 font-medium">Subject</th>
                <th className="py-2 font-medium">Marks</th>
                <th className="py-2 font-medium">Out of</th>
              </tr>
            </thead>
            <tbody>
              {card.subjects.map((subject) => (
                <tr key={subject.subjectId} className="border-t border-line">
                  <td className="py-2">{subject.name}</td>
                  <td className="py-2">{subject.marks ?? "—"}</td>
                  <td className="py-2">{subject.maxMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap gap-6 border-t border-line pt-4">
            <p>
              <span className="block text-sm text-stone-500">Total</span>
              <span className="text-2xl">
                {card.total}/{card.maxTotal}
              </span>
            </p>
            <p>
              <span className="block text-sm text-stone-500">Percentage</span>
              <span className="text-2xl">{card.percentage === null ? "—" : `${card.percentage}%`}</span>
            </p>
          </div>
          {card.complete ? null : <p className="mt-3 text-sm text-stone-500">Some subjects still have no marks.</p>}
        </article>
      ) : null}
    </div>
  );
}
