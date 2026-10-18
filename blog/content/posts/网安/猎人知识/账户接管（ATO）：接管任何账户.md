---
title: 账户接管（ATO）：接管任何账户
date: 2026-08-25
draft: false
description: 账户接管（ATO）的原理、攻击向量与防御策略
categories:
  - tech
tags:
  - 网安
  - 漏洞
  - ATO
  - 身份验证
---

# 基础

> [!node] 概念
> 账户接管（ATO）并非单一漏洞，而是一种**结果**。多种不同的缺陷最终导致同一结果：攻击者开始像受害者一样行事。其共同点在于**身份验证**或**会话/身份管理方面**的漏洞。

> [!example] 例子
> 你可以想象一下，你原本有你的账号，但是你突然可以使用别人的账号，换句话来说，你在学校是一个学生，但是你通过ATO你掌握了校长的账号，那个时候，岂不是可以为所欲为了吗？

> [!node] 认证 vs 授权
> **认证**回答"你是谁"；**授权**回答"你能不能做这件事"。ATO 攻破的是**认证**——让服务器相信你是另一个人。（服务器认对了人，但放行了不该给的权限，那是 BOLA/BFLA 的地盘，参见上一篇。）
>
> 实战定义：**如果你能让服务器相信你是另一个用户，而不需要知道他的密码，就是 ATO。**对应 OWASP A07:2021（Identification and Authentication Failures）。

# 重要性

因为你是直接使用了别人的东西导致的，而这个东西你原本是无法使用的

ATO（账户接管）的影响是最直接的，不需要链式利用也不需要想象：

- 完全访问受害者账户：读取PII（姓名、CPF、电话、地址）、历史记录、消息。  
- 锁定：一旦更改了受害者的密码，你就将其踢出了自己的账户（对她造成拒绝服务）。  
- 规模：如果攻击向量是可伪造的JWT，或者是一个接受任意用户的密码重置，那你接管的不是一个账户，而是任意一个账户。这会把严重性从“高”提升到“严重”。  
- 支点：接管管理员账户会打开BFLA、内部面板访问权限等。ATO同时也是多条利用链的终点：窃取JWT的XSS、泄露OAuth code的开放重定向（参见漏洞链式利用）。

> [!node] 值多少钱
> ATO 是赏金里最值钱的类别之一，因为影响是全部的，而且特别好向项目方解释。实际项目中，一个校验不严的 refresh token 大概几百美元；无需登录就能重置任意用户密码的，可以到几千美元。向量影响的账户越多、数据越敏感，赏金越高。

> [!danger] 定级前想清楚两件事
> **(a) 需要登录吗？(b) 影响任意账户吗？**这两点直接决定 CVSS：
>
> - **无需登录 + 任意账户**（匿名密码重置、匿名可伪造的 JWT）：`AV:N/AC:L/PR:N/UI:N` + C:H/I:H = **9.1 严重**；把锁定算进去（A:H）能到 **9.8**。
> - **需要登录**（`PR:L`，比如用自己账号的会话去签发别人的 token）：降到 **8.1 高**。规模一样是全部，但需要一个有效登录，就拉不到"严重"了。报告里注明这点，别虚标。
>
> ⚠️ 严重性 = 影响 × 规模。"我用奇怪的方式接管了我自己的账号"不是报告；"任何攻击者可以接管任何用户的账号"才是严重。**演示规模。**

# 原理

1. **凭证创建/恢复**，即**密码重置**流程。如果重置令牌是可预测的、不会过期的，或者**重置目标**可由客户端控制，则会导致 ATO。
2. **令牌颁发**：登录、**令牌刷新**、令牌交换。如果应用程序使用可控数据（来自其他帐户的电子邮件/令牌）颁发会话令牌，则会触发 ATO。
3. **令牌验证**，例如**JWT**。如果签名未得到真正验证（alg=none、密钥弱、算法混乱），你可以伪造任何人的令牌。
4. **联合身份验证/第二因素**：**OAuth**和**2FA/OTP**。如果 `state` 校验缺失、`redirect_uri` 导致代码泄露、OTP 没有速率限制，或者验证在客户端进行，则会绕过额外的因素。

