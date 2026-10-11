# C++ 运行轨迹服务（仅限隔离的本机开发环境）

这部分来自李赫版本，用于编译用户输入的 C++ 并生成 DFS、BFS、DP 轨迹。它会执行不受信任的原生程序，因此没有接入生产 Node 服务，也不会被 `npm run public` 发布。

只有在受控开发机上、确认编译器和操作系统隔离措施后才能启用：

```powershell
$env:ALLOW_UNSAFE_CPP_RUNTIME = '1'
$env:SITE_ROOT = (Resolve-Path '..\..').Path
python .\runtime_server.py
```

默认只监听 `127.0.0.1:8765`。公网部署前至少需要容器隔离、非特权用户、CPU/内存/进程/文件限制、网络隔离、请求鉴权与队列限流；仅依赖当前的超时参数并不足以安全上线。
