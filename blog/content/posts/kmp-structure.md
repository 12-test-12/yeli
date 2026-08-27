---
title: "[技术] Kotlin Multiplatform 项目结构初探"
date: 2026-08-20
draft: false
description: "KMP 的 commonMain / androidMain / iosMain 分层和模块化思路"
summary: "从 Android 开发者视角理解 KMP 的模块切分"
authors: ["YeLi"]
categories: ["tech"]
tags: ["Kotlin", "KMP", "跨平台", "Compose Multiplatform"]
keywords: ["KMP", "多端开发", "模块化"]
lastmod: 2026-08-20
---

## KMP 是什么

Kotlin Multiplatform，JetBrains 出的跨平台方案，核心思想：
**业务逻辑写一次，UI 各端分别实现。**

## 项目结构

```
myapp/
├── commonMain/        # 跨端共享代码（业务、领域模型、网络）
│   └── kotlin/
│       ├── data/
│       ├── domain/
│       └── network/
├── androidMain/       # Android 特有（Activity 入口、Android API 封装）
├── iosMain/           # iOS 特有（UIKit 桥接、NSURLSession 封装）
└── desktopMain/       # Desktop 特有
```

## 一个最简单的示例

`commonMain` 里：

```kotlin
// 平台无关的领域模型
data class User(val id: String, val name: String)

// 平台无关的业务逻辑
class UserRepository {
    fun getUser(id: String): User = User(id, "YeLi")
}
```

`androidMain` 里调用：

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repo = UserRepository()
        println(repo.getUser("1").name)
    }
}
```

## 关键原则

- `commonMain` 里 **不能** 直接调用任何平台 API
- 用 `expect` / `actual` 桥接平台差异：

```kotlin
// commonMain
expect fun platformName(): String

// androidMain
actual fun platformName(): String = "Android"

// iosMain
actual fun platformName(): String = "iOS"
```

## 我目前的看法

- KMP 适合 **业务逻辑重、UI 不复杂** 的应用
- UI 想要跨端，得等 **Compose Multiplatform** 进一步成熟
- 已经做 Android 的话，KMP 学习曲线很友好

## TODO

- [ ] 跑通一个 KMP + CMP 完整 demo
- [ ] 接入网络请求 (Ktor)
- [ ] 跑一次 iOS 真机
