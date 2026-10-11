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
- **建议选 Private**：`DEPLOY_LOCAL.md` 里记录了本地数据库密码 `ic_local_2026` 和管理员初始密码 `Admin@2026`，公开仓库会暴露这些信息
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

## 备注

- 仓库里不含 `server/public/`（前端发布目录已在 `.gitignore` 中）。他人 clone 后需要先 `cd server && npm install`，安装脚本会自动从仓库根目录生成 public 目录。
- 若后续要公开此仓库，建议先把 `DEPLOY_LOCAL.md` 中的密码替换为占位符。