> 其实他们的原理很好理解，就是看服务器那边是怎么来确定我的身份的，然后是我是否可以操作这些数据，最后是我如何来修改这些数据

> [!node] 核心问题
> 把所有向量串起来的是同一个问题：**这条请求里，服务器用哪个数据来决定"我是谁"——我能不能碰到这个数据？**

# 类型和变体

| 向量 | 核心缺陷 | 结果 |
|---|---|---|
| 密码重置不安全 | token 可预测 / 不过期 / 目标可控 / Host 注入 | 重置任何人的密码 |
| Refresh / 令牌交换 | 用别的账号的标识符直接签发 JWT 不校验归属 | 拿到受害者的有效会话 |
| JWT — alg=none | 服务器接受无签名 token | 伪造任意 claim |
| JWT — 弱密钥 | HMAC 密钥可离线破解 | 伪造任意合法 token |
| JWT — 算法混淆 | 公钥被当成 HMAC 密钥 | 用公钥伪造 token |
| JWT — kid/jku/jwk | 服务器信任 token header 来选密钥 | 指向攻击者控制的密钥 |
| OAuth — state 缺失 | 流程没有 CSRF token | 强制绑定账号（登录 CSRF） |
| OAuth — redirect_uri | code/token 泄露到攻击者域名 | 偷授权码 |
| 2FA/OTP 绕过 | 响应可篡改 / 无速率限制 / 可复用 | 跳过第二道防线 |

## 向量 1：不安全的密码重置

> [!node] 核心问题  
> 密码重置流程不需要知道旧密码，所以攻击者天然就有动机去钻空子。

这个向量有 4 个变体：

**1a. 重置目标可控制（IDOR 式重置）**

服务器在"修改密码"接口里用了请求体传来的 `usuario` 或 `email` 字段来确定"改谁的密码"，但没有在服务端会话里固定住当前用户。

```http
POST /autenticacao/api/v1/alterar-senha HTTP/2
Host: alvo.com
Content-Type: application/json
Cookie: session=<你自己账号的会话>

{"usuario":"vitima_contaB","novaSenha":"Senha123!","confirmaSenha":"Senha123!"}
# "usuario" 本应该固定在会话里；换个登录名也接受，就是 ATO
```

- 做法：用 A 账户登录，把请求体里的用户改成 B 的账号，就能改 B 的密码。
- 本质：IDOR 在凭证流程上的应用。

**1b. 重置返回密码 / 不需要认证**

重置接口直接在新密码里返回明文，或者根本不需要登录就能调用。

```http
POST /autenticacao/api/v1/resetar-senha HTTP/2
Host: alvo.com
Content-Type: application/json

{"usuario":"vitima_contaB","novaSenha":"Nova@123","confirmarSenha":"Nova@123","resetarSenhaManual":true}
```

```http
HTTP/2 200 OK
Content-Type: application/json

{"message":"Senha redefinida com sucesso"}
# 有的接口甚至会在这里直接把新密码返回出来
```

- 做法：匿名 POST 到重置接口，传目标用户和新密码，完事。
- 严重性：不需要登录 + 可枚举用户 = 可接管任意账户，`AV:N/AC:L/PR:N/UI:N` + C:H/I:H = **CVSS 9.1（严重）**。这里的 `PR:N`（匿名）正是它和向量 3 那些需要登录的 JWT 攻击的分界线。

**1c. Host Header Injection**

服务器用 `Host` 请求头来拼重置链接的域名。

```http
POST /esqueci-senha HTTP/2
Host: atacante.com
Content-Type: application/x-www-form-urlencoded

email=vitima@exemplo.com
```

- 做法：把 `Host` 改成攻击者控制的域名，重置链接就会指向攻击者的服务器，受害者一点链接，token 就泄露到攻击者的日志里了。
- 变体：`X-Forwarded-Host` 也可以这样玩。
- 本质：服务器用**客户端可控的请求头**来构建**安全敏感的 URL**。

