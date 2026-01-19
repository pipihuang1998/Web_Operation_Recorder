# 白名单配置指南 (Whitelist Configuration Guide)

Test Recorder 插件使用白名单机制来决定哪些网络请求（XHR/Fetch）应该被捕获。只有匹配白名单中定义的 URL 前缀的请求才会被记录。

## 配置项说明

在插件的 **Settings (设置)** 界面中，您可以添加多个白名单配置项。每个配置项包含以下字段：

### 1. Alias (别名)
- **描述**: 用于标识该 URL 对应的系统名称。
- **作用**: 在生成的测试报告中，`systemAlias` 字段将使用此值。
- **示例**: `CITC`, `ERP`, `PaymentService`

### 2. URL Prefix (URL 前缀)
- **描述**: 需要捕获的 URL 的起始部分。
- **匹配规则**:
    - 采用 **最长前缀匹配 (Longest Prefix Match)** 原则。
    - 如果一个请求 URL 同时匹配多个配置项的前缀，插件将选择前缀最长的那个配置项。
    - 匹配成功后，前缀部分将从 URL 中移除，剩余部分作为 `path` 记录。
- **示例**: `https://api.example.com/v1/`

### 3. 【自动过滤网关】 (Auto-filter Gateway)
- **描述**: 一个复选框选项。
- **作用**: 用于处理包含网关路由信息的路径。
- **逻辑**:
    - 如果勾选此选项，插件在截取 `path` 后，会进一步检查其中是否包含冒号 (`:`)。
    - 如果存在冒号，**第一个冒号及其之前的所有内容**将被移除。
    - 如果不存在冒号，路径保持不变。
- **适用场景**: 当 URL 路径中包含类似 `gateway-id:service-name/api` 的结构，且您希望去除网关部分，只保留实际业务路径时。

---

## 配置示例

假设我们有以下网络请求：
`https://fincloud.com/gateway/auth:user-service/login`

### 场景 A：基本配置 (不勾选过滤)

| 配置项 | 值 |
| :--- | :--- |
| **Alias** | `UserSystem` |
| **URL Prefix** | `https://fincloud.com/gateway/` |
| **自动过滤网关** | ⬜ (未勾选) |

**捕获结果**:
- `systemAlias`: "UserSystem"
- `path`: "auth:user-service/login"  (保留了冒号部分)

### 场景 B：启用网关过滤 (勾选过滤)

| 配置项 | 值 |
| :--- | :--- |
| **Alias** | `UserSystem` |
| **URL Prefix** | `https://fincloud.com/gateway/` |
| **自动过滤网关** | ✅ (已勾选) |

**捕获结果**:
- `systemAlias`: "UserSystem"
- `path`: "user-service/login"
- **说明**: 路径中的 `auth:` 部分被自动移除。

### 场景 C：多级冒号 (勾选过滤)

假设请求为: `https://fincloud.com/gateway/router:part1:part2/api`

| 配置项 | 值 |
| :--- | :--- |
| **自动过滤网关** | ✅ (已勾选) |

**捕获结果**:
- `path`: "part1:part2/api"
- **说明**: 只移除 **第一个** 冒号之前的内容。
