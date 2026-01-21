import { format, parseISO } from "date-fns";

/**
 * Formats a date according to user's preferred format
 * @param date - Date object, ISO string, or timestamp
 * @param dateFormat - User's preferred format: "DD-MM-YYYY" or "MM-DD-YYYY"
 * @returns Formatted date string
 */
export function formatUserDate(
  date: Date | string | number | null | undefined,
  dateFormat: "DD-MM-YYYY" | "MM-DD-YYYY" = "DD-MM-YYYY"
): string {
  if (!date) return "—";

  try {
    let dateObj: Date;
    
    if (typeof date === "string") {
      dateObj = parseISO(date);
    } else if (typeof date === "number") {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return "—";
    }

    // Format based on user preference
    if (dateFormat === "DD-MM-YYYY") {
      return format(dateObj, "dd-MM-yyyy");
    } else {
      return format(dateObj, "MM-dd-yyyy");
    }
  } catch (error) {
    console.error("Date formatting error:", error);
    return "—";
  }
}

/**
 * Formats a date with time according to user's preferred format
 * @param date - Date object, ISO string, or timestamp
 * @param dateFormat - User's preferred format: "DD-MM-YYYY" or "MM-DD-YYYY"
 * @returns Formatted date and time string
 */
export function formatUserDateTime(
  date: Date | string | number | null | undefined,
  dateFormat: "DD-MM-YYYY" | "MM-DD-YYYY" = "DD-MM-YYYY"
): string {
  if (!date) return "—";

  try {
    let dateObj: Date;
    
    if (typeof date === "string") {
      dateObj = parseISO(date);
    } else if (typeof date === "number") {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    if (isNaN(dateObj.getTime())) {
      return "—";
    }

    // Format date and time
    if (dateFormat === "DD-MM-YYYY") {
      return format(dateObj, "dd-MM-yyyy HH:mm");
    } else {
      return format(dateObj, "MM-dd-yyyy HH:mm");
    }
  } catch (error) {
    console.error("Date formatting error:", error);
    return "—";
  }
}
