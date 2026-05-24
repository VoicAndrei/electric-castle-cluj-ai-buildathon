import { redirect } from "next/navigation";

// The pre-festival landing and the in-festival surface have collapsed into
// a single /app URL whose contents flip on the on-site signal. Anything
// hitting the bare domain goes straight there.
export default function Home() {
  redirect("/app");
}
