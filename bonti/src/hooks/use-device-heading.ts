"use client";

import { useEffect, useState } from "react";

type Permission = "default" | "granted" | "denied" | "unavailable";

type IOSDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type CompassEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

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
 */
export function useDeviceHeading(): {
  heading: number | null;
  permission: Permission;
  supported: boolean;
  requestPermission: () => Promise<void>;
} {
  const [heading, setHeading] = useState<number | null>(null);
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
    if (!ios) attach();

    function attach() {
      window.addEventListener("deviceorientation", onOrientation, true);
      setPermission("granted");
    }

    function onOrientation(e: DeviceOrientationEvent) {
      const evt = e as CompassEvent;
      if (typeof evt.webkitCompassHeading === "number") {
        setHeading(evt.webkitCompassHeading);
        return;
      }
      if (e.absolute && e.alpha !== null) {
        setHeading((360 - e.alpha) % 360);
      }
    }

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
    };
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
        window.addEventListener("deviceorientation", (e) => {
          const evt = e as CompassEvent;
          if (typeof evt.webkitCompassHeading === "number") {
            setHeading(evt.webkitCompassHeading);
          } else if (e.absolute && e.alpha !== null) {
            setHeading((360 - e.alpha) % 360);
          }
        }, true);
      }
    } catch {
      setPermission("denied");
    }
  };

  return { heading, permission, supported, requestPermission };
}
