import React from "react";

type HtmlTag = 'div' | 'span' | 'section' | 'header' | 'footer' | 'nav' | 'aside' | 'article' | 'main' | 'button' | 'a' | 'ul' | 'ol' | 'li';

type HtmlPropsFor<Tag extends HtmlTag> = React.ComponentPropsWithoutRef<Tag>;

type PolymorphicProps<Tag extends HtmlTag> = {
  as?: Tag;
  className?: string;
} & HtmlPropsFor<Tag>;

export type FrostedProps<Tag extends HtmlTag = 'div'> = PolymorphicProps<Tag>;

/**
 * Frosted: reusable frosted glass surface.
 * Great for overlays, toolbars, floating buttons.
 */
export default function Frosted<Tag extends HtmlTag = 'div'>({ as, className = "", children, ...rest }: FrostedProps<Tag>) {
  const TagComp: HtmlTag = (as || 'div') as HtmlTag;
  const props = rest as HtmlPropsFor<Tag> as Record<string, unknown>;
  return React.createElement(
    TagComp,
    { ...props, className: `frosted-surface ${className}` },
    children
  );
}

