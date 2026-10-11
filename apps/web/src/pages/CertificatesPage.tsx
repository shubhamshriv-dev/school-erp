import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../App";
import { PageTitle } from "./DashboardPage";

type StudentOption = {
  id: string;
  fullName: string;
  admissionNo: string;
  grade: string;
  section: string;
};

type Certificate = {
  id: string;
  certificateNo: string;
  purpose: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  grade: string;
  section: string;
  academicYear: string;
  campus: string;
  issuedOn: string;
  issuedBy: string;
};

export function CertificatesPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [studentId, setStudentId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ students: StudentOption[]; certificates: Certificate[] }>("/v1/certificates")
      .then((data) => {
        setStudents(data.students);
        setCertificates(data.certificates);
        setStudentId((current) => current || data.students[0]?.id || "");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!id) {
      setCertificate(null);
      return;
    }
    api<Certificate>(`/v1/certificates/${id}`)
      .then((next) => {
        setCertificate(next);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  async function issue(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await api<Certificate>("/v1/certificates", {
        method: "POST",
        body: JSON.stringify({ studentId, purpose }),
      });
      setPurpose("");
      setCertificates((current) => [created, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue the certificate");
    } finally {
      setBusy(false);
    }
  }

  if (id && certificate) {
    return (
      <div>
        <PageTitle kicker={certificate.certificateNo} title="Bonafide certificate" detail={certificate.issuedOn} />
        <article className="mt-6 max-w-2xl rounded-2xl border border-line bg-card p-8">
          <p className="text-sm tracking-[0.16em] text-clay uppercase">{certificate.campus}</p>
          <h2 className="mt-4 text-center text-3xl">To whom it may concern</h2>
          <p className="mt-6 text-lg leading-8">
            This is to certify that <strong>{certificate.studentName}</strong>, admission number{" "}
            <strong>{certificate.admissionNo}</strong>, is a bonafide student of {certificate.grade}{" "}
            {certificate.section} for the academic year {certificate.academicYear}.
          </p>
          <p className="mt-4 text-lg leading-8">This certificate is issued for {certificate.purpose}.</p>
          <p className="mt-8 text-sm text-stone-500">
            Issued on {certificate.issuedOn} by {certificate.issuedBy}.
          </p>
        </article>
        <Link className="mt-4 inline-block text-sm text-clay" to="/certificates">
          All certificates
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageTitle kicker="Office" title="Certificates" detail="Bonafide certificate for one student." />
      {user?.role === "ADMIN" ? (
        <form className="mt-6 rounded-2xl border border-line bg-card p-5" onSubmit={(event) => void issue(event)}>
          <h2 className="text-2xl">Issue bonafide</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <select
              className="rounded-xl border border-line bg-white px-3 py-2"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName} · {student.grade} {student.section}
                </option>
              ))}
            </select>
            <input
              className="min-w-64 flex-1 rounded-xl border border-line bg-white px-3 py-2"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Purpose, such as a passport application"
            />
            <button className="rounded-xl bg-pine px-4 py-2 text-white disabled:opacity-60" disabled={busy} type="submit">
              {busy ? "Issuing…" : "Issue certificate"}
            </button>
          </div>
        </form>
      ) : null}
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      <div className="mt-6 space-y-3">
        {certificates.length === 0 ? <p className="text-sm text-stone-500">No certificates yet.</p> : null}
        {certificates.map((item) => (
          <Link key={item.id} className="block rounded-2xl border border-line bg-card p-5" to={`/certificates/${item.id}`}>
            <p className="text-sm text-clay">{item.certificateNo}</p>
            <h2 className="mt-1 text-2xl">{item.studentName}</h2>
            <p className="mt-1 text-sm text-stone-600">
              {item.grade} {item.section} · {item.purpose}
            </p>
            <p className="mt-2 text-sm text-stone-500">{item.issuedOn}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
