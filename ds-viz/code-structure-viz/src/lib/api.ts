import type { RunRequest, RunResponse, HealthResponse } from '@shared/types';

/**
 * 编译并执行 C 代码
 */
export async function runCode(
  req: RunRequest,
  signal?: AbortSignal,
): Promise<RunResponse> {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) {
    throw new Error(`请求失败：HTTP ${res.status}`);
  }
  return (await res.json()) as RunResponse;
}

/**
 * 健康检查，获取编译器信息
 */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as HealthResponse;
}
