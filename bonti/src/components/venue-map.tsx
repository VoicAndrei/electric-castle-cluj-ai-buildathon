"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
  useTransformComponent,
} from "react-zoom-pan-pinch";

type Pin = {
  id: string;
  /** 0-1000 grid (x), 0-1000 grid (y). Rendered as % of the map. */
  coords: { x: number; y: number };
  label?: string;
  color?: string;
  size?: number;
};

type Props = {
  pins?: Pin[];
  /** Reserved for future use — kept in API so Group page compiles. */
  highlight?: string;
  routeFrom?: { x: number; y: number };
  /**
   * Optional overlay rendered inside the same transformed canvas as the pins.
   * Use this for route lines, custom pins, or any content that should pan/zoom
   * with the map. Sits *above* the default pins in z-order.
   */
  overlay?: ReactNode;
  className?: string;
};

function Pins({ pins }: { pins: Pin[] }) {
  // Counter-scale so pins keep a constant visual size as the map zooms.
  // Without this they grow with the transformed canvas and feel oversized.
  const scale = useTransformComponent(({ state }) => state.scale);
  return (
    <>
      {pins.map((p) => {
        const size = p.size ?? 28;
        return (
          <div
            key={p.id}
            className="absolute rounded-full shadow-[0_0_0_3px_white,0_2px_6px_rgba(0,0,0,0.4)] flex items-center justify-center font-sofia text-xs font-bold text-white transition-[left,top] duration-[1.5s] ease-in-out"
            style={{
              left: `${p.coords.x / 10}%`,
              top: `${p.coords.y / 10}%`,
              width: size,
              height: size,
              backgroundColor: p.color ?? "#0A0A0A",
              transform: `translate(-50%, -50%) scale(${1 / scale})`,
              transformOrigin: "center",
            }}
          >
            {p.label}
          </div>
        );
      })}
    </>
  );
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const btn =
    "size-8 bg-bonti-toolbar/85 text-white font-sofia text-base leading-none rounded-full flex items-center justify-center shadow active:scale-95";
  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
      <button type="button" aria-label="Zoom in"  onClick={() => zoomIn()}  className={btn}>+</button>
      <button type="button" aria-label="Zoom out" onClick={() => zoomOut()} className={btn}>−</button>
      <button type="button" aria-label="Reset zoom" onClick={() => resetTransform()} className={`${btn} text-xs`}>⤾</button>
    </div>
  );
}

/**
 * The EC11 festival map (the real isometric illustration EC publishes each
 * year) is the backdrop. Friend pins float on top at percent coordinates
 * derived from the 1000-unit positions stored in festival-state.
 *
 * Wrapped in react-zoom-pan-pinch so pinch (touch), scroll-wheel (desktop),
 * and drag-to-pan all work. Pin DOM lives inside the transformed element so
 * pins move + scale with the map.
 */
export function VenueMap({ pins = [], overlay, className }: Props) {
  return (
    <div
      className={[
        "relative w-full overflow-hidden rounded-xl border border-black/5 bg-[#0b3c1e]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ aspectRatio: "5236 / 3071" }}
    >
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={5}
        wheel={{ step: 0.2 }}
        doubleClick={{ mode: "toggle", step: 1.5 }}
        panning={{ velocityDisabled: false }}
      >
        <ZoomControls />
        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass="!w-full !h-full"
        >
          <div
            className="relative w-full h-full"
            role="img"
            aria-label="Electric Castle venue map with friend positions"
          >
            <Image
              src="/ec-map.png"
              alt=""
              fill
              priority
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-cover select-none pointer-events-none"
              draggable={false}
            />
            <Pins pins={pins} />
            {overlay}
          </div>
        </TransformComponent>
      </TransformWrapper>

      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-roboto text-white/80 bg-black/40 px-2 py-0.5 rounded-full pointer-events-none">
        Pinch or scroll to zoom · drag to pan
      </p>
    </div>
  );
}
