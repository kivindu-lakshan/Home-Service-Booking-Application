export type ProfileFieldErrors = { fullName?: string; phone?: string };

export const normalizeProfilePhone = (phone: string) => phone.replace(/\s/g, "");

// Existing seeded profiles use +94; display those mobile numbers in local format.
// Newly entered values still have to use the required 07 format.
export function profilePhoneForForm(phone: string): string {
  const compact = normalizeProfilePhone(phone);
  return /^\+947[0-9]{8}$/.test(compact) ? `0${compact.slice(3)}` : phone;
}

export function validateProfileFields(fullName: string, phone: string): ProfileFieldErrors {
  const name = fullName.trim();
  const number = normalizeProfilePhone(phone);
  const errors: ProfileFieldErrors = {};
  if (!name) {
    errors.fullName = "Full name is required.";
  } else if (Array.from(name).length < 2 || Array.from(name).length > 100) {
    errors.fullName = "Full name must be between 2 and 100 characters.";
  } else if (!/^\p{L}[\p{L}\p{M} ]*$/u.test(name)) {
    errors.fullName = "Full name must contain only letters and spaces.";
  }
  if (!number) {
    errors.phone = "Phone number is required.";
  } else if (!/^07[0-9]{8}$/.test(number)) {
    errors.phone = "Enter a 10-digit Sri Lankan mobile number starting with 07, e.g. 0771234567.";
  }
  return errors;
}
