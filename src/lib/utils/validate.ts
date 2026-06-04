/** Returns an error string, or null if valid. */

export function validateAmount(
  value: string,
  { max = 100_000, label = 'Amount' }: { max?: number; label?: string } = {}
): string | null {
  if (!value || value === '') return `${label} is required`;
  const n = parseFloat(value);
  if (isNaN(n))   return `${label} must be a number`;
  if (n < 0)      return `${label} cannot be negative`;
  if (n === 0)    return `${label} must be greater than ₹0`;
  if (n > max)    return `${label} can't exceed ${formatMax(max)}`;
  const decimals = value.split('.')[1];
  if (decimals && decimals.length > 2) return `${label} can have at most 2 decimal places`;
  return null;
}

export function validatePositiveInt(
  value: string,
  { min = 1, max = 360, label = 'Value' }: { min?: number; max?: number; label?: string } = {}
): string | null {
  if (!value || value === '') return `${label} is required`;
  const n = parseInt(value);
  if (isNaN(n) || !Number.isInteger(n)) return `${label} must be a whole number`;
  if (n < min) return `${label} must be at least ${min}`;
  if (n > max) return `${label} can't exceed ${max}`;
  return null;
}

export function validateName(
  value: string,
  { min = 2, max = 50, label = 'Name' }: { min?: number; max?: number; label?: string } = {}
): string | null {
  const v = value.trim();
  if (!v)         return `${label} is required`;
  if (v.length < min) return `${label} must be at least ${min} characters`;
  if (v.length > max) return `${label} must be ${max} characters or fewer`;
  return null;
}

export function validateRequired(value: string, label = 'This field'): string | null {
  return value.trim() === '' ? `${label} is required` : null;
}

export function validateTursoUrl(value: string): string | null {
  if (!value.trim()) return 'Database URL is required';
  if (!value.startsWith('libsql://') && !value.startsWith('https://')) {
    return 'URL must start with libsql:// or https://';
  }
  return null;
}

export function validateTursoToken(value: string): string | null {
  if (!value.trim()) return 'Auth token is required';
  if (value.trim().length < 20) return 'Token looks too short — check your Turso dashboard';
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMax(n: number): string {
  if (n >= 10_000_000) return `₹${n / 10_000_000}Cr`;
  if (n >= 100_000)    return `₹${n / 100_000}L`;
  if (n >= 1_000)      return `₹${n / 1_000}K`;
  return `₹${n}`;
}
