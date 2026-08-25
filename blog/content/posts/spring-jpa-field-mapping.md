---
title: "[技术] Spring Boot 中 JPA 字段命名映射踩坑"
date: 2026-08-25
draft: false
description: "记录一次 snake_case 字段映射到驼峰属性失败的排查过程"
summary: "Spring Data JPA 字段名映射的隐式规则与显式控制"
authors: ["YeLi"]
categories: ["tech"]
tags: ["Java", "Spring Boot", "JPA", "踩坑"]
keywords: ["JPA", "字段映射", "snake_case"]
lastmod: 2026-08-25
ShowToc: true
TocOpen: true
ShowReadingTime: true
ShowShareButtons: true
---

## 背景

数据库里有个表，字段名是 `user_id`、`created_at` 这种 snake_case。
我对应的 Entity 属性名按习惯写成了 `userId`、`createdAt`，运行时报错：

```
Column "user_id" not found.
```

## 排查

JPA 规范里，默认的命名策略（ImplicitNamingStrategy）会按以下顺序匹配：

1. 显式 `@Column(name = "user_id")` 优先
2. 属性名 `userId` → 物理列 `userid`（小写拼接）  
   而不是期待的 `user_id`
3. 所以 `user_id` 找不到

## 解决

**方式 A：显式标注（推荐）**

```java
@Column(name = "user_id")
private Long userId;
```

**方式 B：全局开启命名策略**

```yaml
spring:
  jpa:
    hibernate:
      naming:
        physical-strategy: org.springframework.boot.orm.jpa.hibernate.SpringPhysicalNamingStrategy
```

开启后，`userId` 会被自动转成 `user_id`，**但只有在 Hibernate 6+ 才有**。

## 收获

- JPA 字段映射看的是 **物理列名**，不是 Entity 字段名
- 小项目用 `@Column` 显式标最稳
- 大项目统一用 `SpringPhysicalNamingStrategy`，省心

---

> 看到不对的字段映射时，先看数据库的列名，
> 再看 Entity 上的 `@Column`，最后看全局策略。
