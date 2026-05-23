type Density = "low" | "med" | "high";

const COLOR: Record<Density, string> = {
  low:  "bg-green-500",
  med:  "bg-yellow-500",
  high: "bg-red-500",
};

const WIDTH: Record<Density, string> = {
  low:  "w-1/3",
  med:  "w-2/3",
  high: "w-full",
};

export function DensityBar({ density, estimateMin }: { density: Density; estimateMin: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-bonti-bg rounded-full h-2 overflow-hidden">
        <div className={["h-full rounded-full", COLOR[density], WIDTH[density]].join(" ")} />
      </div>
      <span className="text-bonti-text font-roboto text-xs whitespace-nowrap">
        ~{estimateMin} min
      </span>
    </div>
  );
}
