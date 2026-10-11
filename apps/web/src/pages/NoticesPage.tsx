import { FormEvent, useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../App";
import { PageTitle } from "./DashboardPage";

type Notice = {
  id: string;
  title: string;
  body: string;
  audience: "SCHOOL" | "GRADE";
  grade: string | null;
  postedBy: string;
  createdAt: string;
};

function postedOn(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function NoticesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"SCHOOL" | "GRADE">("SCHOOL");
  const [gradeId, setGradeId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api<{ grades: { id: string; name: string }[]; notices: Notice[] }>("/v1/notices");
    setGrades(data.grades);
    setNotices(data.notices);
    setGradeId((current) => current || data.grades[0]?.id || "");
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function post(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/v1/notices", {
        method: "POST",
        body: JSON.stringify(
          audience === "SCHOOL" ? { audience, title, body } : { audience, title, body, gradeId },
        ),
      });
      setTitle("");
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post the notice");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle kicker="Community" title="Notices" detail="School-wide, or one grade." />
      {user?.role === "ADMIN" ? (
        <form className="mt-6 rounded-2xl border border-line bg-card p-5" onSubmit={(event) => void post(event)}>
          <h2 className="text-2xl">New notice</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <select
              className="rounded-xl border border-line bg-white px-3 py-2"
              value={audience}
              onChange={(event) => setAudience(event.target.value as "SCHOOL" | "GRADE")}
            >
              <option value="SCHOOL">Whole school</option>
              <option value="GRADE">One grade</option>
            </select>
            {audience === "GRADE" ? (
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
            ) : null}
          </div>
          <input
            className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
          />
          <textarea
            className="mt-3 min-h-28 w-full rounded-xl border border-line bg-white px-3 py-2"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write the notice"
          />
          <button className="mt-3 rounded-xl bg-pine px-4 py-2 text-white disabled:opacity-60" disabled={busy} type="submit">
            {busy ? "Posting…" : "Post notice"}
          </button>
        </form>
      ) : null}
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      <div className="mt-6 space-y-3">
        {notices.length === 0 ? <p className="text-sm text-stone-500">No notices yet.</p> : null}
        {notices.map((notice) => (
          <article key={notice.id} className="rounded-2xl border border-line bg-card p-5">
            <p className="text-sm text-clay">{notice.audience === "SCHOOL" ? "Whole school" : notice.grade}</p>
            <h2 className="mt-1 text-2xl">{notice.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{notice.body}</p>
            <p className="mt-3 text-sm text-stone-500">
              {notice.postedBy} · {postedOn(notice.createdAt)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
