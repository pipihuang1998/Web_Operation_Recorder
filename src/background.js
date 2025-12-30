chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_SIDEBAR" }).catch((err) => {
    console.warn("Could not send message to content script. The page might not have loaded the script yet.", err);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "CAPTURE_SCREENSHOT") {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" })
      .then((dataUrl) => {
        sendResponse({ success: true, dataUrl: dataUrl });
      })
      .catch((error) => {
        console.error("Screenshot failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});
