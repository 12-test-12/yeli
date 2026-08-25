# YeLi's Blog

> 一个深色全屏极客风的个人数字花园。
> 基于 Hugo + Stack 主题魔改。

参考样式：
- [Matheus Laidler](https://matheuslaidler.github.io/) — 系列文章结构
- [BobcGn-Blogs](https://bobcgn.github.io/BobcGn-Blogs/) — 数字花园理念

---

## 目录结构

```
blog/
├── content/
│   ├── posts/             # 所有文章 Markdown
│   ├── page/              # 单页 (about / links / archives / search)
│   └── *.md
├── archetypes/            # 4 类文章模板
│   ├── posts.md           # 技术笔记
│   ├── project.md         # 项目分享
│   ├── devlog.md          # 开发记录
│   └── essay.md           # 杂谈随笔
├── static/
│   ├── css/geek.css       # 深色全屏极客风样式
│   ├── js/geek.js         # 打字机 + 快捷键 + console 彩蛋
│   ├── img/               # 图片 (avatar.png 等)
│   └── favicon.svg
├── layouts/
│   └── index.html         # 覆写首页 (个人 IP Hero)
├── .github/workflows/     # 自动部署到 GitHub Pages
├── hugo.yaml              # 主配置
└── .gitignore
```

---

## 本地预览

### 1. 安装 Hugo extended

> Stack 主题用 SCSS，**必须**装 extended 版。

- macOS: `brew install hugo`
- Windows: `choco install hugo-extended` 或去 [GitHub Releases](https://github.com/gohugoio/hugo/releases) 下载
- Linux: 参见 [官方文档](https://gohugo.io/installation/linux/)

验证：

```bash
hugo version
# 末尾必须是 +extended
```

### 2. 安装 Stack 主题

```bash
# 方式 A：作为子模块（推荐）
git init
git submodule add https://github.com/CaiJimmy/hugo-theme-stack/ themes/hugo-theme-stack

# 方式 B：直接克隆
git clone https://github.com/CaiJimmy/hugo-theme-stack/ themes/hugo-theme-stack
```

### 3. 启动本地预览

```bash
cd blog
hugo server -D
```

打开 <http://localhost:1313> 即可看到效果。

> `-D` 表示包含 draft 文章。正式发布去掉这个 flag。

---

## 写一篇新文章

```bash
# 技术笔记
hugo new posts/my-tech-note.md

# 项目分享
hugo new project/my-project.md      # 注意：是放在 posts/project/ 目录下

# 实际命令
hugo new --kind project posts/my-project.md
hugo new --kind devlog  posts/my-devlog.md
hugo new --kind essay   posts/my-essay.md
```

然后在 `content/posts/` 找到对应文件，编辑 Markdown。

---

## 发布到 GitHub Pages（Project Pages 模式）

> 你的仓库是 **`yeli`**（账号 `12-test-12`），URL 为 `https://github.com/12-test-12/yeli`。
> 这是 **Project Pages**（不是 `github.io` 用户站点），所以要配 `/yeli/` 后缀。
> - **仓库名**：`yeli`（不要求以 `.github.io` 结尾）
> - **访问地址**：`https://12-test-12.github.io/yeli/`

### 部署方式说明

本项目用 **`peaceiris/actions-gh-pages` 推 `gh-pages` 分支**的经典方案，
**不依赖 GitHub Pages Deployment API**，所以不会触发 `configure-pages` 那个 `Not Found` 错误。

代价只是需要在 **第一次部署后**去 GitHub 网页手动选一次分支（之后全自动）。

### 一次性设置

#### ① 在 GitHub 新建 repo

- 仓库名：**`yeli`**
- 可见性：Public
- 不要勾选 "Add a README" / ".gitignore" / "license"

#### ② 配置 Actions 写权限

- 进入新 repo → **Settings → Actions → General → Workflow permissions**
- 勾选 **✅ Read and write permissions**
- Save

> 这一步**只做一次**。之后所有 push 都用 `GITHUB_TOKEN` 自动 push 到 `gh-pages` 分支。

### 本地初始化 + 推送

```bash
cd d:\yeli\blog

# 1) 初始化 git
git init
git add .
git commit -m "init: yeli"

# 2) 默认分支改名（GitHub 默认分支是 main）
git branch -M main

# 3) 关联远程仓库
git remote add origin https://github.com/12-test-12/yeli.git

# 4) 第一次推送
git push -u origin main
```

> 推送时如果弹出登录框，输入 GitHub 账号 `12-test-12` + PAT（不是密码）。  
> 没 PAT 的去 <https://github.com/settings/tokens> 生成一个，勾选 `repo` 权限。

### ③ 第一次部署后：在 GitHub 网页选分支

Actions 跑完后，会出现一个 `gh-pages` 分支。这时还需要做**最后一步**：

1. 打开 repo → **Settings → Pages**
2. **Source** 选 **Deploy from a branch**
3. **Branch** 选 `gh-pages` / `(root)`
4. Save

> 这只是**第一次**需要做。GitHub 会记住这个设置，之后自动生效。

### 验证

打开 `https://12-test-12.github.io/yeli/` 看到你的博客即可。

### 后续发布

```bash
git add .
git commit -m "new post: xxx"
git push
```

每次 push 到 `main`，Actions 会自动重新构建并推 `gh-pages` 分支，1-2 分钟后生效。

### 常见坑

| 现象 | 原因 | 解决 |
|---|---|---|
| `actions/configure-pages ... Not Found` | Pages API 不可用（首次配置或权限问题） | 本 workflow 已**不依赖**该 action；用推 `gh-pages` 分支方案 |
| Actions 失败：`could not read Username` | GITHUB_TOKEN 默认只读 | Settings → Actions → General → 改 **Read and write permissions** |
| Actions 失败：`TOCSS ... not available` | Hugo 非 extended 版 | 用 `peaceiris/actions-hugo` 并设 `extended: true`（已配好） |
| Actions 失败：`submodule ... not found` | 没拉子模块 | workflow 里 `submodules: recursive`（已配好） |
| 访问 `12-test-12.github.io` 显示 404 | Project Pages 必须带仓库名路径 | 正确地址是 `https://12-test-12.github.io/yeli/` |
| 访问 `/yeli/` 但 CSS 404 | `hugo.yaml` 顶部的 `baseURL` 少了 `/yeli/` 后缀 | 应为 `https://12-test-12.github.io/yeli/` |
| 想用自定义域名 | 见下方 | `static/CNAME` + DNS |

---

## 自定义

### 改个人信息

编辑 `hugo.yaml`：

```yaml
baseURL: "https://12-test-12.github.io/yeli/"
params:
  title: "YeLi"
  author: "YeLi"
  description: "代码 · 折腾 · 记录"
  social:
    - identifier: github
      url: https://github.com/12-test-12
    - identifier: email
      url: mailto:you@example.com
```

### 换头像

把你的头像放到 `static/img/avatar.png`（建议 200x200+），Hugo 配置已自动引用。

### 改颜色

编辑 `static/css/geek.css` 顶部的 CSS 变量：

```css
--accent:        #00ff9c;  /* 终端绿，改这里 */
--accent-2:      #00d4ff;  /* 提示蓝 */
--accent-3:      #ffb86c;  /* 警告橙 */
```

### 改导航栏

编辑 `hugo.yaml` 的 `menu.main` 区块。

---

## 写笔记的建议

> 这是个人 IP 风格的博客，慢养为主。

- **draft: true** → 没写完不想公开时
- **categories** → `tech` / `devlog` / `project` / `essay` 选一个
- **tags** → 自由打，几个关键 tag
- **description** → 用于 SEO 和卡片预览
- **cover** → 卡片背景图 (建议宽 16:9)
- **series** → 如果是系列文章，给个系列名

---

## 常用 Hugo 命令

```bash
hugo server -D              # 本地预览（含 draft）
hugo server --bind 0.0.0.0  # 局域网可访问
hugo --minify               # 生产构建 (输出到 public/)
hugo new posts/foo.md       # 新建文章
hugo new page/about.md      # 新建单页
```

---

## 路线图

- [ ] 接 giscus 评论
- [ ] 全文搜索 (Pagefind)
- [ ] RSS / Atom 优化
- [ ] 自定义域名
- [ ] 暗色 / 浅色手动切换 (目前强制深色)