**1d. 重置 Token 可预测或永不过期**

- 做法：生成两次重置请求，对比 token 有没有规律（顺序号、短数字、基于时间戳等）。不 expire 的 token 可以无限复用。
- 检查点：token 过期吗？用完会失效吗？是纯随机（256 位熵）的吗？

---

## 向量 2：Refresh Token / 令牌交换

> [!node] 核心问题  
> Refresh 接口从请求体里拿一个标识符（比如 email），直接据此签发新 JWT，**不校验这个标识符是不是当前登录用户的**。

```http
POST /api/auth/refresh HTTP/2
Host: alvo.com
Content-Type: application/json

{"token":"vitima@exemplo.com"}
# 这里本应该传你自己的 refresh token，我们换成受害者的 email
```

```http
HTTP/2 200 OK
Content-Type: application/json

{"Success":true,"Result":{"jwt":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidml0aW1hQGV4ZW1wbG8uY29tIn0...."}}
# 服务器直接返回了受害者的有效 JWT
```

- 做法：用 A 账户登录，把 refresh 请求里的 `token` 字段改成 B 的 email，服务器就返回了 B 的有效 JWT。把返回的 `jwt` 塞进 `Authorization: Bearer ...`，你就是 B 了。
- 本质：和 IDOR 一样的根因——服务器信任了客户端传来的标识符，没做所有权校验。

---

## 向量 3：JWT 攻击

> [!node] JWT 解剖  
> JWT 由 `header.payload.signature` 三部分组成，header 和 payload 只是 Base64URL 编码（可读可改），**签名才是安全核心**。

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9    ← header：声明用哪个算法签名
.
eyJ1c2VySWQiOjEwMDEsImFkbWluIjpmYWxzZSwiaWF0IjoxNzE3MDAwMDAwLCJleHAiOjE3MTcwMDM2MDB9    ← payload：claims（你是谁）
.
4pcPyMD0...    ← signature：签名，安全核心
```

解码前两段就是明文 JSON：

```json
// header
{"alg":"HS256","typ":"JWT"}

