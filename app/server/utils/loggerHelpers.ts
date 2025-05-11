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
