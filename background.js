// 存储检测结果
const detectionResults = {};

// 接收来自内容脚本的检测结果
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'FRAMEWORK_DETECTION') {
        detectionResults[sender.tab.id] = message.data;
        updateIcon(sender.tab.id);
    }
});

// 标签页更新时清除旧数据
chrome.tabs.onUpdated.addListener((tabId) => {
    delete detectionResults[tabId];
    // 重置图标
    chrome.action.setIcon({
        path: "icons/icon.svg",
        tabId
    });
});

// 处理来自popup的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getDetectionResults') {
        sendResponse(detectionResults[request.tabId] || {
            typecho: { detected: false },
            ttdf: { detected: false }
        });
    }
});

// 更新图标状态
function updateIcon(tabId) {
    const result = detectionResults[tabId];
    if (!result) return;

    if (result.ttdf.detected) {
        chrome.action.setIcon({
            path: "icons/ttdf-detected.svg",
            tabId
        });
    } else if (result.typecho.detected) {
        chrome.action.setIcon({
            path: "icons/typecho-detected.svg",
            tabId
        });
    }
}