// payload
{"userId":1001,"admin":false,"iat":1717000000,"exp":1717003600}
```

> [!example] 例子
> JWT 就像一张**支票**：header 和 payload 是金额和收款人，写在明面上，谁都能读、都能改；签名是银行的钢印。伪造支票 = 伪造钢印。下面的四个变体，就是四种伪造钢印的方式（或者让银行根本不验钢印）。

这个向量有 4 个变体：

**3a. alg=none（不要签名了）**

服务器接受 `alg: none`，也就是不验证签名。

```json
{"alg":"none","typ":"JWT"}
{"userId":1001,"admin":true}
```

- 做法：把 header 里的 alg 改成 `none`，删掉签名部分（留个空点），就能随便改 payload（比如 `admin: true`）。
- 注意：有些服务器只认全小写 `none`，但有的也吃 `None`、`nOnE`、`NONE`，建议全试一遍。

**3b. HS256 弱密钥**

HMAC 用了可以字典攻击破解的短密钥（比如 `secret`、`123456`、`changeme`）。

```bash
# -m 16500 是 hashcat 的 JWT 模式（自动覆盖 HS256/384/512），-a 0 是字典攻击
hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt
```

- 做法：用 hashcat（模式 16500）对签名做离线破解——它拿字典里每个词重新签 header+payload，和原签名比对，命中就打印 `<jwt>:<密钥>`。拿到密钥后自由签名任意 JWT。
- 工具：Burp 的 JWT Editor，或者 jwt.io 的 VERIFY SIGNATURE 框里贴入密钥重新签名。还有专门的 JWT 密钥字典（wallarm/jwt-secrets）。
- 变体：可以伪造一个 `exp` 非常远的 token，实现"永久登录"。

**3c. Algorithm Confusion（RS256 → HS256）**

> [!node] 核心原理  
> RS256 用**私钥**签名（只有服务器有）、**公钥**验证（谁都能拿），看起来很安全——*前提是服务器只接受 RS256*。
>
> 漏洞在于：很多库的 `verify()` 方法是**根据 token header 里声称的算法**来选验证方式的。如果你发一个 `alg:HS256` 的 token，库就会把服务器存的那把**公钥**当成 HMAC 密钥来验证。而公钥是公开的，你也有——所以你用公钥当 HMAC 密钥签一个 HS256 token，服务器用同一把公钥验证，刚好对上。

分步操作（Burp JWT Editor）：

1. **拿公钥**：先试 `/.well-known/jwks.json` 或 `/jwks.json`。如果没有公开，可以用两个签名过的 token 推导 RSA 公钥：`docker run --rm -it portswigger/sig2n <token1> <token2>`，输出里会给出候选公钥（X.509 和 PKCS1 两种格式）和已伪造好的测试 token。
2. **JWK 转 PEM**：JWT Editor 里自带 JWK → PEM 转换。
3. **PEM 整体 Base64 编码**：在 Burp Decoder 里做。
4. **建对称密钥**：JWT Editor 里 New symmetric key，把 `k` 字段替换成上面那段 Base64。
5. **签发**：把 token 的 `alg` 改成 `HS256`，改 claims（`userId`/`admin`），用这把"密钥"签名。

> [!danger] 90% 的人栽在这里  
> 用来签名的公钥必须和服务器保存的**逐字节完全一致**：同样的 PEM 格式，**包括 `\n` 换行符和不可见字符**。多一个换行符签名就对不上。不是"差不多"，是必须完全相同。

**3d. kid / jku / jwk 注入**

服务器盲目信任 JWT header 里的 `kid`/`jku`/`jwk` 参数来选择验证密钥。

- `jwk`：直接在 header 里嵌入自己的公钥，服务器用你给的公钥验证，当然过：

```json
{"alg":"RS256","jwk":{"kty":"RSA","e":"AQAB","n":"<你的公钥>"}}
```

- `jku`：指向一个攻击者控制的密钥端点 URL：

```json
{"alg":"RS256","jku":"https://atacante.com/jwks.json"}
```

- `kid`：Key ID，本质是个文件名/记录名。没做过滤的话可以**路径穿越**（`../` 跳出预期目录），指向一个内容已知的文件，然后用那个内容当 HMAC 密钥签名：

```json
{"alg":"HS256","kid":"../../../../dev/null"}
```

  `/dev/null` 的内容是空字符串——你用空密钥签名，服务器也用空密钥验证，刚好对上。
- `kid` 进阶：如果 kid 被拼进 SQL 查询（`SELECT key FROM keys WHERE id='<kid>'`），直接 SQL 注入——`kid` 填 `x' UNION SELECT 'segredo'-- -`，让数据库返回你指定的密钥，再用它签名。

---

## 向量 4：OAuth 配置不当

> [!node] OAuth 流程简述  
> “登录与 Google/GitHub”。客户端把用户重定向到提供商，带上 `client_id`、`redirect_uri`、`response_type=code`、`scope` 和 `state`；提供商认证后返回一个 `code` 给 `redirect_uri`，客户端再拿 code 换 token。

这个向量有 2 个变体：

**4a. state 参数缺失 → CSRF 式账户绑定**

OAuth 授权流程没有 `state` CSRF 令牌。`state` 的作用是把提供商的响应绑定到发起请求的那个会话——没有它，攻击者可以拿自己流程的 `code` 强行塞给受害者"完成"。

- 做法：攻击者用自己的社交账号发起 OAuth 流程，捕获 code，然后诱导受害者"完成登录"（通过 CSRF 链接），结果受害者的账户被绑定到了攻击者的社交账号上，攻击者就能登录受害者账户。

**4b. redirect_uri 宽松 / Referer 泄露**

回调地址没做严格白名单校验：

```text
https://provedor.com/auth?client_id=app123
    &response_type=code
    &redirect_uri=https://atacante.com/callback    ← 白名单里应该只有 app.exemplo.com
    &scope=email
```

