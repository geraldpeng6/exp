// Shared nickname update API wrapper
// Ensures both dice random rename and manual input rename call the same backend endpoint

export type UpdateNicknameResult =
  | { ok: true; avatarUrlOverride?: string }
  | { ok: false; cancelled?: boolean; error?: string };

// Unified nickname update: PUT /api/users with optional activationPassword
export async function updateNicknameUnified(
  userId: string,
  nextNickname: string
): Promise<UpdateNicknameResult> {
  type UpdateUserOk = { success: true; data: { avatarUrl?: string }; requirePassword?: true; message?: string };
  type UpdateUserErr = { success: false; error: string };
  type UpdateUserResponse = UpdateUserOk | UpdateUserErr;

  const tryUpdate = async (pwd?: string) => {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, nickname: nextNickname, ...(pwd ? { activationPassword: pwd } : {}) }),
    });
    const data = (await res.json().catch(() => ({}))) as UpdateUserResponse;
    return { ok: res.ok, data } as { ok: boolean; data: UpdateUserResponse };
  };

  let result = await tryUpdate();
  if (result.ok && 'requirePassword' in result.data && result.data.requirePassword) {
    const pwd = typeof window !== 'undefined' ? window.prompt(('message' in result.data && result.data.message) || '请输入激活密码（首次激活会设置此密码）') : '';
    if (!pwd || !pwd.trim()) return { ok: false, cancelled: true };
    result = await tryUpdate(pwd.trim());
  }

  if (!result.ok) {
    const err = ('error' in result.data && result.data.error) || '更新失败';
    return { ok: false, error: err };
  }
  if ('requirePassword' in result.data && result.data.requirePassword) {
    return { ok: false, cancelled: true };
  }
  const override = ('success' in result.data && result.data.success && 'data' in result.data) ? (result.data.data.avatarUrl) : undefined;
  return { ok: true, avatarUrlOverride: override };
}

