/**
 * C 代码执行路由
 * POST /api/run   —— 编译并执行 C 代码
 * GET  /api/health —— 健康检查 + 编译器信息
 */
import { Router, type Request, type Response } from 'express';
import { executeCode, getHealth } from '../services/executionService';
import type { RunRequest } from '@shared/types';

const router = Router();

/**
 * POST /api/run
 * 编译并执行 C 代码
 */
router.post('/run', async (req: Request, res: Response): Promise<void> => {
  const { code, stdin } = (req.body ?? {}) as RunRequest;

  if (typeof code !== 'string' || code.trim().length === 0) {
    res.status(400).json({
      success: false,
      compileOutput: '',
      compileError: true,
      stdout: '',
      stderr: '请求体缺少有效的 code 字段',
      exitCode: null,
      executionTime: 0,
      signal: null,
      backend: 'remote',
      compiler: 'unknown',
      error: 'invalid_code',
    });
    return;
  }

  try {
    const result = await executeCode({ code, stdin });
    res.status(200).json(result);
  } catch (err: unknown) {
    const e = err as Error;
    res.status(200).json({
      success: false,
      compileOutput: '',
      compileError: false,
      stdout: '',
      stderr: `执行服务错误：${e.message || '未知错误'}`,
      exitCode: null,
      executionTime: 0,
      signal: null,
      backend: 'remote',
      compiler: 'unknown',
      error: 'execution_error',
    });
  }
});

/**
 * GET /api/health
 * 健康检查，返回编译器版本
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const health = await getHealth();
    res.status(200).json(health);
  } catch {
    res.status(200).json({ status: 'ok', compiler: 'unknown', backend: 'remote' });
  }
});

export default router;
