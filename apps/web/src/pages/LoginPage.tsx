import { FormEvent, useState } from "react";
import { api } from "../api";

const demos = [
  { label: "Admin", email: "anita.deshpande@riverside.edu", password: "Admin@123" },
  { label: "Teacher", email: "priya.natarajan@riverside.edu", password: "Teacher@123" },
  { label: "Parent", email: "meera.shah@riverside.edu", password: "Parent@123" },
];

export function LoginPage({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [email, setEmail] = useState(demos[0].email);
  const [password, setPassword] = useState(demos[0].password);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event?: FormEvent, nextEmail = email, nextPassword = password) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-sidebar text-sidebar-ink lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(196,122,74,0.35),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(31,106,86,0.35),transparent_40%)]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <p className="text-xs tracking-[0.22em] text-amber-100/80 uppercase">Version 1</p>
          <div>
            <h1 className="max-w-md text-6xl text-white">One register for the whole school.</h1>
            <p className="mt-4 max-w-sm text-lg text-stone-300">
              Students, today’s attendance, and fee balances. The same record for the office, the class teacher, and the parent.
            </p>
          </div>
          <p className="text-sm text-stone-400">Riverside Public School · CBSE · Pune</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <form className="w-full max-w-md" onSubmit={(event) => void submit(event)}>
          <p className="text-sm text-clay">Riverside Public School</p>
          <h2 className="mt-2 text-4xl">Sign in</h2>
          <label className="mt-8 block text-sm">
            Email
            <input
              className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
            />
          </label>
          <label className="mt-4 block text-sm">
            Password
            <input
              className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
          <button
            className="mt-6 w-full rounded-xl bg-clay px-4 py-3 text-white disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? "Signing in…" : "Enter the school"}
          </button>
          <div className="mt-6 flex flex-wrap gap-2">
            {demos.map((demo) => (
              <button
                key={demo.email}
                className="rounded-full border border-line bg-card px-3 py-1.5 text-sm"
                type="button"
                onClick={() => {
                  setEmail(demo.email);
                  setPassword(demo.password);
                  void submit(undefined, demo.email, demo.password);
                }}
              >
                {demo.label}
              </button>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}
