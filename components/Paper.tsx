import React from "react";

type HtmlTag = 'div' | 'span' | 'section' | 'header' | 'footer' | 'nav' | 'aside' | 'article' | 'main' | 'button' | 'a' | 'ul' | 'ol' | 'li';

type HtmlPropsFor<Tag extends HtmlTag> = React.ComponentPropsWithoutRef<Tag>;

type PolymorphicProps<Tag extends HtmlTag> = {
  as?: Tag;
  className?: string;
} & HtmlPropsFor<Tag>;

export type PaperProps<Tag extends HtmlTag = 'div'> = PolymorphicProps<Tag>;

/**
 * Paper: reusable white-paper surface with subtle grain.
 * Modular & pluggable: simply wrap any content to get the effect.
 */
export default function Paper<Tag extends HtmlTag = 'div'>({ as, className = "", children, ...rest }: PaperProps<Tag>) {
  const TagComp: HtmlTag = (as || 'div') as HtmlTag;
  const props = rest as HtmlPropsFor<Tag> as Record<string, unknown>;
  return React.createElement(
    TagComp,
    { ...props, className: `paper-surface paper-edge ${className}` },
    children
  );
}

