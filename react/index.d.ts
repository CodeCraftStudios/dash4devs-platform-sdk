import type * as React from "react";

export interface DashImageVariant {
  width: number;
  url: string;
}

export interface DashImageData {
  url: string;
  lqip?: string | null;
  variants_ready?: boolean;
  variants?: {
    webp?: DashImageVariant[];
    avif?: DashImageVariant[];
  };
  width?: number;
  height?: number;
}

export interface DashImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** Pre-generated responsive image data (variants + LQIP). Preferred. */
  image?: DashImageData | null | undefined;
  /**
   * Bare image URL fallback so <DashImage> is a drop-in for <img>/<Image>.
   * Used only when `image` is not supplied; renders the original (no variant
   * srcset) until variant data is available for that url.
   */
  src?: string | null;
  alt?: string;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  noBlur?: boolean;
  fill?: boolean;
}

export function DashImage(props: DashImageProps): React.ReactElement | null;
export default DashImage;

export interface PoweredByProps {
  /** Style it to fit your footer. */
  className?: string;
  /** Override the referral link (defaults to https://www.dashfordevs.com). */
  href?: string;
  /** Leading text (defaults to "Powered by"). */
  label?: string;
}

/** "Powered by DashForDevs" credit strip — server-renderable, drop in a footer. */
export function PoweredBy(props: PoweredByProps): React.ReactElement;

export interface MaintenancePageProps {
  /** Small brand label above the title (ignored if `logoUrl` is set). */
  brand?: string;
  /** Headline. Defaults to "We'll be right back". */
  title?: string;
  /** Body copy. Falls back to a generic maintenance message. */
  message?: string | null;
  /** Optional "expected back" hint. */
  until?: string | null;
  /** Logo image URL shown above the title. */
  logoUrl?: string | null;
  /** Support mailto shown at the bottom. */
  supportEmail?: string | null;
  /** Accent color for the dot / brand / links. Defaults to indigo. */
  accent?: string;
  /** Auto-reload interval in seconds so visitors recover hands-free. 0 disables. Default 30. */
  refreshSeconds?: number;
}

/**
 * Self-contained "we'll be right back" page the SDK falls back to when the
 * backend is unreachable or maintenance is on. Inline-styled + server-renderable,
 * so it works even if the CDN/stylesheets are down. Pair with getMaintenanceStatus().
 */
export function MaintenancePage(
  props?: MaintenancePageProps,
): React.ReactElement;
