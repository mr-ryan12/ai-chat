export function getPath(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("api_key")) {
      u.searchParams.delete("api_key");
    }
    return u.pathname.toString();
  } catch {
    // If it's not a valid URL, return as is
    return url;
  }
}

export function getService(url: string) {
  if (url.includes("localhost")) return "LOCALHOST";
  if (url.includes("serpapi")) return "SERPAPI";
  return "UNKNOWN";
}

export function hasStatus(err: unknown): err is { status: number } {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  );
}
