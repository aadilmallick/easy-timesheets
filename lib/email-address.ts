export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailsEqual(left: string, right: string) {
  return normalizeEmail(left) === normalizeEmail(right);
}
