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
  const name = form.fullName.trim();
  if (!name) errors.fullName = "Full name is required.";
  else if (name.length < 2 || name.length > 100) errors.fullName = "Full name must be between 2 and 100 characters.";
  else if (!/^\p{L}[\p{L}\p{M} ]*$/u.test(name)) errors.fullName = "Full name must contain only letters and spaces.";
  if (form.email.trim().length > 254) errors.email = "Email address must be at most 254 characters.";
  if (!form.phone.trim()) errors.phone = "Phone number is required.";
  else if (!/^07[0-9]{8}$/.test(form.phone.trim())) errors.phone = "Enter a 10-digit Sri Lankan mobile number starting with 07.";
  if (form.password && (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))) errors.password = "Password must be at least 8 characters and include a letter and a number.";
  if (!form.confirm) errors.confirm = "Confirm your password.";
  else if (form.password !== form.confirm) errors.confirm = "Passwords do not match.";
  return errors;
}
