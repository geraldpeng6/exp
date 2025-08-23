"use client";
import { useEffect, useRef, useState } from "react";
import { annotate } from "rough-notation";
import type { RoughAnnotation } from "rough-notation/lib/model";

// 使用 rough-notation 装饰品牌标题（中文注释）
export default function BrandDecor() {
  const ref = useRef<HTMLSpanElement>(null);
  const annotationRef = useRef<RoughAnnotation | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!ref.current || !mounted) return;

    // 清除之前的注释
    if (annotationRef.current) {
      annotationRef.current.remove();
    }

    // 检测当前主题
    const isDark = document.documentElement.classList.contains('dark');
    const color = isDark ? "#9ca3af" : "#374151"; // 黑夜模式用浅灰色，白天模式用深灰色

    // 创建新的注释
    const annotation = annotate(ref.current, {
      type: "underline",
      color: color,
      strokeWidth: 2,
      iterations: 1,
      animationDuration: 800
    });

    annotation.show();
    annotationRef.current = annotation;

    // 监听主题变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isDarkNow = document.documentElement.classList.contains('dark');
          const newColor = isDarkNow ? "#9ca3af" : "#374151";

          // 重新创建注释
          if (annotationRef.current) {
            annotationRef.current.remove();
          }

          if (ref.current) {
            const newAnnotation = annotate(ref.current, {
              type: "underline",
              color: newColor,
              strokeWidth: 2,
              iterations: 1,
              animationDuration: 0 // 主题切换时不需要动画
            });
            newAnnotation.show();
            annotationRef.current = newAnnotation;
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      observer.disconnect();
      if (annotationRef.current) {
        annotationRef.current.remove();
      }
    };
  }, [mounted]);

  return (
    <span ref={ref} style={{ display: "inline-block" }}>
      Peng's Blog
    </span>
  );
}

