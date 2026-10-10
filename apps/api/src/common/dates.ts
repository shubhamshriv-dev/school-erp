export function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function asDbDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function formatDbDate(value: Date) {
  return value.toISOString().slice(0, 10);
}
