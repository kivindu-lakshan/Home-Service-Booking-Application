export type AddressDraft = {
  label: string;
  line1: string;
  areaCity: string;
  landmark: string;
  isDefault: boolean;
};
export type AddressTextField = "label" | "line1" | "areaCity" | "landmark";
export type AddressErrors = Partial<Record<AddressTextField, string>>;
export const addressFields: { key: AddressTextField; title: string; max: number; optional?: boolean; placeholder: string }[] = [
  { key: "label", title: "Address label", max: 40, placeholder: "Home" },
  { key: "line1", title: "Street address", max: 200, placeholder: "24 Lake Road" },
  { key: "areaCity", title: "City / Area", max: 100, placeholder: "Malabe" },
  { key: "landmark", title: "Landmark", max: 200, optional: true, placeholder: "Near the community park" },
];
export const emptyAddress = (): AddressDraft => ({ label: "", line1: "", areaCity: "", landmark: "", isDefault: false });
export function cleanAddress(draft: AddressDraft): AddressDraft {
  return {
    label: draft.label.trim(), line1: draft.line1.trim(), areaCity: draft.areaCity.trim(),
    landmark: draft.landmark.trim(), isDefault: draft.isDefault,
  };
}
export function validateAddress(draft: AddressDraft): AddressErrors {
  const errors: AddressErrors = {};
  for (const { key, title, max, optional } of addressFields) {
    const value = draft[key].trim();
    if (!value && !optional) errors[key] = `${title} is required.`;
    else if (Array.from(value).length > max) errors[key] = `${title} must be ${max} characters or fewer.`;
    else if (/[\u0000-\u001f\u007f]/u.test(value)) errors[key] = `${title} cannot contain control characters.`;
  }
  return errors;
}
