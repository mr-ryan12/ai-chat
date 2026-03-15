import { redirect } from "@remix-run/node";

export async function loader(): Promise<Response> {
  return redirect("/login", { status: 301 });
}

export default function Signup() {
  return null;
}
