/**
 * <PoweredBy /> — the "Powered by DashForDevs" credit strip.
 *
 * A plain presentational component (no hooks), so it renders on the SERVER too and
 * ships in the SSR HTML — no post-hydration DOM injection, no layout shift, and it's
 * indexable. Drop it in a site's footer. Style it with `className`; the referral link
 * back to DashForDevs is baked in.
 *
 * React.createElement (not JSX) so it bundles cleanly as a dependency across bundlers.
 */

import React from "react";

const DEFAULT_HREF = "https://www.dashfordevs.com";

export function PoweredBy(props) {
  const href = props.href || DEFAULT_HREF;
  const className = props.className || "";
  const label = props.label || "Powered by";

  return React.createElement(
    "div",
    { className: className, "data-dashfordevs": "powered-by" },
    label + " ",
    React.createElement(
      "a",
      {
        href: href,
        target: "_blank",
        rel: "noopener noreferrer",
        style: { fontWeight: 600, textDecoration: "none", color: "inherit" },
      },
      "DashForDevs",
    ),
  );
}

export default PoweredBy;
