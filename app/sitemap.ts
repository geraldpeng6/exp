import { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/articles";

// 简单站点地图（中文注释）
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const pages: MetadataRoute.Sitemap = ["/"].map((p) => ({ url: base + p }));
  const arts = getAllArticles().map((a) => ({ url: base + "/articles/" + a.slug, lastModified: a.date }));
  return [...pages, ...arts];
}

