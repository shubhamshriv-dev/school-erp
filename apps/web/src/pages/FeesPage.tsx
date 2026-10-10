import { useEffect, useState } from "react";
import { useAuth } from "../App";
import { api, inr, statusLabel } from "../api";
import { PageTitle } from "./DashboardPage";

type Invoice = {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  planName: string;
  amount: number;
  paid: number;
  balance: number;
  dueDate: string;
  overdue: boolean;
  status: string;
  payments: { receiptNo: string; amount: number; mode: string }[];
};

export function FeesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("CASH");

  function load() {
    api<Invoice[]>("/v1/fees/invoices")
      .then(setInvoices)
      .catch((err: Error) => setError(err.message));
  }

  useEffect(load, []);

  async function record(invoice: Invoice) {
    setError("");
    try {
      await api(`/v1/fees/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ amount: Number(amount), mode }),
      });
      setPaying(null);
      setAmount("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    }
  }

  const due = invoices?.reduce((sum, invoice) => sum + invoice.balance, 0) ?? 0;

  return (
    <div>
      <PageTitle kicker="Fee accounts" title="Invoices" detail={invoices ? `${inr(due)} still due` : ""} />
      {error ? <p className="mt-3 text-sm text-clay">{error}</p> : null}
      <div className="mt-6 space-y-3">
        {invoices?.map((invoice) => (
          <article key={invoice.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {invoice.studentName} · {invoice.admissionNo}
                </p>
                <p className="text-sm text-stone-500">
                  {invoice.invoiceNo} · {invoice.planName} · due {invoice.dueDate}
                </p>
              </div>
              <div className="text-right">
                <p className="display text-2xl">{inr(invoice.balance)}</p>
                <p className="text-sm text-stone-500">
                  {statusLabel(invoice.status)}
                  {invoice.overdue ? " · overdue" : ""} · paid {inr(invoice.paid)} of {inr(invoice.amount)}
                </p>
              </div>
            </div>
            {invoice.payments.length > 0 ? (
              <p className="mt-2 text-sm text-stone-600">
                {invoice.payments.map((payment) => `${payment.receiptNo} ${inr(payment.amount)} ${statusLabel(payment.mode)}`).join(" · ")}
              </p>
            ) : null}
            {user?.role === "ADMIN" && invoice.balance > 0 ? (
              paying === invoice.id ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    className="w-32 rounded-lg border border-line px-2 py-1"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                  <select className="rounded-lg border border-line px-2 py-1" value={mode} onChange={(event) => setMode(event.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                  </select>
                  <button className="rounded-lg bg-clay px-3 py-1 text-white" onClick={() => void record(invoice)} type="button">
                    Record
                  </button>
                  <button className="text-sm" onClick={() => setPaying(null)} type="button">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="mt-3 text-sm text-clay"
                  onClick={() => {
                    setPaying(invoice.id);
                    setAmount(String(invoice.balance));
                  }}
                  type="button"
                >
                  Record payment
                </button>
              )
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
