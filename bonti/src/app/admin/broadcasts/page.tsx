import { redirect } from "next/navigation";
import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { BroadcastComposeForm } from "@/components/admin/broadcast-compose-form";
import { BroadcastRecentList } from "@/components/admin/broadcast-recent-list";
import { VENUE } from "@/data/venue";

export default async function AdminBroadcastsPage() {
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
  // Server component runs once per request — Date.now() non-determinism is intentional.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("broadcasts")
    .select("id, title_en, title_ro, final_en, final_ro, urgency, sent_at")
    .gte("sent_at", since)
    .order("sent_at", { ascending: false });

  const venues = VENUE.map(v => ({ id: v.id, name: v.name }));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-sofia uppercase tracking-wide text-bonti-text mb-3">Compose</h2>
        <BroadcastComposeForm venues={venues} />
      </section>
      <section>
        <h2 className="font-sofia uppercase tracking-wide text-bonti-text mb-3">Recent (last 24h)</h2>
        <BroadcastRecentList initial={recent ?? []} />
      </section>
    </div>
  );
}
