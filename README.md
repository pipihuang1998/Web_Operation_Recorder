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
