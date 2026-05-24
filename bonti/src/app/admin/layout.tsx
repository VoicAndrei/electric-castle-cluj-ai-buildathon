import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bonti-bg">
      <header className="bg-bonti-toolbar text-white px-4 h-[52px] flex items-center justify-between gap-4">
        <Link href="/admin/broadcasts" className="font-sofia uppercase tracking-wide">
          Bonți Ops
        </Link>
        <nav className="flex gap-4 text-xs font-sofia uppercase tracking-wide">
          <Link href="/admin/broadcasts" className="text-white/70 hover:text-white">Broadcasts</Link>
          <Link href="/admin/lineup" className="text-white/70 hover:text-white">Lineup</Link>
        </nav>
      </header>
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
