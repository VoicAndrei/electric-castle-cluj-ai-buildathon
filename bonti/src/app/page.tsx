import { BRAND } from "@/lib/brand";

export default function Home() {
  return (
    <main className="min-h-screen bg-bonti-bg">
      <header className="bg-bonti-toolbar px-6 py-4">
        <h1 className="text-bonti-red text-2xl font-sofia">
          {BRAND.name} — {BRAND.festival.edition}
        </h1>
      </header>
      <section className="px-6 py-8">
        <p className="font-roboto text-base">
          Castle&apos;s in 8 weeks. What&apos;s on your mind?
        </p>
      </section>
    </main>
  );
}
