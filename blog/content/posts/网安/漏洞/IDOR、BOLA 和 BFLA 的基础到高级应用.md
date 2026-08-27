
可能大家看到标题有点懵逼，其实用通俗的话来讲就是：**你看到了你不该看到的东西**

- **IDOR**：不安全直接对象引用（传统 Web 常见叫法）
    
- **BOLA**：对象级授权失效（API 安全领域的叫法，本质几乎等于 IDOR）
    
- **BFLA**：功能级授权失效（另一个维度：不是“看别人的数据”，而是“用别人的功能”）

# IDOR和BOLA

```http
GET /api/faturas/charge-details?chargeId=10051002
```

如果一个东西长成这个样子，当然如果是普通人的话，肯定就不会关注这个东西了，但是作为一个猎人要敏锐的观察他，并且可以抱有好奇的心态来看。

```http
GET /api/faturas/charge-details?chargeId=10051002 <- 前
GET /api/faturas/charge-details?chargeId=10051001 <- 后
```

你会发现你改了后面的参数，你不知道他意味着什么，但是如果他返回了一些你意想不到的东西，例如：**人名，身份证，手机号**，如果你可以看到这些的话，那么对于这个东西他将会是一个灾难，这些不应该被你看到！！！

> [!node] 恭喜
> 到现在你已经发现了你的第一个漏洞，你可以将它交到正规平台，获取报酬

欧克，通过前面的简单的讲解，可以开始后面的知识点的讲解了

# what a 控制访问错误

> [!node] 概念
> **访问控制**是一组规则，用于决定_谁可以执行哪些操作_。身份验证回答“**你是谁？** ”；授权回答“**你能执行此操作吗？** ”。当应用程序**在授权过程中出错**时，就会出现访问控制失效的情况：它知道你是谁，但忘记检查你是否_有权_访问该资源或执行该功能。

就像前文提到的例子，你可以访问任意的东西，只需要改变参数即可

|缩写|名称|攻击者会做什么|
|---|---|---|
|IDOR|Insecure Direct Object Reference（不安全直接对象引用）|更换某个对象的标识符（id、cpf、chargeId），访问其他用户的数据|
|BOLA|Broken Object Level Authorization（对象级授权失效）|与 IDOR 概念相同，但这是 API 领域的官方术语（在 OWASP API Top 10 中排名第 1）|
|BFLA|Broken Function Level Authorization（功能级授权失效）|访问某个本应只属于其他角色的功能/操作（例如：普通用户执行管理员操作）|
总结一下最容易混淆的区别：

- IDOR/BOLA = 对某个对象/数据的不当访问（“我能看到别人的账单”）。
    
- BFLA = 对某个功能的不当访问（“我以普通用户身份执行管理员操作”）。

## 重要性

这个涉及一些保密的问题，导致他是目前是最简单也是回报最高的一类漏洞

他会导致一下问题
- 信息的泄密问题
- 账户的接管问题
- 特权操作

## 原理

> [!node] 笔记
> 其实是很简单了，就如同在赏金猎人文章里面写的，一个程序他是需要有客户端，服务端，数据库的，而这里是需要注意，在开发一个程序过程中，需要去判断他是不是当前用户，他有没有换人。



```http
GET /api/pedidos?id=1001 HTTP/2
Host: alvo.com
Authorization: Bearer eyJhbGciOi...   # <- 这个时候他会认为你是用户b
```

```sql
// 后端直接返回了数据
$pedido = $db->query("SELECT * FROM pedidos WHERE id = " . $_GET['id']);
return json($pedido);   // 他没有验证你是不是用户b
```

> **Token /`Authorization: Bearer`**：用于在每次请求中证明您身份的凭证（没有它，您就无法“登录”）。它通常是**JWT**（`header.payload.signature`Base64URL 格式）。详情请参阅术语表。



# 可能出现的情况

- **基于连续数字 ID 的 IDOR**：经典情况，`?id=1001` → `?id=1002`。
    
- **业务参数中的 IDOR**：标识符不是明显的 id，而是类似 `?cpf=`、`?NroConta=`、`?chargeId=`、`?id_subgrupo=`。
    
