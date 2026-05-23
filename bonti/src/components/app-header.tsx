"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BontiAvatar } from "@/components/bonti-avatar";

type Props = {
  title: string;
  showBack?: boolean;
  unread?: number;
};

export function AppHeader({ title, showBack = false, unread = 0 }: Props) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 bg-bonti-toolbar pt-safe">
      <div className="h-[52px] px-4 flex items-center justify-between">
        <div className="w-10 flex items-center">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="text-white/80 hover:text-white text-xl leading-none"
            >
              ‹
            </button>
          ) : (
            <Link href="/app" aria-label="Bonți home">
              <BontiAvatar size="sm" animated />
            </Link>
          )}
        </div>
        <h1 className="text-white text-base font-sofia uppercase tracking-wide truncate">
          {title}
        </h1>
        <div className="w-10 flex items-center justify-end">
          <Link href="/app/notifications" aria-label="Notifications" className="relative">
            <span className="text-white/80 hover:text-white">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 size-2 bg-bonti-red rounded-full" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
