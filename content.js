/**
 * 主检测函数 - 检测当前页面是否使用Typecho
 * @return {Object} 检测结果对象
 */
function detectTypecho() {
    // 匹配meta generator标签
    const metaGenerator = document.querySelector('meta[name="generator"]');
    const isTypechoMeta = metaGenerator &&
        /Typecho\s*\d+\.\d+(\.\d+)?/i.test(metaGenerator.content);

    // 检测Typecho资源路径
    const typechoResourcePatterns = [
        // 主题资源路径
        /\/usr\/themes\/[\w-]+\/(?:style|main|theme|custom)(?:\.min)?\.(css|js)(?:\?.*)?$/i,
        /\/usr\/themes\/[\w-]+\/assets\/[\w\/-]+\.(css|js)(?:\?.*)?$/i,
        /\/usr\/themes\/[\w-]+\/js\/[\w-]+\.(js)(?:\?.*)?$/i,
        /\/usr\/themes\/[\w-]+\/css\/[\w-]+\.(css)(?:\?.*)?$/i,

        // 插件资源路径
        /\/usr\/plugins\/[\w-]+\/(?:script|main|plugin|admin)(?:\.min)?\.(js)(?:\?.*)?$/i,
        /\/usr\/plugins\/[\w-]+\/(?:style|main|plugin|admin)(?:\.min)?\.(css)(?:\?.*)?$/i,
        /\/usr\/plugins\/[\w-]+\/assets\/[\w\/-]+\.(css|js)(?:\?.*)?$/i,

        // 核心资源路径
        /\/admin\/assets\/[\w\/-]+\.(css|js)(?:\?.*)?$/i,
        /\/var\/[\w\/-]+\.(css|js)(?:\?.*)?$/i,

        // 特殊文件
        /\/install\.php(?:\?.*)?$/i,
        /\/xmlrpc\.php(?:\?.*)?$/i,
        /\/action\/[\w-]+(?:\?.*)?$/i
    ];

    // 检查所有元素中的资源引用
    const isTypechoPath = checkResources(typechoResourcePatterns);

    // 检测Typecho特有的HTML结构
    const typechoElements = [
        'form[action*="action/login"] input[name="referer"]',
        'div.typecho-login',
        'div.typecho-page-title',
        'ul.typecho-option-list',
        'div.typecho-foot',
        'div#typecho-navbar',
        'div.typecho-header',
        'div.typecho-nav-list'
    ];

    const isTypechoStructure = typechoElements.some(selector =>
        document.querySelector(selector) !== null
    );

    // 检测cookie
    const isTypechoCookie = document.cookie.includes('__typecho_');

    // API端点检测
    const isTypechoAPI = checkAPIEndpoints();

    // RSS链接检测
    const isTypechoRSS = checkRSSLinks();

    // TTDF框架检测
    const ttdfInfo = detectTTDF();

    return {
        isTypecho: isTypechoMeta || isTypechoPath || isTypechoStructure || isTypechoCookie || isTypechoAPI || isTypechoRSS,
        details: {
            byMetaTag: isTypechoMeta,
            byPath: isTypechoPath,
            byStructure: isTypechoStructure,
            byCookie: isTypechoCookie,
            byAPI: isTypechoAPI,
            byRSS: isTypechoRSS,
            matchedResources: isTypechoPath ? getMatchedResources(typechoResourcePatterns) : []
        },
        confidence: calculateConfidence(
            isTypechoMeta,
            isTypechoPath,
            isTypechoStructure,
            isTypechoCookie,
            isTypechoAPI,
            isTypechoRSS
        ),
        ttdf: ttdfInfo
    };
}

/**
 * 检查Typecho特有的HTML结构
 * @return {boolean} 是否匹配Typecho结构
 */
function checkTypechoStructure() {
    const typechoElements = [
        'form[action*="action/login"] input[name="referer"]',
        'div.typecho-login',
        'div.typecho-page-title',
        'ul.typecho-option-list',
        'div.typecho-foot',
        'div#typecho-navbar',
        'div.typecho-header',
        'div.typecho-nav-list'
    ];

    return typechoElements.some(selector =>
        document.querySelector(selector) !== null
    );
}

/**
 * 优化后的API端点检测
 * @return {boolean} 是否检测到Typecho API
 */
