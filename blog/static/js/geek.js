/* =================================================================
 * YeLi's Blog - 极客风交互
 * - 首页打字机效果
 * - 全站快捷键
 * ================================================================= */

(function () {
  "use strict";

  // ---------- 1. 首页 Hero 打字机 ----------
  document.addEventListener("DOMContentLoaded", function () {
    const tagline = document.querySelector(".hero-tagline .typed");
    if (!tagline) return;

    const phrases = [
      "代码 · 折腾 · 记录",
      "Code · Tinker · Document",
      "// stay curious, stay hungry"
    ];
    let pi = 0, ci = 0, deleting = false;

    function tick() {
      const word = phrases[pi];
      tagline.textContent = word.substring(0, ci);

      if (!deleting) {
        ci++;
        if (ci > word.length) {
          deleting = true;
          setTimeout(tick, 1600);
          return;
        }
      } else {
        ci--;
        if (ci < 0) {
          deleting = false;
          pi = (pi + 1) % phrases.length;
          ci = 0;
        }
      }
      setTimeout(tick, deleting ? 40 : 90);
    }
    tick();
  });

  // ---------- 2. 快捷键: "/" 聚焦搜索 ----------
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      const search = document.querySelector(".widget--search input");
      if (search) search.focus();
    }

    // "g h" 回到首页, "g p" 笔记列表, "g a" 关于
    if (e.key === "g") {
      window.__gPressed = Date.now();
    }
    if (window.__gPressed && Date.now() - window.__gPressed < 1000) {
      // Project Pages 部署在 /yeli/ 子路径，这里显式用 baseURL 前缀
      var base = document.documentElement.getAttribute("data-baseurl") || "/yeli/";
      if (e.key === "h") window.location.href = base;
      if (e.key === "p") window.location.href = base + "posts/";
      if (e.key === "a") window.location.href = base + "about/";
    }
  });

  // ---------- 3. console 彩蛋 ----------
  const banner = [
    "%c YeLi's Blog ",
    "background: #00ff9c; color: #0a0e0a; font-weight: bold; padding: 4px 8px; border-radius: 2px;",
    "%c\n  Hi there! 欢迎翻源码 :)",
    "color: #00ff9c; font-family: monospace;"
  ];
  console.log(banner.join("\n"), banner[1], banner[3]);
})();
