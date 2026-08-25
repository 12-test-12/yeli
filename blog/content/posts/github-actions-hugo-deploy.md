---
title: "[开发记录] GitHub Actions 部署 Hugo 到 Pages 的 CI 调通过程"
date: 2026-08-22
draft: false
description: "从 workflow 失败到成功自动部署的完整复盘"
summary: "Hugo + GitHub Pages + Actions 的踩坑全记录"
authors: ["YeLi"]
categories: ["devlog"]
tags: ["GitHub Actions", "Hugo", "CI/CD", "Pages"]
keywords: ["Hugo", "GitHub Pages", "自动化部署"]
lastmod: 2026-08-22
ShowToc: false
ShowReadingTime: true
ShowShareButtons: true
---

## 背景

把 Hugo 博客部署到 GitHub Pages，懒得每次手动 build + push。
上 GitHub Actions 自动跑。

## 过程

### Step 1：写 workflow

```yaml
name: Deploy Hugo to Pages
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: 'latest'
          extended: true
      - run: hugo --minify
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
```

### Step 2：第一次 push，挂了 ❌

报错：
```
Error: Error building site: TOCSS: failed to transform "scss/style.scss"
```

**原因**：Stack 主题用了 SCSS，必须装 **extended** 版 Hugo。
我虽然写了 `extended: true`，但 action 默认下载的是非 extended。

### Step 3：指定 hugo 版本 + 显式 extended

```yaml
- uses: peaceiris/actions-hugo@v3
  with:
    hugo-version: '0.124.1'
    extended: true
```

再跑，又挂 ❌：
```
fatal: could not read Username for 'https://github.com'
```

**原因**：默认 push 到当前 repo 的 `gh-pages` 分支需要权限。
但是 `GITHUB_TOKEN` 在默认设置下是只读的。

### Step 4：加 workflow 权限

Settings → Actions → General → Workflow permissions →  
✅ **Read and write permissions**

再跑，成功 ✅！

## 遇到的问题

### 问题 1：CSS 编译失败

**现象**：TOCSS 错误  
**原因**：Hugo 非 extended 版  
**解决**：用 `peaceiris/actions-hugo` + `extended: true`

### 问题 2：push 到 gh-pages 没权限

**现象**：`could not read Username`  
**原因**：`GITHUB_TOKEN` 默认只读  
**解决**：仓库设置里开 write 权限

### 问题 3：自定义域名

如果要 `你的域名.com`：
1. `static/CNAME` 写一行 `你的域名.com`
2. DNS 加 CNAME 指向 `12-test-12.github.io.`

## 收获

- **CI 调试要看完整日志**，别只看最后一行
- Hugo 主题的 SCSS / TS 一定要 **extended** 版
- GitHub Actions 的 token 权限是 **容易踩的坑**

## 最终的 workflow

放仓库 `.github/workflows/hugo.yaml`，每次 push main 自动部署。
