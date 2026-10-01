export type RegistrationDraft = { fullName: string; email: string; phone: string; password: string; confirm: string };
export type AuthErrors = Partial<Record<keyof RegistrationDraft, string>>;
export function validateLogin(email: string, password: string): AuthErrors {
  const errors: AuthErrors = {};
  if (!email.trim()) errors.email = "Email address is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Password is required.";
  return errors;
}
export function validateRegistration(form: RegistrationDraft): AuthErrors {
  const errors = validateLogin(form.email, form.password);
  if (form.fullName.trim().length < 2) errors.fullName = "Enter your full name (at least 2 characters).";
  if (!form.phone.trim()) errors.phone = "Phone number is required.";
  if (form.password && (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))) errors.password = "Password must be at least 8 characters and include a letter and a number.";
  if (!form.confirm) errors.confirm = "Confirm your password.";
  else if (form.password !== form.confirm) errors.confirm = "Passwords do not match.";
  return errors;
}
