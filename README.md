# Chrome 测试操作录制插件 (Chrome Test Recorder)

这是一个 Chrome 扩展程序，旨在测试用例执行期间录制用户操作并捕获网络流量（XHR/Fetch）。它会在页面中注入一个侧边栏来管理测试会话。

## 1. 安装

### 前置要求

* Google Chrome 浏览器。

### 步骤

1. 下载或克隆 (clone) 此代码库。
2. 打开 Chrome 并访问 `chrome://extensions/`。
3. 开启右上角的 **开发者模式 (Developer mode)**。
4. 点击左上角的 **加载已解压的扩展程序 (Load unpacked)**。
5. 选择本项目中的 `src/` 目录。
6. "Test Recorder & Interceptor" 扩展程序应出现在您的列表中。

## 2. 使用指南

### 设置

1. 导航至您想要测试的 Web 应用程序（或在 Chrome 中打开提供的 `test/test_page.html`）。
2. 点击工具栏中的扩展程序图标。页面右侧将出现一个侧边栏。
3. 在侧边栏中，您将看到模拟测试用例列表（例如 "User Login" / 用户登录）。

### 录制

1. 从列表中选择一个测试用例。
2. 点击 **Start Recording**（开始录制）。
3. 在页面上执行操作：
* **点击** 元素（按钮、链接）。
* 在字段中 **输入** 文本。
* 侧边栏将实时记录这些操作。
* 应用程序发起的任何 API 调用（XHR/Fetch）也将记录在侧边栏中。



### 验证与提交

1. 测试步骤完成后，点击 **Stop**（停止）。
2. 将出现验证按钮：
* **Pass**（通过）：如果测试通过，点击此按钮。会话数据将被“上传”（在此演示中会记录到控制台）。
* **Fail**（失败）：如果测试失败，点击此按钮。


3. 如果选择了 **Fail**：
* 会出现一个文本区域用于描述缺陷。
* 点击 **Submit Defect**（提交缺陷）。
* 扩展程序将自动截取当前标签页的屏幕截图并将其包含在报告中。
* 检查 Chrome 开发者工具控制台（`F12` > Console）以查看最终的 JSON 输出。



## 3. 代码结构

* **src/manifest.json**: 扩展配置。定义权限（`activeTab`, `storage`, `scripting`）和脚本。
* **src/background.js**: Service worker（服务工作线程）。处理浏览器事件，如点击扩展图标和捕获屏幕截图。
* **src/content.js**: 注入到网页中的主脚本。
* 管理 **侧边栏 UI**（Shadow DOM）。
* 监听 DOM 事件（点击、更改）以生成 **元素指纹 (element fingerprints)**。
* 接收来自 `inject.js` 的网络日志。


* **src/inject.js**: 注入到页面上下文中的脚本，用于对 `XMLHttpRequest` 和 `window.fetch` 进行“猴子补丁” (monkey-patch/拦截修改)。它拦截网络流量并通过 `window.postMessage` 将详情发送回 `content.js`。
* **test/**: 包含验证脚本和虚拟测试页面。
* `verify_inject.js`: 用于验证网络拦截逻辑的 Node.js 脚本。
* `verify_content_logic.js`: 用于验证元素指纹识别逻辑的 Node.js 脚本。
* `test_page.html`: 用于手动测试扩展程序的简单 HTML 页面。



## 4. 功能详情

### 网络拦截

该扩展程序注入代码以包装 `XMLHttpRequest.prototype.open`、`XMLHttpRequest.prototype.send` 和 `window.fetch`。它捕获：

* 方法 (GET, POST 等)
* URL
* 请求体 (Request Body)
* 响应体 (Response Body)（如果是 JSON）
* 状态码 (Status Code)

### 元素指纹识别 (Element Fingerprinting)

当用户与页面交互时，扩展程序会为目标元素生成唯一的“指纹”，包括：

* 标签名、ID、Class
* 内部文本 (Inner Text)
* 层级结构 (CSS 选择器 / 完整路径)
* 几何位置 (BoundingRect)

这些数据对于可靠的测试回放和分析至关重要。


# Chrome Test Recorder & Interceptor

This is a Chrome Extension designed to record user actions and capture network traffic (XHR/Fetch) during test case execution. It injects a sidebar into the page to manage test sessions.

## 1. Installation

### Requirements
- Google Chrome browser.

### Steps
1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select the `src/` directory of this project.
6. The extension "Test Recorder & Interceptor" should appear in your list.

## 2. Usage Guide

### Setup
1. Navigate to the web application you want to test (or open the provided `test/test_page.html` in Chrome).
2. Click the extension icon in the toolbar. A sidebar will appear on the right side of the page.
3. In the sidebar, you will see a list of mock test cases (e.g., "User Login").

### Recording
1. Select a test case from the list.
2. Click **Start Recording**.
3. Perform actions on the page:
   - **Click** elements (buttons, links).
   - **Input** text into fields.
   - The sidebar will log these actions in real-time.
   - Any API calls (XHR/Fetch) made by the application will also be logged in the sidebar.

### Verification & Submission
1. Once the test steps are done, click **Stop**.
2. Verification buttons will appear:
   - **Pass**: If the test passed, click this. The session data is "uploaded" (logged to console in this demo).
   - **Fail**: If the test failed, click this.
3. If **Fail** is chosen:
   - A text area appears to describe the defect.
   - Click **Submit Defect**.
   - The extension will automatically capture a screenshot of the current tab and include it in the report.
   - Check the Chrome DevTools Console (`F12` > Console) to see the final JSON output.

## 3. Code Structure

- **src/manifest.json**: Extension configuration. Defines permissions (`activeTab`, `storage`, `scripting`) and scripts.
- **src/background.js**: Service worker. Handles browser events like clicking the extension icon and capturing screenshots.
- **src/content.js**: The main script injected into the web page.
  - Manages the **Sidebar UI** (Shadow DOM).
  - Listens for DOM events (click, change) to generate **element fingerprints**.
  - Receives network logs from `inject.js`.
- **src/inject.js**: A script injected into the page context to monkey-patch `XMLHttpRequest` and `window.fetch`. It intercepts network traffic and sends details back to `content.js` via `window.postMessage`.
- **test/**: Contains verification scripts and a dummy test page.
  - `verify_inject.js`: Node.js script to verify network interception logic.
  - `verify_content_logic.js`: Node.js script to verify element fingerprinting logic.
  - `test_page.html`: A simple HTML page to test the extension manually.

## 4. Functionality Details

### Network Interception
The extension injects code to wrap `XMLHttpRequest.prototype.open`, `XMLHttpRequest.prototype.send`, and `window.fetch`. It captures:
- Method (GET, POST, etc.)
- URL
- Request Body
- Response Body (if JSON)
- Status Code

### Element Fingerprinting
When a user interacts with the page, the extension generates a unique "fingerprint" for the target element, including:
- Tag Name, ID, Class
- Inner Text
- Hierarchy (CSS Selector / Full Path)
- Geometrical position (BoundingRect)

This data is crucial for reliable test replay and analysis.
