import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { CONTENT_DIR } from '@/lib/articles';

export interface AdminArticleMeta {
  slug: string;
  title: string;
  // 文章 frontmatter 的 date 字段保留 ISO 字符串（内容展示语义），非数据库时间戳
  date: string;
  summary?: string;
  tags?: string[];
}

export interface AdminArticle extends AdminArticleMeta {
  content: string;
}

export function listArticles(): AdminArticleMeta[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  return files.map((file) => {
    const slug = file.replace(/\.md$/, '');
    const full = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(full, 'utf-8');
    const { data } = matter(raw);
    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      summary: data.summary || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
    } as AdminArticleMeta;
  }).sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function readArticle(slug: string): AdminArticle | null {
  const full = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(full)) return null;
  const raw = fs.readFileSync(full, 'utf-8');
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title || slug,
    date: data.date || new Date().toISOString(),
    summary: data.summary || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    content,
  };
}

export function saveArticle(input: AdminArticle): void {
  const file = path.join(CONTENT_DIR, `${input.slug}.md`);
  const fm = matter.stringify(input.content, {
    title: input.title || input.slug,
    date: input.date || new Date().toISOString(),
    summary: input.summary || '',
    tags: input.tags || [],
  });
  fs.writeFileSync(file, fm, 'utf-8');
}

export function deleteArticle(slug: string): boolean {
  const file = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

