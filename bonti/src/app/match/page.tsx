import { redirect } from "next/navigation";

// /match used to host a standalone Spotify-playlist matcher. The same
// flow now runs inline in the /app chat — paste a Spotify URL into the
// conversation and the picks render as a chat message. The route stays
// as a redirect so old bookmarks/links don't 404.
export default function MatchRedirect() {
  redirect("/app");
}