- 做法：把 `redirect_uri` 指向攻击者控制的域名，就能拿到授权码。
- 变体：即使 `redirect_uri` 是对的，如果回调页加载了外部资源（图片、脚本），code 会在 Referer 头里泄露。攻击者可以托管那个外部资源来偷 code。
- 更狠的链式利用：正规提供商会用**精确白名单**校验 `redirect_uri`，直接指向自己的域名行不通。**但是**如果白名单域名内部有一个 open redirect，`redirect_uri` 依然合法，提供商把 code 交给目标站，open redirect 再把 code 转到你手里 → ATO。这是 open redirect 的最高价值用法。
- 补充：如果是 `response_type=token`（implicit 流程），泄露的就不是 code 而是放在 URL fragment（`#access_token=...`）里的 access token 本体。

---

## 向量 5：2FA / OTP 绕过

> [!node] 第二道防线  
> 2FA/OTP 本来应该是最后一道墙，但很多应用把它做成了纸墙。

这个向量有 3 个变体：

**5a. 客户端验证**

前端根据 HTTP 状态码（400 vs 200）来决定是否放行。

```http
HTTP/2 400 Bad Request    →    HTTP/2 200 OK
```

- 做法：用 Burp 拦截响应，把 `400 Bad Request` 改成 `200 OK`，前端就以为验证码正确了。
- 教训：验证必须 100% 在服务端做，前端只做展示。

**5b. 无 Rate Limit**

OTP 验证接口没有限制尝试次数。

```http
POST /api/2fa/verify HTTP/2
Host: alvo.com
Content-Type: application/json

{"code":"000000"}    ← Intruder：Sniper 模式 + 数字 payload 000000~999999
```

- 做法：6 位数字 OTP 只有 100 万种组合，用 Burp Intruder 暴力穷举（000000~999999），几分钟就能搞定。

**5c. 代码复用 / pinID 可替换**

- OTP 使用后可重复使用，或者 OTP 绑定的是客户端传来的 `pinID`：

```http
POST /api/phone/confirm HTTP/2
Host: alvo.com
Content-Type: application/json

{"pinID":"<攻击者自己的pinID>","code":"482913"}    ← 验证码发到的是攻击者的手机
```

- 做法：攻击者先请求一个 OTP 到自己的手机，然后在受害者的请求里把 `pinID` 替换成自己的，用攻击者收到的验证码通过验证。
- 后果：如果这一步确认的是"把攻击者的手机号设为受害者账户的恢复手机"，攻击者就接管了恢复通道，进而接管整个账户。

---

## 向量 6：PHP Type Juggling / Magic Hash

> [!node] 核心问题  
> PHP 的 `==` 运算符在做比较时会进行类型转换：以 `0e` 开头后跟纯数字的字符串会被当做科学计数法 `0×10^n`，也就是数值 0。于是**两个不同的 `0e...` 字符串用 `==` 比较是"相等"的**——因为都变成了 `0 == 0`。

```php
// 有漏洞的写法 —— 用 == 而不是 === 比较哈希
if (md5($senha_enviada) == $hash_do_banco) { /* 认证通过 */ }
```

如果数据库里存的哈希恰好是一个"magic hash"（`0e` 开头 + 纯数字），那任何 MD5 也是 `0e` 开头的密码都能通过验证：

```text
md5("QNKCDZO")   = 0e830400451993494058024219903391    → 数值 0
md5("240610708") = 0e462097431906509019562988736854    → 数值 0

0 == 0 ✓ 认证通过
```

- 经典组合：`QNKCDZO`、`240610708`、`aabg7XSs` 等，互相之间都能通过 `==` 比较。
- 注意：PHP 8 里这个行为**依然存在**（两个"数字字符串"之间 `==` 依然按数值比较），不是只有老古董才有这个洞。
- 防御：用 `===` 严格比较，或者 `hash_equals()`；密码哈希用 `password_hash()`/`password_verify()`（bcrypt/argon2），别用 MD5。

---

