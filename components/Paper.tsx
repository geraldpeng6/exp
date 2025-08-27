import React from "react";

export interface PaperProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Paper: reusable white-paper surface with subtle grain.
 * Modular & pluggable: simply wrap any content to get the effect.
 */
export default function Paper({ as = "div", className = "", children, ...rest }: PaperProps) {
  const Tag = as as any;
  return (
    <Tag className={`paper-surface paper-edge ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

