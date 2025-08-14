document.addEventListener('DOMContentLoaded', () => {
  const resultDiv = document.getElementById('result');

  // 根据置信度生成标题和说明
  function generateConfidenceDisplay(confidence) {
    if (confidence === 100) {
      return {
        title: '确信是Typecho',
        detail: '找到meta标签'
      };
    } else if (confidence >= 90) {
      return {
        title: '高度确信是Typecho',
        detail: '多个强特征匹配'
      };
    } else if (confidence >= 80) {
      return {
        title: '很可能是Typecho',
        detail: '关键特征匹配'
      };
    } else {
      return {
        title: '可能是Typecho',
        detail: '部分特征匹配'
      };
    }
  }

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'DETECT_TYPECHO' }, response => {
      if (!response || chrome.runtime.lastError) {
        resultDiv.innerHTML = `<div class="error">检测失败，请刷新页面后重试</div>`;
        return;
      }

      const { details, confidence, ttdf } = response;
      const isTypecho = response.isTypecho;

      // 构建检测结果HTML
      let resultHTML = '';
      if (isTypecho) {
        const confidenceDisplay = generateConfidenceDisplay(confidence);

        resultHTML = `
        <div style="text-align: center;">
          <h3 class="positive">
            ${confidenceDisplay.title}
          </h3>
          <small>${confidenceDisplay.detail}</small>
        </div>
        `;

        resultHTML += `
          <div class="details">
            <p><strong>检测依据:</strong></p>
            <ul>
              <li class="${details.byMetaTag ? 'match' : ''}">Meta标签: ${details.byMetaTag ? '✔️ 匹配' : '❌ 未匹配'}</li>
              <li class="${details.byPath ? 'match' : ''}">路径特征: ${details.byPath ? '✔️ 匹配' : '❌ 未匹配'}</li>
              <li class="${details.byStructure ? 'match' : ''}">HTML结构: ${details.byStructure ? '✔️ 匹配' : '❌ 未匹配'}</li>
              <li class="${details.byCookie ? 'match' : ''}">Cookie特征: ${details.byCookie ? '✔️ 匹配' : '❌ 未匹配'}</li>
              <li class="${details.byAPI ? 'match' : ''}">API端点: ${details.byAPI ? '✔️ 匹配' : '❌ 未匹配'}</li>
              <li class="${details.byRSS ? 'match' : ''}">RSS链接: ${details.byRSS ? '✔️ 匹配' : '❌ 未匹配'}</li>
            </ul>
          </div>
        `;

        // 判断是否使用TTDF框架开发
        if (ttdf.isTTDF) {
          resultHTML += `
            <div style="text-align: center; margin: 5px 0;">
              <small>主题使用 TTDF v${ttdf.version} 构建.</small>
            </div>
          `;
        }

      } else {
        resultHTML = `
          <h3 class="negative">未发现Typecho的特征标识</h3>
        `;
      }

      resultDiv.innerHTML = resultHTML;
    });
  });
});