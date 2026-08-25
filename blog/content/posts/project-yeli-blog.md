---
title: "[项目] yeli - 个人数字花园"
date: 2026-08-25
draft: false
description: "用 Hugo + Stack 主题魔改的个人博客，沉淀技术笔记、项目开发、随笔"
summary: "一个深色全屏极客风的个人数字花园"
authors: ["YeLi"]
categories: ["project"]
tags: ["Hugo", "博客", "个人项目", "Stack 主题"]
keywords: ["Hugo", "数字花园", "Stack"]
lastmod: 2026-08-25
ShowToc: true
TocOpen: true
ShowReadingTime: true
ShowShareButtons: true
cover:
  image: ""
  alt: "yeli-blog"
  caption: ""
---

## 项目简介

这是我的个人数字花园 / 个人 IP 站点。

**目标**：

- 把学到的技术记下来
- 把做过的项目沉淀下来
- 把碎片想法写出来，避免遗忘
- 长期维护，慢慢养

**用户**：主要是未来的自己，其次是少数路过的人。

## 技术栈

- **静态生成器**：Hugo extended
- **主题**：hugo-theme-stack（魔改）
- **部署**：GitHub Pages
- **CI/CD**：GitHub Actions
- **样式**：手写 SCSS / CSS（深色全屏极客风）
- **写作用工具**：本地 Markdown，git 提交

## 架构 / 设计

### 目录结构

```
blog/
├── content/
│   ├── posts/         # 所有文章
│   ├── page/          # 单页（about、links...）
│   └── *.md
├── archetypes/        # 4 类模板：tech / devlog / project / essay
├── static/css/geek.css    # 深色全屏样式
├── static/js/geek.js      # 打字机 + 快捷键
├── layouts/index.html     # 覆写首页（个人 IP 区域）
├── hugo.yaml
└── .github/workflows/     # 自动部署
```

### 设计原则

1. **全屏深色**：去左右栏，文章全宽展示
2. **终端绿配色**：`#00ff9c` 主色，黑底
3. **JetBrains Mono** 字体：等宽，代码友好
4. **极简导航**：首页 / 笔记 / 项目 / 关于，共 4 个入口

## 核心实现

### 1. 覆写 Stack 主题的浅色卡片

```css
.article-list--tile article,
.article-list--compact article {
  background: var(--terminal-panel) !important;
  border: 1px solid var(--terminal-border) !important;
  border-radius: 4px !important;  /* 硬朗直角 */
}
```

### 2. 首页打字机

```js
const phrases = ["代码 · 折腾 · 记录", "Code · Tinker · Document"];
let pi = 0, ci = 0, deleting = false;
function tick() {
  // 打字 + 暂停 + 删除 + 切换
}
```

### 3. 自定义 permalink

```yaml
permalinks:
  posts: /posts/:slug/
  categories: /categories/:slug/
```

## 踩坑记录

- Hugo 必须用 **extended** 版，Stack 主题用 SCSS
- GitHub Actions 的 `GITHUB_TOKEN` 默认只读，要手动开 write 权限
- Stack 默认浅色卡片，需要大量 `!important` 覆盖

## TODO

- [ ] 加评论系统 (giscus)
- [ ] 加全文搜索 (Pagefind)
- [ ] 写一个归档页 `/archive/`
- [ ] 接入友链页 `/links/`
- [ ] 自定义域名
- [ ] 文章系列 (Series) 优化
