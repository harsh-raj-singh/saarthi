export function normalizePhoneNumber(input: string) {
  const trimmed = input.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");

  if (digits.startsWith("+") && /^\+\d{8,15}$/.test(digits)) {
    return digits;
  }

  const onlyDigits = digits.replace(/\D/g, "");
  if (onlyDigits.length === 10) {
    return `+1${onlyDigits}`;
  }

  if (onlyDigits.length >= 8 && onlyDigits.length <= 15) {
    return `+${onlyDigits}`;
  }

  throw new Error("Enter a valid phone number with country code.");
}
