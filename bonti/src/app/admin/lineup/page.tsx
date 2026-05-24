import { redirect } from "next/navigation";
import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { LineupEditor, type EditorRow } from "@/components/admin/lineup-editor";

export default async function AdminLineupPage() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      if (e.status === 401) redirect("/admin/sign-in");
      return (
        <div className="text-center py-12">
          <h1 className="font-sofia uppercase text-bonti-red text-2xl mb-2">403</h1>
          <p className="font-roboto text-bonti-text">Your account is not authorized for Bonți Ops.</p>
        </div>
      );
    }
    throw e;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lineup_entries")
    .select("id, artist_name, day, stage, start_at, end_at, ec_tags, genres, photo_url, sort_order")
    .order("day", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("artist_name", { ascending: true });

  if (error) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="font-roboto text-sm text-bonti-red">
          Lineup database unavailable: {error.message}
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-sofia uppercase tracking-wide text-bonti-text">Lineup</h2>
      </div>
      <LineupEditor initial={(data ?? []) as EditorRow[]} />
    </section>
  );
}
