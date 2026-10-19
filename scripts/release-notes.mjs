import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { appendFileSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

function git(args, cwd, input) {
  return execFileSync("git", args, { cwd, input, encoding: "utf8" })
}

export function releaseRequested(eventName, event) {
  if (eventName === "workflow_dispatch") return true
  return [...(event.commits ?? []), event.head_commit].some((commit) =>
    /publish|feat:/i.test(commit?.message ?? ""),
  )
}

export function changedArticles({ eventName, event, sha, cwd = process.cwd() }) {
  let base
  if (eventName === "push" && event.before && !/^0+$/.test(event.before)) {
    base = event.before
    // A force-push can leave the previous tip outside the checked-out history.
    try {
      git(["cat-file", "-e", `${base}^{commit}`], cwd)
    } catch {
      git(["fetch", "--no-tags", "origin", base], cwd)
    }
  } else if (eventName === "workflow_dispatch") {
    try {
      base = git(["rev-parse", "--verify", "--quiet", `${sha}^`], cwd).trim()
    } catch {
      // A manually dispatched first commit has no parent.
    }
  }

  // First pushes compare against the empty tree, including every new article.
  base ??= git(["hash-object", "-t", "tree", "--stdin"], cwd, "").trim()
  const files = git(
    [
      "diff",
      "--name-only",
      "-z",
      "--no-renames",
      "--diff-filter=ACMRT",
      base,
      sha,
      "--",
      "content/",
    ],
    cwd,
  )
  return files
    .split("\0")
    .filter((file) => file.startsWith("content/") && file.endsWith(".md"))
    .map((file) => file.slice("content/".length))
}

function markdownLabel(value) {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\\`*_[\]]/g, "\\$&")
}

export function createNotes(changed, contentIndex, pageUrl, repository) {
  const changedSet = new Set(changed)
  // The build index excludes drafts and ignored files, and contains Quartz's
  // final slugs and frontmatter titles. Do not reconstruct them.
  const articles = Object.values(contentIndex).filter((article) =>
    changedSet.has(article.filePath.replaceAll("\\", "/")),
  )
  if (articles.length === 0) return { hasArticles: false, notes: "" }

  const base = pageUrl.replace(/\/+$/, "")
  const lines = articles.map((article) => {
    const slug = article.slug.replace(/(^|\/)index$/, "$1")
    const url = `${base}/${slug.split("/").map(encodeURIComponent).join("/")}`
    return `- [${markdownLabel(article.title)}](${url})`
  })
  return {
    hasArticles: true,
    notes: [
      ...lines,
      "",
      "---",
      `🌐 [访问博客](${base}/)`,
      `⭐ [Star 仓库](https://github.com/${repository})`,
    ].join("\n"),
  }
}

function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
  const eventName = process.env.GITHUB_EVENT_NAME
  const requested = releaseRequested(eventName, event)
  let result = { hasArticles: false, notes: "" }
  if (requested) {
    const changed = changedArticles({ eventName, event, sha: process.env.GITHUB_SHA })
    const indexPath = process.env.CONTENT_INDEX_PATH ?? "public/static/contentIndex.json"
    const contentIndex = JSON.parse(readFileSync(indexPath, "utf8"))
    result = createNotes(changed, contentIndex, process.env.PAGE_URL, process.env.GITHUB_REPOSITORY)
  }

  // Article titles are data, never substituted into a shell script.
  const delimiter = `notes_${randomUUID()}`
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `release_requested=${requested}\nhas_articles=${result.hasArticles}\nnotes<<${delimiter}\n${result.notes}\n${delimiter}\n`,
  )
  console.log(`Release requested: ${requested}; published articles changed: ${result.hasArticles}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
