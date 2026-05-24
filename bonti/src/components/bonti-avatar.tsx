type Size = "sm" | "md" | "lg" | "xl";

const PX: Record<Size, number> = { sm: 32, md: 48, lg: 72, xl: 128 };

export function BontiAvatar({
  size = "md",
  className,
  // `animated` is intentionally accepted but unused — the brand mark is now
  // a static raster, so the bob animation has been retired. Kept in the
  // signature so existing callers compile without churn.
  animated: _animated,
  decorative = false,
}: {
  size?: Size;
  className?: string;
  animated?: boolean;
  decorative?: boolean;
}) {
  void _animated;
  const px = PX[size];
  return (
    <span
      className={["inline-block shrink-0", className].filter(Boolean).join(" ")}
      style={{ width: px, height: px }}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": "Bonți" })}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bonti-duck.svg"
        alt=""
        width={px}
        height={px}
        draggable={false}
        style={{ width: px, height: px, objectFit: "contain" }}
      />
    </span>
  );
}