>[!summary] 一句话总结  
这 6 大向量覆盖了身份认证生命周期的四个关键节点：**凭证创建/恢复**（向量 1 + 向量 6）、**令牌颁发**（向量 2）、**令牌验证**（向量 3）、**联邦认证/第二因素**（向量 4 + 向量 5）。不管哪种变体，本质都是同一件事——**服务器信任了客户端可以控制的数据来判定"你是谁"**。防御的关键是纵深防御，每一层都做好校验，不依赖单一防线。


# 找寻猎物

- 密码：忘记密码和修改密码，这个一定是一个重灾区，会有很多不小心的人会遗留很多的问题，导致的一个错误。例如：每个参数可能会受到我们的控制导致的一个问题
- 令牌：一般是JWT这个东西，在bp中会有一些插件可以来帮助分析，在浏览器中打开f12就可以看到。诀窍：DevTools → Application → Local Storage / Cookies 里找 `eyJ` 开头的字符串（`eyJ` 就是 `{"` 的 Base64，几乎必是 JWT）
- 密钥端点：试一试 `/.well-known/jwks.json` 和 `/jwks.json`，它们会吐出公钥——向量 3c 的原材料
- oauth：在"使用 Google/GitHub 等登录"的 URL 中，寻找 `response_type=code`、`client_id`、`redirect_uri`、`state` 等参数
- js文件：js中会体现会路由，参数名称，有时候甚至会显示出很多的密钥或者密码等

> [!node] 小巧思
> 一个猎人会准备两把枪，这个在工作的时候会出现，一个是权限比较高的，一个是权限比较低的，可以在测试过程中切换两边的一些身份验证的东西，或许就会出现一些比较意外的收获
>
> 这就是 ATO 测试的**黄金法则：永远用两个账号**（A = 你/攻击者，B = 受害者）。几乎所有 ATO 的 PoC 都是一句话："用 A 账号，我变成了 B 账号。"没有第二个账号，你根本没法证明影响。

> [!node] 工具箱
> - **jwt.io**：贴入 token 一键解码 header.payload，什么都不用装
> - **Burp Suite**：Repeater（改请求重发）、Intruder（爆破 OTP/ID）、**JWT Editor 扩展**（签名伪造 JWT，3c 的必备）
> - **jwt_tool**（ticarpi/jwt_tool）：JWT 命令行瑞士军刀，自动测 alg=none、算法混淆等
> - **hashcat**：`-m 16500` 模式破解 HMAC 密钥（自动识别 HS256/384/512）
> - **sig2n**（portswigger/sig2n）：从两个已知 token 推导出 RSA 公钥

