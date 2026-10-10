export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message || "Request failed";
    throw new ApiError(response.status, message);
  }
  return body as T;
}

export type Role = "ADMIN" | "TEACHER" | "PARENT";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export function inr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const statusWords: Record<string, string> = {
  UPI: "UPI",
  EARLY_LEAVE: "Early leave",
  NOT_MARKED: "Not marked",
  PARTLY_PAID: "Partly paid",
  BANK_TRANSFER: "Bank transfer",
};

export function statusLabel(status: string) {
  if (statusWords[status]) return statusWords[status];
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
