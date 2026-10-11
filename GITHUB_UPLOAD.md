# 上传到 GitHub

本地仓库已经建好并提交完成，剩下两步需要在 GitHub 网页端操作（本机到 github.com 的 HTTPS 被网络阻断，且 GitHub 集成没有创建仓库的权限），做完之后双击 `push-github.bat` 即可推送。

## 当前状态

| 项 | 值 |
| --- | --- |
| 本地仓库 | 已 `git init`，分支 `main` |
| 首次提交 | 225 个文件，约 6.4 MB |
| 已排除 | `server/.env`（含数据库密码与 JWT 密钥）、`node_modules/`、`server/public/`、`phone-access.html` |
| GitHub 账号 | `yjqm` |
| 推送方式 | SSH（`git@github.com:yjqm/<repo>.git`）—— HTTPS 在本机不通 |

## 第一步：添加 SSH 公钥

打开 https://github.com/settings/ssh/new

- Title：`WorkBuddy-Lenovo-PC`
- Key type：Authentication Key
- Key：复制下面这行（也可直接打开 `github-ssh-key.pub`）

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEKbawjuEUDdtnRvcshMVxCR4G1ibdzIaINshhRRIrSH yjqm@users.noreply.github.com
```

点 Add SSH key。

## 第二步：创建空仓库

打开 https://github.com/new

- Repository name：`agentic-ai-teaching-platform`
- Description：可留空
- **建议选 Private**：`DEPLOY_LOCAL.md` 里记录了本地数据库密码 `〈本机数据库密码〉` 和管理员初始密码 `〈本机管理员密码〉`，公开仓库会暴露这些信息
- **不要勾选** "Add a README file" / "Add .gitignore" / "Choose a license"，保持完全空仓库

点 Create repository。

## 第三步：推送

双击项目根目录的 `push-github.bat`：

- 直接回车使用默认仓库名 `agentic-ai-teaching-platform`，或输入你自定义的仓库名
- 脚本会先验证 SSH 授权是否生效，通过后再 `git push -u origin main`

## 手动推送（可选）

不想用脚本就在项目根目录执行：

```bash
git remote add origin git@github.com:yjqm/agentic-ai-teaching-platform.git
git push -u origin main
```

## GitHub Pages 静态预览站

仓库公开且自带 `.github/workflows/pages.yml`，push 到 `main` 会自动发布纯前端静态站。

| 项 | 值 |
| --- | --- |
| 访问地址 | https://yjqm.github.io/xing1/ |
| 启用方式 | Settings → Pages → Build and deployment → Source 选 **GitHub Actions** |
| 触发 | push 到 `main`，或在 Actions 页手动 Run workflow |
| 构建内容 | `node server/scripts/sync-public.js` 生成的 `server/public`（白名单同步，不含后端源码） |

**能力边界**：Pages 只托管静态文件，跑不了 Node 后端和 MySQL，因此登录/注册、学习进度同步、社区发帖、每日挑战均不可用；页面浏览、算法可视化、题库浏览正常。不要把这个地址当作正式教学地址使用。

## 备注

- 仓库里不含 `server/public/`（前端发布目录已在 `.gitignore` 中）。他人 clone 后需要先 `cd server && npm install`，安装脚本会自动从仓库根目录生成 public 目录。
- 若后续要公开此仓库，建议先把 `DEPLOY_LOCAL.md` 中的密码替换为占位符（已处理）。
- `start-local.bat` / `stop-local.bat` 中保留了本机 MySQL 密码，因为它们是本机启动脚本的必需参数；数据库仅监听 `127.0.0.1`。
