"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types/chat";
import { BontiAvatar } from "@/components/bonti-avatar";
import { MatchCard } from "@/components/match-card";

// Locked-down markdown components — only render what the bot actually emits,
// and force link safety (internal links keep SPA-style; external opens new tab).
const MARKDOWN_COMPONENTS = {
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props} className="leading-snug [&:not(:last-child)]:mb-2" />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong {...props} className="font-semibold" />
  ),
  em: (props: React.HTMLAttributes<HTMLElement>) => <em {...props} className="italic" />,
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul {...props} className="list-disc pl-5 my-1 space-y-0.5" />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol {...props} className="list-decimal pl-5 my-1 space-y-0.5" />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li {...props} />,
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code {...props} className="bg-black/5 px-1 rounded text-[0.95em]" />
  ),
  a: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a
        {...rest}
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer noopener" : undefined}
        className="text-bonti-red underline underline-offset-2 hover:text-bonti-red/80"
      >
        {children}
      </a>
    );
  },
};

function AssistantMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
      {text}
    </ReactMarkdown>
  );
}

export function MessageList({
  messages,
  loading = false,
}: {
  messages: ChatMessage[];
  loading?: boolean;
}) {
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex items-start gap-3">
        <BontiAvatar size="sm" decorative />
        <p className="text-bonti-text/60 font-roboto text-base pt-1.5">
          Castle&apos;s in 8 weeks. What&apos;s on your mind?
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((m, i) => {
        if (m.role === "user") {
          return (
            <div
              key={i}
              className="self-end max-w-[80%] bg-bonti-toolbar text-white font-roboto px-4 py-2 rounded-lg whitespace-pre-wrap"
            >
              {m.content}
            </div>
          );
        }
        // Assistant message with an inline match — render the card directly
        // (the card carries its own intro paragraph, so the markdown bubble
        // would just duplicate it).
        if (m.match) {
          return (
            <div key={i} className="self-start flex items-start gap-2 max-w-[85%]">
              <BontiAvatar size="sm" animated={false} decorative />
              <MatchCard result={m.match} />
            </div>
          );
        }
        return (
          <div key={i} className="self-start flex items-start gap-2 max-w-[85%]">
            <BontiAvatar size="sm" animated={false} decorative />
            <div className="bg-bonti-surface text-bonti-text font-roboto px-4 py-3 rounded-lg border border-black/5">
              <AssistantMarkdown text={m.content} />
            </div>
          </div>
        );
      })}
      {loading && (
        <div className="self-start flex items-start gap-2">
          <BontiAvatar size="sm" decorative />
          <div className="bg-bonti-surface text-bonti-text/60 font-roboto px-4 py-3 rounded-lg border border-black/5 inline-flex gap-1.5 items-center">
            <span className="size-1.5 bg-current rounded-full animate-pulse" />
            <span className="size-1.5 bg-current rounded-full animate-pulse [animation-delay:0.15s]" />
            <span className="size-1.5 bg-current rounded-full animate-pulse [animation-delay:0.3s]" />
          </div>
        </div>
      )}
    </div>
  );
}
