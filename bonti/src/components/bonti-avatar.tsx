type Size = "sm" | "md" | "lg" | "xl";

const PX: Record<Size, number> = { sm: 32, md: 48, lg: 72, xl: 128 };

export function BontiAvatar({
  size = "md",
  className,
  animated = true,
  decorative = false,
}: {
  size?: Size;
  className?: string;
  animated?: boolean;
  decorative?: boolean;
}) {
  const px = PX[size];
  return (
    <span
      className={[
        "inline-block shrink-0",
        animated ? "animate-bonti-bob motion-reduce:animate-none" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width: px, height: px }}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": "Bonți" })}
    >
      {/* Plain <img> for a static brand SVG — next/image's optimization doesn't apply to SVGs. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bonti-duck.svg"
        alt=""
        width={px}
        height={px}
        draggable={false}
        style={{ width: px, height: px }}
      />
    </span>
  );
}
