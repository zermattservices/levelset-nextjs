/**
 * Date utility functions shared across mobile components
 */

/**
 * Formats a date string into a human-readable relative time label.
 * - Under 1 min: "Just now"
 * - Under 1 hour: "Xm ago"
 * - Under 24 hours: "Xh ago"
 * - Yesterday: "Yesterday"
 * - Under 7 days: "Wed, Mar 4"
 * - Same year: "Mar 4"
 * - Older: "Mar 4, 2025"
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Future dates or very recent — guard against clock skew
  if (diffMs < 0) return "Just now";

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  // Use calendar-day comparison for "Yesterday" and beyond
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((today.getTime() - dateDay.getTime()) / 86400000);

  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  if (date.getFullYear() === now.getFullYear())
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
