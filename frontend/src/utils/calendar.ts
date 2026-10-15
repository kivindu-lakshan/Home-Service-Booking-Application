import { Linking, Platform } from "react-native";

export interface CalendarEventDetails {
  title: string;
  serviceName: string;
  bookingRef: string;
  scheduledDate: string | Date;
  scheduledTime?: string;
  durationHours?: string;
  address?: string;
  providerName?: string;
  notes?: string;
}

/**
 * Parses booking scheduled date, time string (e.g. "09:30 AM"), and duration into start & end Dates.
 */
export function parseBookingDateTime(
  scheduledDate: string | Date,
  scheduledTime: string = "09:00 AM",
  durationHoursStr: string = "2",
): { startDate: Date; endDate: Date } {
  const baseDate = new Date(scheduledDate);
  const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;

  let hours = 9;
  let minutes = 0;

  const match = (scheduledTime || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = (match[3] || "").toUpperCase();
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    hours = h;
    minutes = m;
  }

  const startDate = new Date(
    validBase.getFullYear(),
    validBase.getMonth(),
    validBase.getDate(),
    hours,
    minutes,
    0,
  );

  // Parse duration in hours (e.g. "2", "1.5", "2 hours")
  const durMatch = (durationHoursStr || "").match(/(\d+(\.\d+)?)/);
  const durHours = durMatch ? parseFloat(durMatch[1]) : 2;
  const durationMs = Math.round(durHours * 60) * 60 * 1000;

  const endDate = new Date(startDate.getTime() + durationMs);

  return { startDate, endDate };
}

/**
 * Formats a Date object to ISO compact format (YYYYMMDDTHHmmssZ) required by iCalendar and Google Calendar.
 */
function toUtcCompact(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generates an event summary description text.
 */
function buildEventDescription(details: CalendarEventDetails): string {
  const lines: string[] = [
    `HomeHalo Service Appointment: ${details.serviceName}`,
    `Booking Reference: ${details.bookingRef}`,
  ];
  if (details.providerName) {
    lines.push(`Provider: ${details.providerName}`);
  }
  if (details.address) {
    lines.push(`Location: ${details.address}`);
  }
  if (details.notes) {
    lines.push(`Notes: ${details.notes}`);
  }
  lines.push("Thank you for choosing HomeHalo!");
  return lines.join("\n");
}

/**
 * Builds Google Calendar web template URL.
 */
export function getGoogleCalendarUrl(details: CalendarEventDetails): string {
  const { startDate, endDate } = parseBookingDateTime(
    details.scheduledDate,
    details.scheduledTime,
    details.durationHours,
  );

  const title = details.title || `HomeHalo: ${details.serviceName}`;
  const dates = `${toUtcCompact(startDate)}/${toUtcCompact(endDate)}`;
  const description = buildEventDescription(details);
  const location = details.address || "";

  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${dates}` +
    `&details=${encodeURIComponent(description)}` +
    `&location=${encodeURIComponent(location)}`
  );
}

/**
 * Generates standard RFC 5545 iCalendar (.ics) content.
 */
export function generateIcsContent(details: CalendarEventDetails): string {
  const { startDate, endDate } = parseBookingDateTime(
    details.scheduledDate,
    details.scheduledTime,
    details.durationHours,
  );

  const title = details.title || `HomeHalo: ${details.serviceName}`;
  const description = buildEventDescription(details).replace(/\n/g, "\\n");
  const location = (details.address || "").replace(/\n/g, ", ");
  const cleanRef = (details.bookingRef || "APPT").replace(/[^a-zA-Z0-9-]/g, "");
  const uid = `${cleanRef}-${startDate.getTime()}@homehalo.lk`;
  const nowUtc = toUtcCompact(new Date());
  const startUtc = toUtcCompact(startDate);
  const endUtc = toUtcCompact(endDate);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HomeHalo//Home Service Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${title} in 1 hour`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Opens Google Calendar directly via browser or app.
 */
export async function openGoogleCalendar(details: CalendarEventDetails): Promise<void> {
  const url = getGoogleCalendarUrl(details);
  const canOpen = await Linking.canOpenURL(url).catch(() => true);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    throw new Error("Unable to open Google Calendar on this device.");
  }
}

/**
 * Saves and opens the universal .ics event in the device's native Calendar app
 * (Apple Calendar, Samsung Calendar, Outlook, etc.).
 */
export async function addToDeviceCalendar(details: CalendarEventDetails): Promise<void> {
  const ics = generateIcsContent(details);
  const cleanRef = (details.bookingRef || "appointment").replace(/[^a-zA-Z0-9-]/g, "");
  const fileName = `homehalo-${cleanRef}.ics`;

  if (Platform.OS === "web") {
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = (globalThis as any).document.createElement("a");
    link.href = url;
    link.download = fileName;
    (globalThis as any).document.body.appendChild(link);
    link.click();
    (globalThis as any).document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }

  // Native Mobile (Android & iOS)
  try {
    const fileSystem = await import("expo-file-system");
    const Sharing = await import("expo-sharing");

    let fileUri = "";

    // Support both Expo 57 modern File/Paths and classic FileSystem API
    if ((fileSystem as any).File && (fileSystem as any).Paths?.cache) {
      const destination = new (fileSystem as any).File((fileSystem as any).Paths.cache, fileName);
      if (destination.exists) {
        destination.delete();
      }
      destination.create();
      destination.write(ics);
      fileUri = destination.uri;
    } else if ((fileSystem as any).cacheDirectory) {
      fileUri = `${(fileSystem as any).cacheDirectory}${fileName}`;
      await (fileSystem as any).writeAsStringAsync(fileUri, ics, {
        encoding: (fileSystem as any).EncodingType?.UTF8 || "utf8",
      });
    }

    if (!fileUri) {
      throw new Error("Local storage is unavailable.");
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/calendar",
        dialogTitle: "Add to Calendar",
        UTI: "com.apple.ical.ics",
      });
    } else {
      // Fallback to opening Google Calendar if sharing is unavailable
      await openGoogleCalendar(details);
    }
  } catch {
    // If native file write fails for any reason, gracefully fall back to Google Calendar URL
    await openGoogleCalendar(details);
  }
}