function checkAPIEndpoints() {
    // XML-RPC
    const hasXMLRPC = Array.from(document.querySelectorAll('link, script, a, form'))
        .some(el => {
            const url = el.href || el.src || el.action;
            return url && /\/xmlrpc\.php(?:\?.*)?$/i.test(url);
        });

    // Action
    const hasActionAPI = Array.from(document.querySelectorAll('link, script, a, form'))
        .some(el => {
            const url = el.href || el.src || el.action;
            return url && /\/action\/[\w-]+(?:\?.*)?$/i.test(url);
        });

    // JSON API
    const hasJSONAPI = Array.from(document.querySelectorAll('script'))
        .some(script => {
            return script.src && /\/action\/[\w-]+\.json(?:\?.*)?$/i.test(script.src);
        });

    // AJAX
    const hasTypechoAJAX = Array.from(document.querySelectorAll('script'))
        .some(script => {
            if (!script.src && script.textContent) {
                return /typecho_ajax/i.test(script.textContent) ||
                    /\.action\s*=\s*['"][^'"]*typecho/i.test(script.textContent);
            }
            return false;
        });

    // 全局变量
    const hasTypechoGlobals = typeof window.typecho !== 'undefined' ||
        typeof window.Typecho !== 'undefined';

    return hasXMLRPC || hasActionAPI || hasJSONAPI || hasTypechoAJAX || hasTypechoGlobals;
}

/**
 * 检查RSS链接
 * @return {boolean} 是否检测到Typecho特有的RSS链接
 */
function checkRSSLinks() {
    const rssLinks = Array.from(document.querySelectorAll('link[rel="alternate"]'))
        .filter(link => {
            const type = link.getAttribute('type');
            const href = link.getAttribute('href');
            return (type === 'application/rss+xml' ||
                type === 'application/rdf+xml' ||
                type === 'application/atom+xml') &&
                href && /\/feed(?:\/|\/rss|\/atom)?\/?$/i.test(href);
        });

    return rssLinks.length > 0;
}

/**
 * 检查所有资源引用
 * @param {Array} patterns - 正则表达式模式数组
 * @return {boolean} 是否匹配任何资源路径
 */
function checkResources(patterns) {
    const elements = [
        ...document.querySelectorAll('link[href], script[src], img[src]'),
        ...document.querySelectorAll('*[style*="background-image"]')
    ];

    for (const el of elements) {
        let url = el.href || el.src;

        // 处理背景图片
        if (!url && el.style && el.style.backgroundImage) {
            const match = el.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (match) url = match[1];
        }

        if (url && patterns.some(pattern => pattern.test(url))) {
            return true;
        }
    }

    // 检查内联脚本中的路径
    const scripts = document.querySelectorAll('script:not([src])');
    for (const script of scripts) {
        if (script.textContent && patterns.some(pattern =>
            pattern.test(script.textContent)
        )) {
            return true;
        }
    }

    return false;
}

/**
 * 获取匹配的资源路径
 * @param {Array} patterns - 正则表达式模式数组
 * @return {Array} 匹配的资源路径数组
 */
function getMatchedResources(patterns) {
    const resources = new Set();
    const elements = [
        ...document.querySelectorAll('link[href], script[src], img[src]'),
        ...document.querySelectorAll('*[style*="background-image"]')
    ];

    for (const el of elements) {
        let url = el.href || el.src;

        // 处理背景图片
        if (!url && el.style && el.style.backgroundImage) {
            const match = el.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (match) url = match[1];
        }

        if (url) {
            for (const pattern of patterns) {
                if (pattern.test(url)) {
                    resources.add(url);
                    break;
                }
            }
        }
    }

    // 检查内联脚本中的路径
    const scripts = document.querySelectorAll('script:not([src])');
    for (const script of scripts) {
        if (script.textContent) {
            for (const pattern of patterns) {
                const matches = script.textContent.match(pattern);
                if (matches) {
                    matches.forEach(match => resources.add(match));
                }
            }
        }
    }

    return Array.from(resources);
}


/**
 * 检测TTDF框架
 * @return {Object} TTDF框架信息对象
 */
function detectTTDF() {
    const metaFramework = document.querySelector('meta[name="framework"]');
    if (metaFramework) {
        const content = metaFramework.content;
        const ttdfMatch = content.match(/^TTDF\s+([\d.]+(?:_\w+)?)$/i);
        if (ttdfMatch) {
            return {
                isTTDF: true,
                version: ttdfMatch[1]
            };
        }
    }
    return {
        isTTDF: false
    };
}

/**
 * 计算置信度
 * @param {boolean} meta - Meta标签是否匹配
 * @param {boolean} path - 路径特征是否匹配
 * @param {boolean} structure - HTML结构是否匹配
 * @param {boolean} cookie - Cookie特征是否匹配
 * @param {boolean} api - API端点是否匹配
 * @param {boolean} rss - RSS链接是否匹配
 * @return {number} 置信度百分比(0-100)
 */
function calculateConfidence(meta, path, structure, cookie, api, rss) {
    // 如果meta标签匹配，直接100%
    if (meta) return 100;

    // 特征匹配数量
    const matchedFeatures = [path, structure, cookie, api, rss].filter(Boolean).length;

    // 基础分数计算
    let score = 0;
    if (path) score += 0.35;    // 路径特征
    if (structure) score += 0.2; // HTML结构
    if (cookie) score += 0.1;  // Cookie
    if (api) score += 0.2;     // API端点
    if (rss) score += 0.15;    // RSS链接

    // 特殊规则：多个特征组合提升置信度
    if (path && api && rss) return 90;   // 路径+API+RSS = 90%
    if (path && api) score = Math.max(score, 0.85); // 路径+API = 85%
    if (path && rss) score = Math.max(score, 0.8);  // 路径+RSS = 80%
    if (api && rss) score = Math.max(score, 0.75);   // API+RSS = 75%
    if (matchedFeatures >= 3) score = Math.max(score, 0.7); // 3个特征 = 70%

    // 确保分数在0-100%范围内
    return Math.min(Math.round(score * 100), 100);
}

// 监听来自popup的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'DETECT_TYPECHO') {
        sendResponse(detectTypecho());
    }
    return true;
});