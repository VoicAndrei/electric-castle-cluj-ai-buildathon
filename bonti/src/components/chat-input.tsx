"use client";

import { useState } from "react";

export function ChatInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSubmit(trimmed);
        setValue("");
      }}
    >
      <input
        type="text"
        className="flex-1 bg-white border border-black/10 px-4 py-3 font-roboto text-base focus:outline-none focus:border-bonti-red"
        placeholder="Ask Bonți anything…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="bg-bonti-red text-white font-sofia uppercase px-4 py-3 text-sm disabled:opacity-50"
      >
        Ask
      </button>
    </form>
  );
}