- **请求体（POST/PUT）或 Header 中的 IDOR**：标识符放在 JSON 或自定义 Header 里，而不是 URL 中。
    
- **通过账号间 token 互换实现的 IDOR**：你保持自己的访问权限，但使用另一个角色才能访问的端点，只替换授权 token（常见于报表下载场景）。
    
- **“伪装”的 IDOR**：ID 是 UUID/哈希/加密值。有时 API 本身会返回某个参数加密后的值，这样就可以复用它。
    
- **BFLA**：特权功能对应的端点存在且会响应，只是本不应该接受你当前的角色。


# 侦察

> [!node] 寻找猎物
> 已经学习了最基本的东西了，那么该怎么来办呢
> 第一步肯定是先去看看有没有什么接口可以来利用的。
>       正所谓，工欲善其事，必先利其器。
>       一般情况下，作者都是用google浏览器的插件来进行的，例如lovejs，雪瞳， FindSomething这些工具

![[Pasted image 20260826175626.png]]
![[Pasted image 20260826175704.png]]
![[Pasted image 20260826175724.png]]

他里面或多或少肯定是会有一些东西会有问题，到时候就看大家自己的耐心和运气了，看看能不能找到了

## 深入

### 一级：枚举 URL 中的 ID（GET）

```http
GET /api/faturas/charge-details?chargeId=10051002 HTTP/2   # 原请求
GET /api/faturas/charge-details?chargeId=10051001 HTTP/2   # 修改后的请求
```

如果它返回的值不是你的值 → IDOR 已确认。为了展示**规模**，请使用**Burp Intruder**并携带数值有效载荷（有效载荷是 Burp 自动注入的值列表；`Sniper`它是每次改变一个位置的模式，这里是`chargeId`），看看有多少 ID 会返回 200 个不同的数据。

### 二级：体内识别/非显性方法

简单来说就是，要改动的数值不是在GET的后面了，而是在每个请求包的下面


```http
PUT /api/usuario HTTP/2
Host: alvo.com
Content-Type: application/json
Authorization: Bearer <token_da_Conta_B>

{"userId": 1001, "telefone": "11999999999"}   # <- 在除了GET方法以外剩下的很多的东西都是存放在这里的
```

你可以像在GET方法中一样进行修改就行

### 三级：令牌交换

> [!node] 概念
> 他是将一个不可以使用某个权利的账号的令牌（Authorization），换给可以使用这个权利的账号的令牌，但是这个账号可以使用这个权利。

>[!example] 例子
>校长用学生的身份，开除了学生。

当然，这个可能是一个很地狱的笑话，但是他在**日常的测试**中可能会真实的碰到，导致出现了这个问题。如果之后工作的时候可以试试这个东西，当然如果你自己测试的话，需要注意，不要做不利于自己的事情

### 四级：BFLA

> [!ndoe] 作者的小提问
> 还记得BFLA是什么吗？
> 他是说明一个特权可以被其他人使用的情况


```http
POST /api/admin/store/block HTTP/2
Authorization: Bearer <token_do_usuario_comum>   # <- 没有权限的角色（普通用户 token）
{"storeId": 77}
```

这个的测试就比较有意思了，在第三级的时候是将一个有该权限的人的令牌给换成了没有该权限的人的令牌，而这个是直接用他们**各自的令牌**来进行测试，看看普通用户是否可以使用某些核心功能

### 五级：“受身份保护”的标识

到了这一级就是IDOR的变种了，会相较于前面的哪几种会**难**很多，但是不要紧，跟着我的思路

#### UUID / Hash类型的ID

> [!node] 注意
> 开发者认为只要我把很多的东西变成不可预测的那种，那么我就不会被攻击，这个是一个**很严重的一个错误**
> 身为猎人，我是无法通过枚举（猜测）来实现类似于第一二种的那个东西
> 但是他忽略了另外一个东西---**越权**，我可以用其他人的UUID来进行

#### API 返回的加密/签名值重用

