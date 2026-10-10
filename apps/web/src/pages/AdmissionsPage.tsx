import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, statusLabel } from "../api";
import { PageTitle } from "./DashboardPage";

type GradeOption = {
  id: string;
  name: string;
  sections: { id: string; name: string; seatsLeft: number }[];
};

type Enquiry = {
  id: string;
  childName: string;
  dateOfBirth: string;
  parentName: string;
  parentMobile: string;
  parentEmail: string | null;
  source: string;
  remarks: string | null;
  status: string;
  gradeId: string;
  grade: string;
  studentId: string | null;
  admissionNo: string | null;
};

type EnrolResult = {
  studentId: string;
  admissionNo: string;
  rollNo: number;
  section: string;
  invoiceNo: string;
  portalEmail: string | null;
  portalPassword: string | null;
};

const actions: Record<string, { status: string; label: string }[]> = {
  NEW: [
    { status: "CONTACTED", label: "Mark contacted" },
    { status: "REJECTED", label: "Reject" },
    { status: "WITHDRAWN", label: "Withdraw" },
  ],
  CONTACTED: [
    { status: "APPLIED", label: "Application received" },
    { status: "REJECTED", label: "Reject" },
    { status: "WITHDRAWN", label: "Withdraw" },
  ],
  APPLIED: [
    { status: "OFFERED", label: "Offer a seat" },
    { status: "REJECTED", label: "Reject" },
    { status: "WITHDRAWN", label: "Withdraw" },
  ],
  OFFERED: [{ status: "WITHDRAWN", label: "Withdraw" }],
};

const emptyForm = {
  childName: "",
  dateOfBirth: "",
  gender: "",
  gradeId: "",
  parentName: "",
  parentMobile: "",
  parentEmail: "",
  source: "WALK_IN",
  remarks: "",
  consent: false,
};

