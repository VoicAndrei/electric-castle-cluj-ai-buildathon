import { AppTabbar } from "@/components/app-tabbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bonti-bg">
      {/* Header is rendered per-page so each page sets its own title */}
      <main className="flex-1 mx-auto w-full max-w-[480px]">{children}</main>
      <div className="mx-auto w-full max-w-[480px]">
        <AppTabbar />
      </div>
    </div>
  );
}
