// pm2 进程守护配置（Linux / Ubuntu 服务器）
// 用法：
//   npm i -g pm2                       # 全局安装一次
//   pm2 start ecosystem.config.js      # 启动
//   pm2 save                           # 保存进程列表
//   pm2 startup                        # 生成开机自启命令，按提示执行
//   pm2 reload interactive-classroom   # 平滑重启（发布新代码，几乎无感）
//   pm2 logs interactive-classroom     # 查看日志
//
// 说明：
//   - cluster 模式起 2 个实例，利用 2 核 CPU，发布时 pm2 reload 逐个重启、不中断服务；
//   - 限流（express-rate-limit）是进程内存计数，多实例下各自计数、实际限流会放宽；
//     若对暴力破解防护有严格要求，需改用共享存储（如 redis）或用单实例 fork 模式。

module.exports = {
  apps: [
    {
      name: 'interactive-classroom',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      // 静默退出：收到 SIGTERM 后等现有请求处理完再退出（配合 pm2 reload 实现无感发布）
      kill_timeout: 5000,
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      time: true
    }
  ]
};
