export const supportCategories = ["Booking issue", "Payment issue", "Service provider issue", "Account issue", "Technical issue", "Other"];
export type SupportDraft = { category: string; subject: string; description: string };
export type SupportErrors = Partial<Record<keyof SupportDraft, string>>;
export const emptySupport = (): SupportDraft => ({ category: "", subject: "", description: "" });
export const cleanSupport = (draft: SupportDraft): SupportDraft => ({ category: draft.category.trim(), subject: draft.subject.trim(), description: draft.description.trim() });
export function validateSupport(draft: SupportDraft): SupportErrors {
  const values = cleanSupport(draft);
  const errors: SupportErrors = {};
  if (!supportCategories.includes(values.category)) errors.category = "Choose a valid category.";
  for (const key of ["subject", "description"] as const) {
    const title = key === "subject" ? "Subject" : "Description";
    const min = key === "subject" ? 3 : 10;
    const max = key === "subject" ? 120 : 2000;
    const length = Array.from(values[key]).length;
    if (!length) errors[key] = `${title} is required.`;
    else if (length < min || length > max) errors[key] = `${title} must be ${min}-${max} characters.`;
    else if ((key === "description" ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u : /[\u0000-\u001f\u007f]/u).test(values[key])) errors[key] = `${title} contains invalid control characters.`;
  }
  return errors;
}
