import { getDatabase, withTransaction } from '@/lib/database/connection';
import { hashPassword, verifyPassword } from '@/lib/security/password';
import { sanitizeNickname } from '@/lib/security/sanitization';

export interface SpecialNameRule {
  name: string;
  avatarUrl: string;
  pwdHash: string | null;
  createdAt: number;
  updatedAt: number;
}

export function ensureSpecialNamesTable() {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS special_names (
    name TEXT PRIMARY KEY,
    avatar_url TEXT NOT NULL,
    pwd_hash TEXT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );`);
}

export function getRuleByName(name: string): SpecialNameRule | null {
  ensureSpecialNamesTable();
  const db = getDatabase();
  const key = sanitizeNickname(name).trim();
  if (!key) return null;
  const row = db.prepare(`
    SELECT name, avatar_url as avatarUrl, pwd_hash as pwdHash, created_at as createdAt, updated_at as updatedAt
    FROM special_names WHERE name = ?
  `).get(key) as SpecialNameRule | undefined;
  return row || null;
}

export function upsertRule(name: string, avatarUrl: string, password?: string) {
  return withTransaction(db => {
    ensureSpecialNamesTable();
    const key = sanitizeNickname(name).trim();
    if (!key) throw new Error('规则名不能为空');
    const now = Math.floor(Date.now() / 1000);
    const pwdHash = password ? hashPassword(password) : null;
    const existing = db.prepare(`SELECT name FROM special_names WHERE name = ?`).get(key);
    if (existing) {
      db.prepare(`UPDATE special_names SET avatar_url=?, updated_at=?${pwdHash ? ', pwd_hash=?' : ''} WHERE name=?`)
        .run(pwdHash ? [avatarUrl, now, pwdHash, key] : [avatarUrl, now, key]);
    } else {
      db.prepare(`INSERT INTO special_names(name, avatar_url, pwd_hash, created_at, updated_at) VALUES(?,?,?,?,?)`)
        .run(key, avatarUrl, pwdHash, now, now);
    }
  });
}

export function setRulePassword(name: string, password: string) {
  return withTransaction(db => {
    ensureSpecialNamesTable();
    const key = sanitizeNickname(name).trim();
    if (!key) throw new Error('规则名不能为空');
    const now = Math.floor(Date.now() / 1000);
    const pwdHash = hashPassword(password);
    db.prepare(`UPDATE special_names SET pwd_hash=?, updated_at=? WHERE name=?`).run(pwdHash, now, key);
  });
}

export function verifyRulePassword(name: string, password: string): boolean {
  ensureSpecialNamesTable();
  const rule = getRuleByName(name);
  if (!rule || !rule.pwdHash) return false;
  return verifyPassword(password, rule.pwdHash);
}

