import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, statusLabel } from "../api";
import { PageTitle } from "./DashboardPage";

type StudentRow = {
  id: string;
  admissionNo: string;
  fullName: string;
  status: string;
  grade: string | null;
  section: string | null;
  rollNo: number | null;
};

export function StudentsPage() {
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<StudentRow[]>("/v1/students")
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="text-clay">{error}</p>;

  return (
    <div>
      <PageTitle kicker="Student records" title="Directory" detail={rows ? `${rows.length} students` : ""} />
      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100/80 text-stone-600">
            <tr>
              <th className="px-4 py-3 font-medium">Admission no.</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((student) => (
              <tr key={student.id} className="border-t border-line">
                <td className="px-4 py-3">{student.admissionNo}</td>
                <td className="px-4 py-3">
                  <Link className="text-clay-deep underline-offset-2 hover:underline" to={`/students/${student.id}`}>
                    {student.fullName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {student.grade} {student.section}
                  {student.rollNo ? ` · ${student.rollNo}` : ""}
                </td>
                <td className="px-4 py-3">{statusLabel(student.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
