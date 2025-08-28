import { getDatabase, withTransaction } from '@/lib/database/connection';
import { hashPassword, verifyPassword } from '@/lib/security/password';

export interface UserActivationRecord {
  userId: string;
  name: string; // special nickname key
  pwdHash: string;
  createdAt: number;
  updatedAt: number;
}

export function ensureUserActivationTable() {
  const db = getDatabase();
  db.exec(`CREATE TABLE IF NOT EXISTS special_activations_user (
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    pwd_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY(user_id, name)
  );`);
}

export function setActivationPasswordForUser(userId: string, name: string, password: string) {
  return withTransaction(db => {
    ensureUserActivationTable();
    const now = Math.floor(Date.now() / 1000);
    const hash = hashPassword(password);
    db.prepare(`INSERT INTO special_activations_user(user_id, name, pwd_hash, created_at, updated_at) VALUES (?,?,?,?,?)
                ON CONFLICT(user_id, name) DO UPDATE SET pwd_hash=excluded.pwd_hash, updated_at=excluded.updated_at`).run(userId, name, hash, now, now);
  });
}

export function hasActivationPasswordForUser(userId: string, name: string): boolean {
  ensureUserActivationTable();
  const db = getDatabase();
  const row = db.prepare(`SELECT 1 FROM special_activations_user WHERE user_id=? AND name=?`).get(userId, name) as { 1?: number } | undefined;
  return !!row;
}

export function verifyActivationForUser(userId: string, name: string, password: string): boolean {
  ensureUserActivationTable();
  const db = getDatabase();
  const row = db.prepare(`SELECT pwd_hash FROM special_activations_user WHERE user_id=? AND name=?`).get(userId, name) as { pwd_hash: string } | undefined;
  if (!row) return false;
  return verifyPassword(password, row.pwd_hash);
}