export function AdmissionsPage() {
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [rows, setRows] = useState<Enquiry[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [sectionById, setSectionById] = useState<Record<string, string>>({});
  const [enrolResult, setEnrolResult] = useState<EnrolResult | null>(null);

  function load() {
    api<Enquiry[]>("/v1/admissions")
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    api<{ grades: GradeOption[] }>("/v1/admissions/options")
      .then((options) => {
        setGrades(options.grades);
        if (options.grades[0]) {
          setForm((current) => ({ ...current, gradeId: options.grades[0].id }));
        }
      })
      .catch((err: Error) => setError(err.message));
    load();
  }, []);

  async function createEnquiry(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/v1/admissions", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          gender: form.gender || undefined,
          remarks: form.remarks || undefined,
          parentEmail: form.parentEmail || "",
        }),
      });
      setOpen(false);
      setForm((current) => ({ ...emptyForm, gradeId: current.gradeId }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the enquiry");
    }
  }

  async function move(id: string, status: string) {
    setError("");
    try {
      await api(`/v1/admissions/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the enquiry");
    }
  }

  async function enrol(enquiry: Enquiry) {
    const sectionId = sectionById[enquiry.id];
    if (!sectionId) {
      setError("Choose a section before enrolment");
      return;
    }
    setError("");
    try {
      const result = await api<EnrolResult>(`/v1/admissions/${enquiry.id}/enrol`, {
        method: "POST",
        body: JSON.stringify({ sectionId }),
      });
      setEnrolResult(result);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enrol");
    }
  }

  return (
    <div>
      <PageTitle kicker="Admissions" title="Enquiries" detail={rows ? `${rows.length} open and closed` : ""} />
      <button className="mt-4 rounded-xl bg-clay px-4 py-2 text-white" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Close form" : "New enquiry"}
      </button>
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      {enrolResult ? (
        <div className="mt-4 rounded-2xl border border-pine/30 bg-card p-4 text-sm">
          <p className="font-medium">
            Enrolled {enrolResult.admissionNo} in {enrolResult.section}. Invoice {enrolResult.invoiceNo}.
          </p>
          {enrolResult.portalPassword ? (
            <p className="mt-2">
              Parent login {enrolResult.portalEmail} / {enrolResult.portalPassword}. Share this once. It is not shown again.
            </p>
          ) : null}
          <Link className="mt-2 inline-block text-clay" to={`/students/${enrolResult.studentId}`}>
            Open the student record
          </Link>
        </div>
      ) : null}
      {open ? (
        <form className="mt-4 grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-2" onSubmit={(event) => void createEnquiry(event)}>
          <Field label="Child name" value={form.childName} onChange={(value) => setForm({ ...form, childName: value })} />
          <label className="text-sm">
            Date of birth
            <input className="mt-1 w-full rounded-lg border border-line px-2 py-2" type="date" required value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
          </label>
          <Field label="Gender" value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} />
          <label className="text-sm">
            Grade
            <select className="mt-1 w-full rounded-lg border border-line px-2 py-2" value={form.gradeId} onChange={(event) => setForm({ ...form, gradeId: event.target.value })}>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="Parent name" value={form.parentName} onChange={(value) => setForm({ ...form, parentName: value })} />
          <Field label="Parent mobile" value={form.parentMobile} onChange={(value) => setForm({ ...form, parentMobile: value })} />
          <Field label="Parent email" value={form.parentEmail} onChange={(value) => setForm({ ...form, parentEmail: value })} />
          <label className="text-sm">
            Source
            <select className="mt-1 w-full rounded-lg border border-line px-2 py-2" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>
              <option value="WALK_IN">Walk-in</option>
              <option value="WEB">Web</option>
              <option value="REFERRAL">Referral</option>
              <option value="AD">Ad</option>
              <option value="EVENT">Event</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            Remarks
            <input className="mt-1 w-full rounded-lg border border-line px-2 py-2" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} />
            Parent consented to be contacted
          </label>
          <button className="rounded-xl bg-pine px-4 py-2 text-white disabled:opacity-50 md:col-span-2" disabled={!form.consent} type="submit">
            Save enquiry
          </button>
        </form>
      ) : null}
      <div className="mt-6 space-y-3">
        {rows?.map((enquiry) => {
          const sections = grades.find((grade) => grade.id === enquiry.gradeId)?.sections ?? [];
          return (
            <article key={enquiry.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {enquiry.childName} · {enquiry.grade}
                  </p>
                  <p className="text-sm text-stone-500">
                    {enquiry.parentName} · {enquiry.parentMobile}
                    {enquiry.parentEmail ? ` · ${enquiry.parentEmail}` : ""} · {statusLabel(enquiry.source)}
                  </p>
                  {enquiry.remarks ? <p className="mt-1 text-sm">{enquiry.remarks}</p> : null}
                </div>
                <p className="text-sm">{statusLabel(enquiry.status)}</p>
              </div>
              {enquiry.admissionNo ? (
                <Link className="mt-3 inline-block text-sm text-clay" to={`/students/${enquiry.studentId}`}>
                  Student {enquiry.admissionNo}
                </Link>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(actions[enquiry.status] ?? []).map((action) => (
                    <button key={action.status} className="rounded-full border border-line px-3 py-1 text-sm" type="button" onClick={() => void move(enquiry.id, action.status)}>
                      {action.label}
                    </button>
                  ))}
                  {enquiry.status === "OFFERED" ? (
                    <>
                      <select
                        className="rounded-lg border border-line px-2 py-1 text-sm"
                        value={sectionById[enquiry.id] ?? ""}
                        onChange={(event) => setSectionById({ ...sectionById, [enquiry.id]: event.target.value })}
                      >
                        <option value="">Section</option>
                        {sections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.name} · {section.seatsLeft} seats
                          </option>
                        ))}
                      </select>
                      <button className="rounded-full bg-clay px-3 py-1 text-sm text-white" type="button" onClick={() => void enrol(enquiry)}>
                        Enrol
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      {label}
      <input className="mt-1 w-full rounded-lg border border-line px-2 py-2" required={label !== "Gender" && label !== "Parent email" && label !== "Remarks"} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
