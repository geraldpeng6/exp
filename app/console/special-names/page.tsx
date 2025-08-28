"use client";

import { useEffect, useState } from 'react';

interface Rule {
  name: string;
  avatarUrl: string;
  hasPassword: 0 | 1;
  createdAt: number;
  updatedAt: number;
}

export default function SpecialNamesConsole() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', avatarUrl: '', password: '' });
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/special-names');
      const data = await res.json();
      if (res.ok) setRules(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const saveRule = async () => {
    if (!form.name.trim() || !form.avatarUrl.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/special-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          avatarUrl: form.avatarUrl.trim(),
          password: form.password.trim() || undefined,
        })
      });
      if (res.ok) {
        setForm({ name: '', avatarUrl: '', password: '' });
        await fetchRules();
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (name: string) => {
    if (!confirm(`确定删除规则：${name}？`)) return;
    const res = await fetch(`/api/admin/special-names?name=${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    if (res.ok) await fetchRules();
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>特殊昵称管理</h1>
      <p style={{ color: '#666' }}>在此管理彩蛋昵称、其头像 CDN 链接，以及可选的全局密码。</p>

      <div style={{ display: 'grid', gap: 12, maxWidth: 640, marginTop: 16 }}>
        <input
          placeholder="昵称（精确匹配）"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <input
          placeholder="头像 CDN 链接"
          value={form.avatarUrl}
          onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))}
        />
        <input
          placeholder="密码（留空则不变或不设置）"
          type="password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        />
        <button onClick={saveRule} disabled={saving}>{saving ? '保存中...' : '保存规则（创建或更新）'}</button>
      </div>

      <h2 style={{ marginTop: 24 }}>规则列表</h2>
      {loading ? (
        <div>加载中...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>昵称</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>头像</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>是否有密码</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.name}>
                <td style={{ padding: 8 }}>{r.name}</td>
                <td style={{ padding: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.avatarUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                  <div style={{ fontSize: 12, color: '#666' }}>{r.avatarUrl}</div>
                </td>
                <td style={{ padding: 8 }}>{r.hasPassword ? '是' : '否'}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => setForm({ name: r.name, avatarUrl: r.avatarUrl, password: '' })}>编辑</button>
                  <button style={{ marginLeft: 8 }} onClick={() => deleteRule(r.name)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

