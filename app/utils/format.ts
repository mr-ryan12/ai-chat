// Shared display formatters (client + server safe).

// Human-friendly relative time: "Just now", "3h ago", "2d ago", else a locale date.
export function formatRelativeDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffInHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
  return date.toLocaleDateString();
}

// Truncate to maxLength characters with an ellipsis when it overflows.
export function truncateText(text: string, maxLength = 30): string {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}
