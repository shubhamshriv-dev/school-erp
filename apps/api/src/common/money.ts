import { Prisma } from "@prisma/client";

export function rupees(value: Prisma.Decimal | number | string) {
  return Number(value.toString());
}

export function paidTotal(payments: { amount: Prisma.Decimal }[]) {
  return payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
}
