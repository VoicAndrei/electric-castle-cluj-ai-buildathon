import { loadLineup } from "@/data/lineup";
import { LineupClient } from "./lineup-client";

export default async function LineupPage() {
  const rows = await loadLineup();
  return <LineupClient initial={rows} />;
}