简单来说，他还是延续了上面的那个理念，反正就是不让你猜到某些东西，但是为了拿到赏金，你需要去看看有没有什么方法可以拿到什么东西。（这个就不做过多的讲解，需要自己参悟了）

> [!example] 例子
> 用户A请求了一个东西返回了一个数据，但是这个是加密的
> 用户B使用了这个数据，并把它放到了其他的接口（请求的地方）中
> 如果服务端那边没有认证你这个人的话，那么用户B就可以看到用户A的很多的东西了

#### 通过密码重置/刷新流程实现账户接管（ATO）

> [!node] 知识点
> IDOR 不仅可以用来读取数据，还可以用在**关键业务流程**中，比如密码重置、刷新令牌、修改绑定邮箱等。如果在这些流程中，用户标识符（如 `login`、`email`、`userId`）可以被替换，攻击者就能劫持另一个账户。

```http
POST /autenticacao/api/v1/alterar-senha HTTP/2
{"usuario": "vitima_alvo", "novaSenha": "Senha123!", "confirmaSenha": "Senha123!"}
# <- "usuario" 本应在会话中固定；如果接受其他用户，就是账户接管（ATO）
```

对于这个漏洞，你可能会将对方的用户邮箱或者其他可能可以证明他身份的东西替换成你自己，这样就会

更加详细的一个讲解：[[账户接管（ATO）：接管任何账户]]
# 防御

> [!node] 措施
> 为什么会出现这么多的一个问题，最简单的原因就是，服务端并没有验证一些东西导致的
> 而任何解决这个问题呢，仅仅需要让**服务端**可以**识别**这个到底是不是**你这个人发布并且使用**的就可以了，不能出现**张冠李戴**的情况了

## 检查用户的所有权
```js
// 错误 —— 信任客户端传来的 id  
`$pedido = Pedido::find($_GET['id']);`  
// 正确 —— 只有对象属于当前登录用户时才返回  
`$pedido = Pedido::where('id', $req->id)->where('dono_id', auth()->id())->firstOrFail();`
```

```js
// 两者匹配才能给出对应的东西，否则返回404
const pedido = await Pedido.findOne({ _id: req.params.id, donoId: req.user.id });
if (!pedido) return res.sendStatus(404);
```

## 授权

```python
@permission_classes([IsAdminUser])
def block_store(request): ...
```

> [!danger] 警告
> 要时刻谨记前端送过来的东西一个都不能信，信了就完了，永远需要在后端才重新过一遍才可以，确定好了才能执行

## 原则

- **默认拒绝**：除非明确允许，否则所有操作均被拒绝。
- **不要依赖客户端的任何信息**来决定授权（例如，错误的客户端 JWT 中的 ID、角色、标志等）。
- **不可预测的 ID**（UUID v4）有助于防止枚举，但**不能取代**所有者检查。
- **登录并报告**被拒绝/异常的访问（枚举会产生很多 403/404 错误）。
- **CI 中的授权测试**：对于每个端点，测试“帐户 B 无法访问帐户 A 对象”。

# 猎人清单

- [ ] 先去在各种请求中修改各种数据，看返回的东西
- [ ] 在靶场中去看看能不能用管理员的功能
- [ ] 在靶场中看看普通用户和管理员功能直接的差距
- [ ] 在真实的网络环境中去查看并且寻找，但是不要修改他们的东西

## 收获

- 理解这几个东西分别代表什么，分别影响什么
- 学习并利用工具
- 切记，在后端中，永远不要信任前端发送回来的东西，这个永远是正确的

# 参考文章

- [Access control vulnerabilities and privilege escalation \| Web Security Academy](https://portswigger.net/web-security/access-control) --- 访问控制漏洞
- [OWASP A01:2021 — 访问控制失效](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [reddelexc/hackerone-reports — 顶级 IDOR 报告](https://github.com/reddelexc/hackerone-reports/blob/master/tops_by_bug_type/TOPIDOR.md)
- [OWASP API 安全——BOLA（API1:2023）](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)和[BFLA（API5:2023）](https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/)

