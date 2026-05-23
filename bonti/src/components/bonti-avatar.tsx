import Image from "next/image";

type Size = "sm" | "md" | "lg" | "xl";

const PX: Record<Size, number> = { sm: 32, md: 48, lg: 72, xl: 128 };

export function BontiAvatar({
  size = "md",
  className,
  animated = true,
}: {
  size?: Size;
  className?: string;
  animated?: boolean;
}) {
  const px = PX[size];
  return (
    <span
      className={["inline-block shrink-0", animated ? "animate-bonti-bob" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{ width: px, height: px }}
      aria-label="Bonți"
      role="img"
    >
      <Image
        src="/bonti-duck.svg"
        alt=""
        width={px}
        height={px}
        priority
        draggable={false}
      />
    </span>
  );
}