> [!example] 练习靶场
> 学完就练，别只看不打：
> - [PortSwigger — JWT attacks](https://portswigger.net/web-security/jwt)（免费，和实战一模一样）
> - [PortSwigger — OAuth 2.0 authentication vulnerabilities](https://portswigger.net/web-security/oauth)
> - [PortSwigger — Authentication](https://portswigger.net/web-security/authentication)
> - TryHackMe / HackTheBox / DVWA / HackingClub

# 猎物的陷阱（那些不算）

- 找到JWT，淡定哥们，JWT是目前企业他们常用的一个东西，这个但凡是一个正常的企业开发他都会使用，关键是在于你能不能把这个里面的东西给还原出来，也就是解密
- 在js中，存在一些密钥（钥匙）并不是很稀奇的事情关键是在于他是不是有效的。需要是一个高度敏感的密钥（钥匙）(可以使用[KeyHacks](https://github.com/streaak/keyhacks)进行验证)
- 如果你可以通过密钥来解码JWT，你已经成功了一半，但是你现在还没有完成后半部分，就这部分决定了你有没有赏金，**也就是你在将JWT加密之后，服务器那边有没有认，没有认就不能够算**
- `alg=none`以一种格式被拒绝，**它可能以另一种格式通过：测试`none`，，，。`None``nOnE``NONE`

# 防御

> [!node] 思路
> ATO 的防御靠**纵深防御**：没有任何单独一层是足够的，每一层都要假设前面那层会被打穿。

**1. 防弹的密码重置**

```python
import secrets, hashlib
from datetime import datetime, timedelta

def gerar_token_reset(user):
    token = secrets.token_urlsafe(32)              # 256 位熵，不可预测
    user.reset_hash = hashlib.sha256(token.encode()).hexdigest()  # 存哈希，不存 token
    user.reset_expira = datetime.utcnow() + timedelta(minutes=15)  # 快速过期
    user.save()
    enviar_email(user.email, link(token))          # 目标 = 注册邮箱，永远来自服务端

def validar_reset(token, nova_senha):
    h = hashlib.sha256(token.encode()).hexdigest()
    user = User.query(reset_hash=h).first()
    if not user or user.reset_expira < datetime.utcnow():
        abort(400)
    user.set_senha(nova_senha)
    user.reset_hash = None                          # 用完即废，一次性使用
    user.save()
```

- 重置**目标**永远是账户注册的邮箱，由服务端推导，绝不来自请求体里的 `usuario`/`email`
- 重置链接的域名用**配置里写死的基础 URL**，绝不读 `Host` 头（直接终结向量 1c）

**2. JWT 真正验签**

```javascript
const jwt = require('jsonwebtoken');

// 错误 —— decode 不验证签名，等于没验
const claims = jwt.decode(token);

// 正确 —— 固定算法白名单的 verify
const claims = jwt.verify(token, PUBLIC_KEY, {
  algorithms: ['RS256']   // 显式白名单：同时终结 alg=none 和算法混淆
});
```

- **固定 `algorithms` 白名单**：一行配置同时杀掉 3a 和 3c
- 优先**非对称算法**（RS256/ES256）；用 HS256 就保证密钥随机且长（32+ 字节）
- **忽略** header 里的 `jku`/`jwk`/`kid`（或把 `jku` 限制在白名单内、过滤 `kid` 的路径穿越）
- 始终验证 `exp`、`iss`、`aud`

**3. OAuth 按规矩来**

```python
# 发起流程：生成 state 存入会话
state = secrets.token_urlsafe(24)
session['oauth_state'] = state

# 回调时：先比对再收 code
if request.args['state'] != session.pop('oauth_state', None):
    abort(403)   # 挡掉账户绑定 CSRF
```

- `state` 必须有，且回调时必须比对
- `redirect_uri` 用**精确白名单**（完全匹配，不是"以…开头"）
- 授权码一次性使用，有效期以秒计

**4. 结实的 2FA/OTP**

- 100% 服务端验证（永远别让前端解释状态码）
- 速率限制 + 锁定（N 次错误后锁）
- OTP 过期、一次性、绑定到服务端的用户（不是客户端传的 `pinID`）

> [!danger] 这些都是不够的
> 只在前端隐藏管理员按钮；信任请求体里的 `role`/`userId`；用 `jwt.decode()` 以为它会验证签名；在客户端验证 OTP；"因为库会处理"就接受 JWT 里的任意 `alg`。

# 参考文章
- [A07 Identification and Authentication Failures - OWASP Top 10:2021](https://owasp.org/Top10/2021/A07_2021-Identification_and_Authentication_Failures/)
- [Account Takeover (ATO): assumindo qualquer conta — Matheus Laidler](https://matheuslaidler.github.io/posts/account-takeover/)（本文主要参考）
- [PortSwigger — JWT attacks](https://portswigger.net/web-security/jwt) / [Algorithm confusion](https://portswigger.net/web-security/jwt/algorithm-confusion)
- [PortSwigger — OAuth 2.0 authentication vulnerabilities](https://portswigger.net/web-security/oauth)
- [ticarpi/jwt_tool](https://github.com/ticarpi/jwt_tool)
- [wallarm/jwt-secrets（JWT 密钥字典）](https://github.com/wallarm/jwt-secrets)
- [What is Account Takeover (ATO) — Akamai](https://www.akamai.com/zh/glossary/what-is-account-takeover-ato)
- [Stop Leaking API Keys: The Backend for Frontend (BFF) Pattern Explained](https://blog.gitguardian.com/stop-leaking-api-keys-the-backend-for-frontend-bff-pattern-explained/)
