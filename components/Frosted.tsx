import React from "react";

export interface FrostedProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Frosted: reusable frosted glass surface.
 * Great for overlays, toolbars, floating buttons.
 */
export default function Frosted({ as = "div", className = "", children, ...rest }: FrostedProps) {
  const Tag = as as any;
  return (
    <Tag className={`frosted-surface ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

