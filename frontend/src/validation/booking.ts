export type BookingDraft = {
  serviceId: string;
  scheduledDate: string | Date;
  timePeriod: "morning" | "afternoon" | "evening";
  scheduledTime: string;
  address: string;
  notes?: string;
  paymentMode: "pay_on_completion" | "pay_now";
};

export type BookingErrors = Partial<Record<keyof BookingDraft, string>>;

export type RescheduleDraft = {
  currentDate?: string | Date;
  currentTime?: string;
  newDate: string | Date;
  newTime: string;
  notes?: string;
};

export type RescheduleErrors = Partial<Record<keyof RescheduleDraft, string>>;

export type CancellationDraft = {
  reason: string;
  customReason?: string;
};

export type CancellationErrors = Partial<Record<keyof CancellationDraft, string>>;

/**
 * Checks if a time slot (e.g., "09:30 AM") on a specified date has already passed.
 */
export function isSlotInPast(date: Date | string, timeSlot: string): boolean {
  if (!date || !timeSlot) return false;
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (targetDay < today) return true;
  if (targetDay > today) return false;

  // It is today: parse slot time
  const match = timeSlot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  return slotTime <= now;
}

/**
 * Validates creating a new booking draft.
 */
export function validateBooking(draft: BookingDraft): BookingErrors {
  const errors: BookingErrors = {};

  if (!draft.serviceId?.trim()) {
    errors.serviceId = "Please select a service from the catalog.";
  }

  if (!draft.scheduledDate) {
    errors.scheduledDate = "Please choose a scheduled appointment date.";
  }

  const time = (draft.scheduledTime || "").trim();
  if (!time) {
    errors.scheduledTime = "Please select a preferred start time slot.";
  } else if (draft.scheduledDate && isSlotInPast(draft.scheduledDate, time)) {
    errors.scheduledTime = "This time slot has already passed for today. Please pick a later time.";
  }

  const addr = (draft.address || "").trim();
  if (!addr) {
    errors.address = "Service location address is required.";
  } else if (addr.length < 5) {
    errors.address = "Address must be at least 5 characters.";
  } else if (addr.length > 300) {
    errors.address = "Address must be 300 characters or fewer.";
  } else if (/[\u0000-\u001f\u007f]/u.test(addr)) {
    errors.address = "Address cannot contain control characters.";
  } else if (!/\p{L}/u.test(addr)) {
    errors.address = "Address cannot be only numbers. Please include a street or location name.";
  } else if (/[@$%^*~+=<>{}\\]/.test(addr)) {
    errors.address = "Address contains invalid symbols like '@'. Use standard address formats.";
  } else if (/(.)\1{5,}/.test(addr)) {
    errors.address = "Address contains too many repeated characters.";
  }

  const notes = (draft.notes || "").trim();
  if (notes) {
    if (notes.length > 500) {
      errors.notes = "Special instructions must be 500 characters or fewer.";
    } else if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(notes) || /[<>{}\\]/.test(notes)) {
      errors.notes = "Special instructions cannot contain code characters (< > { }).";
    } else if (!/\p{L}/u.test(notes)) {
      errors.notes = "Special instructions must contain descriptive words, not just numbers or symbols.";
    } else if (/@/.test(notes)) {
      errors.notes = "Do not include email addresses or '@' symbols in instructions.";
    } else if (/(.)\1{6,}/.test(notes)) {
      errors.notes = "Instructions contain too many repeated characters.";
    }
  }

  if (!["pay_on_completion", "pay_now"].includes(draft.paymentMode)) {
    errors.paymentMode = "Please select a valid payment preference.";
  }

  return errors;
}

/**
 * Validates a reschedule appointment draft.
 */
export function validateReschedule(draft: RescheduleDraft): RescheduleErrors {
  const errors: RescheduleErrors = {};

  if (!draft.newDate) {
    errors.newDate = "Please select a new appointment date.";
  }

  const time = (draft.newTime || "").trim();
  if (!time) {
    errors.newTime = "Please select a preferred time slot.";
  } else if (draft.newDate && isSlotInPast(draft.newDate, time)) {
    errors.newTime = "This time slot has already passed for today.";
  }

  if (draft.currentDate && draft.currentTime && draft.newDate && time) {
    const curD = new Date(draft.currentDate).toDateString();
    const newD = new Date(draft.newDate).toDateString();
    if (curD === newD && draft.currentTime.trim().toUpperCase() === time.toUpperCase()) {
      errors.newTime = "Please select a different date or time slot to reschedule.";
    }
  }

  const notes = (draft.notes || "").trim();
  if (notes) {
    if (notes.length > 300) {
      errors.notes = "Reschedule notes must be 300 characters or fewer.";
    } else if (/[<>{}\\]/.test(notes)) {
      errors.notes = "Reschedule notes cannot contain invalid characters (< > { }).";
    } else if (!/\p{L}/u.test(notes)) {
      errors.notes = "Reschedule reason must contain words, not just numbers or symbols.";
    } else if (/(.)\1{6,}/.test(notes)) {
      errors.notes = "Reason contains too many repeated characters.";
    }
  }

  return errors;
}

/**
 * Validates a booking cancellation draft.
 */
export function validateCancellation(draft: CancellationDraft): CancellationErrors {
  const errors: CancellationErrors = {};
  const reason = (draft.reason || "").trim();

  if (!reason) {
    errors.reason = "Please select a reason for cancellation.";
  }

  if (reason === "Other" && draft.customReason) {
    const custom = draft.customReason.trim();
    if (custom.length > 300) {
      errors.customReason = "Reason must be 300 characters or fewer.";
    } else if (/[<>{}\\]/.test(custom)) {
      errors.customReason = "Explanation cannot contain invalid characters (< > { }).";
    } else if (!/\p{L}/u.test(custom)) {
      errors.customReason = "Explanation must contain words explaining the reason, not just numbers or symbols.";
    } else if (/(.)\1{6,}/.test(custom)) {
      errors.customReason = "Explanation contains too many repeated characters.";
    }
  }

  return errors;
}
