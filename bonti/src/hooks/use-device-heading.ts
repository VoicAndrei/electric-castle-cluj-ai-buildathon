"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type Permission = "default" | "granted" | "denied" | "unavailable";

type IOSDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

// `deviceorientation` is a browser-singleton event. Keep one listener and one
// heading value at module scope; every hook instance subscribes to the same
// source so iOS permission granted via one consumer reaches all of them.
let sharedHeading: number | null = null;
let listenerAttached = false;
const subscribers = new Set<() => void>();

function readSharedHeading(): number | null {
  return sharedHeading;
}

function subscribeShared(notify: () => void): () => void {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

function onOrientation(e: DeviceOrientationEvent) {
  const evt = e as CompassEvent;
  let next: number | null = null;
  if (typeof evt.webkitCompassHeading === "number") {
    next = evt.webkitCompassHeading;
  } else if (e.absolute && e.alpha !== null) {
    next = (360 - e.alpha) % 360;
  }
  if (next === null || next === sharedHeading) return;
  sharedHeading = next;
  subscribers.forEach((notify) => notify());
}

function attachListenerOnce() {
  if (listenerAttached || typeof window === "undefined") return;
  window.addEventListener("deviceorientation", onOrientation, true);
  listenerAttached = true;
}

/**
 * Real device compass heading in degrees clockwise from magnetic north
 * (0 = North, 90 = East, 180 = South, 270 = West).
 *
 * On iOS Safari we use `webkitCompassHeading` (it's already absolute to north
 * and doesn't need flipping). On Android/desktop we fall back to `360 - alpha`
 * when `absolute` is true. If absolute orientation isn't available the hook
 * stays at `null` — callers should render a static bearing instead.
 *
 * iOS requires a user gesture to grant permission; the returned
 * `requestPermission` triggers the prompt. On other platforms the hook
 * attaches the listener automatically.
 *
 * Heading is shared across all hook instances on the page via a module-level
 * listener — granting iOS permission from any instance delivers heading to
 * every consumer, so callers without a permission UI can still receive it.
 */
export function useDeviceHeading(): {
  heading: number | null;
  permission: Permission;
  supported: boolean;
  requestPermission: () => Promise<void>;
} {
  const heading = useSyncExternalStore(subscribeShared, readSharedHeading, readSharedHeading);
  const [permission, setPermission] = useState<Permission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("DeviceOrientationEvent" in window)) {
      setSupported(false);
      setPermission("unavailable");
      return;
    }
    setSupported(true);

    const ios = typeof (window.DeviceOrientationEvent as IOSDeviceOrientationEvent).requestPermission === "function";
    if (!ios) {
      attachListenerOnce();
      setPermission("granted");
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window === "undefined") return;
    const ctor = window.DeviceOrientationEvent as IOSDeviceOrientationEvent;
    if (typeof ctor.requestPermission !== "function") {
      // Non-iOS: listener already attached in the effect.
      return;
    }
    try {
      const result = await ctor.requestPermission();
      setPermission(result === "granted" ? "granted" : "denied");
      if (result === "granted") {
        attachListenerOnce();
      }
    } catch {
      setPermission("denied");
    }
  };

  return { heading, permission, supported, requestPermission };
}
