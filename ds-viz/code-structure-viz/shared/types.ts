/**
 * 前后端共享类型定义
 */

export interface RunRequest {
  /** C 源代码 */
  code: string;
  /** 标准输入，可选 */
  stdin?: string;
  /** 可选文件名，默认 main.c */
  filename?: string;
}

export interface RunResponse {
  /** 是否成功执行（编译+运行均无致命错误） */
  success: boolean;
  /** 编译器输出（警告/错误） */
  compileOutput: string;
  /** 是否存在编译错误 */
  compileError: boolean;
  /** 程序标准输出 */
  stdout: string;
  /** 程序标准错误 */
  stderr: string;
  /** 退出码，null 表示超时或被杀 */
  exitCode: number | null;
  /** 执行耗时（毫秒） */
  executionTime: number;
  /** 终止信号（如 SIGKILL / TIMEOUT） */
  signal?: string | null;
  /** 使用的执行后端 */
  backend: 'local' | 'remote';
  /** 编译器标识 */
  compiler: string;
}

export interface HealthResponse {
  status: 'ok';
  compiler: string;
  backend: 'local' | 'remote';
}

/** 后端执行统一返回结构（含可能的错误信息） */
export interface ExecuteError extends RunResponse {
  error?: string;
}
