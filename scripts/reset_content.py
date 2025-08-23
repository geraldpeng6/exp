#!/usr/bin/env python3
"""
Reset content and purge related DB data.
- Deletes all Markdown articles under content/articles
- Clears DB rows in articles (cascades to comments and likes)
- Prints before/after counts for verification

Run with: uv run python3 scripts/reset_content.py
"""
import os
import glob
import sqlite3
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ARTICLES_DIR = os.path.join(ROOT, 'content', 'articles')
DB_PATH = os.path.join(ROOT, 'data', 'blog.db')


def count_rows(cur):
    def one(sql):
        cur.execute(sql)
        return cur.fetchone()[0]
    return {
        'users': one('SELECT COUNT(*) FROM users'),
        'articles': one('SELECT COUNT(*) FROM articles'),
        'comments': one('SELECT COUNT(*) FROM comments'),
        'likes': one('SELECT COUNT(*) FROM likes'),
    }


def main():
    print('=== Reset Content & DB ===')
    print('Root:', ROOT)
    print('Articles dir:', ARTICLES_DIR)
    print('DB:', DB_PATH)

    # 1) Delete all markdown files under content/articles
    if not os.path.isdir(ARTICLES_DIR):
        raise SystemExit(f"Articles directory not found: {ARTICLES_DIR}")

    md_files = sorted(glob.glob(os.path.join(ARTICLES_DIR, '*.md')))
    print(f'Found {len(md_files)} article file(s). Deleting...')
    deleted = 0
    for p in md_files:
        try:
            os.remove(p)
            deleted += 1
        except Exception as e:
            print('Failed to delete', p, e)
    print(f'Deleted {deleted} markdown file(s).')

    # 2) Purge DB data for articles (cascade will remove comments & likes)
    if not os.path.exists(DB_PATH):
        print('DB does not exist yet; skipping DB purge.')
        return

    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA foreign_keys = ON')
    cur = conn.cursor()

    try:
        before = count_rows(cur)
        print('DB counts before:', before)

        # Delete all article rows -> CASCADE removes dependent rows
        cur.execute('DELETE FROM articles')
        conn.commit()

        after = count_rows(cur)
        print('DB counts after:', after)

    finally:
        conn.close()

    print('Done at', datetime.now().isoformat())


if __name__ == '__main__':
    main()

