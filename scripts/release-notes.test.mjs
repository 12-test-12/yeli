import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, renameSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { changedArticles, createNotes, releaseRequested } from "./release-notes.mjs"

test("release triggers include earlier commits in a push and manual dispatch", () => {
  assert.equal(releaseRequested("workflow_dispatch", {}), true)
  assert.equal(
    releaseRequested("push", { commits: [{ message: "feat: article" }, { message: "fix links" }] }),
    true,
  )
  assert.equal(releaseRequested("push", { head_commit: { message: "blog: auto publish" } }), true)
  assert.equal(releaseRequested("push", { head_commit: { message: "fix: theme" } }), false)
})

test("notes use published titles and slugs, encoding URLs and excluding unpublished files", () => {
  const index = {
    article: { filePath: "网安/带 空格.md", slug: "网安/带-空格", title: "文章 [标题]" },
    home: { filePath: "index.md", slug: "index", title: "首页" },
    folder: { filePath: "文件夹/_index.md", slug: "文件夹/index", title: "目录" },
    unchanged: { filePath: "other.md", slug: "other", title: "unchanged" },
  }
  const result = createNotes(
    [
      "网安/带 空格.md",
      "index.md",
      "文件夹/_index.md",
      "draft.md",
      "deleted.md",
      "private/hidden.md",
    ],
    index,
    "https://example.com/yeli/",
    "12-test-12/yeli",
  )
  assert.equal(result.hasArticles, true)
  assert.ok(
    result.notes.includes(
      "[文章 \\[标题\\]](https://example.com/yeli/%E7%BD%91%E5%AE%89/%E5%B8%A6-%E7%A9%BA%E6%A0%BC)",
    ),
  )
  assert.ok(result.notes.includes("[首页](https://example.com/yeli/)"))
  assert.ok(result.notes.includes("[目录](https://example.com/yeli/%E6%96%87%E4%BB%B6%E5%A4%B9/)"))
  assert.doesNotMatch(result.notes, /draft|deleted|hidden|unchanged/)
  assert.deepEqual(createNotes(["draft.md"], index, "https://example.com", "owner/repo"), {
    hasArticles: false,
    notes: "",
  })
})

test("title text cannot introduce HTML, extra Markdown links, or output lines", () => {
  const result = createNotes(
    ["a.md"],
    {
      a: { filePath: "a.md", slug: "a", title: "<img> [x](bad)\nEOF\n$(echo test)" },
    },
    "https://example.com",
    "owner/repo",
  )
  assert.ok(
    result.notes.startsWith("- [&lt;img&gt; \\[x\\](bad) EOF $(echo test)](https://example.com/a)"),
  )
})

test("Git ranges cover first push, batched commits, renames, and deleted files", () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "yeli-release-test-"))
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
  git("init", "--quiet")
  git("config", "user.name", "Release Test")
  git("config", "user.email", "release-test@example.invalid")
  git("config", "commit.gpgsign", "false")
  mkdirSync(path.join(cwd, "content"))
  const write = (file, body) => writeFileSync(path.join(cwd, "content", file), body)
  const commit = () => {
    git("add", ".")
    git("commit", "--quiet", "-m", "test")
    return git("rev-parse", "HEAD")
  }
  const changed = (eventName, event, sha) => changedArticles({ eventName, event, sha, cwd }).sort()
  write("中文 空格.md", "first")
  write("deleted.md", "deleted")
  const first = commit()
  assert.deepEqual(
    changed("push", { before: "0".repeat(40) }, first),
    ["deleted.md", "中文 空格.md"].sort(),
  )
  assert.deepEqual(changed("workflow_dispatch", {}, first), ["deleted.md", "中文 空格.md"].sort())
  write("中文 空格.md", "second")
  commit()
  write("last.md", "third")
  git("rm", "--quiet", "content/deleted.md")
  const third = commit()
  assert.deepEqual(changed("push", { before: first }, third), ["last.md", "中文 空格.md"].sort())
  assert.deepEqual(changed("workflow_dispatch", {}, third), ["last.md"])
  renameSync(path.join(cwd, "content", "last.md"), path.join(cwd, "content", "新名字.md"))
  const fourth = commit()
  assert.deepEqual(changed("push", { before: third }, fourth), ["新名字.md"])
})
