import fs from "fs";
import path from "path";
import matter from "gray-matter";

// 文章所在目录（中文注释）
export const CONTENT_DIR = path.join(process.cwd(), "content", "articles");

export interface ArticleMeta {
  slug: string;
  title: string;
  date: string; // ISO 字符串
  summary?: string;
  tags?: string[];
}

export interface Article extends ArticleMeta {
  content: string;
}

// 读取所有文章元信息
export function getAllArticles(): ArticleMeta[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  const items = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const full = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(full, "utf-8");
    const { data } = matter(raw);
    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      summary: data.summary || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
    } as ArticleMeta;
  });
  // 按时间倒序
  return items.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

// 读取单篇文章
export function getArticle(slug: string): Article {
  const full = path.join(CONTENT_DIR, `${slug}.md`);
  const raw = fs.readFileSync(full, "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title || slug,
    date: data.date || new Date().toISOString(),
    summary: data.summary || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    content,
  };
}

// 获取所有 slug 用于静态生成
export function getAllSlugs(): string[] {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

