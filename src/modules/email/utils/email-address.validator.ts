const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailAddress(email: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new Error(`Invalid email address: ${email}`);
  }
}

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}
