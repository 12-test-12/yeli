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

## 发布到 GitHub Pages

### 一次性设置

1. 在 GitHub 新建一个 repo，比如 `blog`
2. **Settings → Pages → Source**：选 `GitHub Actions`
3. **Settings → Actions → General → Workflow permissions**：  
   ✅ **Read and write permissions**（这是关键，否则 push `gh-pages` 会失败）

### 部署

```bash
git init
git add .
git commit -m "init blog"
git branch -M main
git remote add origin https://github.com/你的用户名/blog.git
git push -u origin main
```

> 记得先在 `hugo.yaml` 里把 `baseURL` 改成 `https://你的用户名.github.io/`

之后每次 `git push` 就会自动触发部署。

---

## 自定义

### 改个人信息

编辑 `hugo.yaml`：

```yaml
baseURL: "https://你的用户名.github.io/"
params:
  title: "YeLi"
  author: "YeLi"
  description: "代码 · 折腾 · 记录"
  social:
    - identifier: github
      url: https://github.com/你的用户名
    - identifier: email
      url: mailto:你的邮箱@example.com
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
