// 统一拦截 markdown 内部锚点点击，仅处理 href 以 # 开头的链接
export function interceptInPageAnchors(
  container: Element,
  navigate: (id: string) => void
): () => void {
  const handler = (ev: Event) => {
    const path = (ev as unknown as { composedPath?: () => EventTarget[] }).composedPath?.();
    const target = (path ? (path.find((n) => (n as Element)?.tagName === 'A') as HTMLAnchorElement | undefined) : undefined)
                  || (ev.target as HTMLElement | null)?.closest?.('a') || null;
    if (!target) return;
    const href = target.getAttribute('href') || '';
    if (!href || href[0] !== '#') return;
    ev.preventDefault?.();
    (ev as unknown as { stopPropagation?: () => void }).stopPropagation?.();
    const id = decodeURIComponent(href.slice(1));
    try { history.pushState?.(null, '', `#${encodeURIComponent(id)}`); } catch {}
    navigate(id);
  };

  container.addEventListener('click', handler as EventListener, true);
  return () => container.removeEventListener('click', handler as EventListener, true);
}

