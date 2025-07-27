/**
 * EPUB阅读器词典查询功能
 * 支持选中文本查询、复制文本查询等功能
 */

console.log('📚 词典查询功能已加载！');

// 词典数据（可以扩展为在线API）
const dictionaryData = {
    // 日语词典数据示例
    'こんにちは': {
        reading: 'konnichiwa',
        meaning: '你好（下午问候语）',
        type: '问候语',
        examples: ['こんにちは、元気ですか？']
    },
    'ありがとう': {
        reading: 'arigatou',
        meaning: '谢谢',
        type: '感谢语',
        examples: ['ありがとうございます']
    },
    '森': {
        reading: 'もり (mori)',
        meaning: '森林，树林',
        type: '名词',
        examples: ['森の中を歩く']
    },
    'ノルウェー': {
        reading: 'Norway',
        meaning: '挪威',
        type: '地名',
        examples: ['ノルウェーの森']
    }
};

// 全局变量
let selectedText = '';
let dictionaryPanel = null;
let isDictionaryEnabled = true;

// 初始化词典功能
function initDictionary() {
    console.log('🔍 初始化词典功能...');

    // 创建词典面板
    createDictionaryPanel();

    // 绑定事件监听器
    setupDictionaryEvents();

    // 启用epub.js文本选择监听
    enableEpubTextSelection();

    // 初始化按钮状态
    updateDictionaryButtonState();

    console.log('✅ 词典功能初始化完成');
}

// 更新词典按钮状态
function updateDictionaryButtonState() {
    const menuToggle = document.getElementById('dictToggleBtn');
    if (menuToggle) {
        if (isDictionaryEnabled) {
            menuToggle.classList.add('active');
            menuToggle.title = '词典已启用 - 点击禁用';
        } else {
            menuToggle.classList.remove('active');
            menuToggle.title = '词典已禁用 - 点击启用';
        }
    }
}

// 创建词典查询面板
function createDictionaryPanel() {
    // 检查是否已存在
    if (document.getElementById('dictionaryPanel')) {
        return;
    }

    const panel = document.createElement('div');
    panel.id = 'dictionaryPanel';
    panel.className = 'dictionary-panel';
    panel.innerHTML = `
        <div class="dictionary-header">
            <h3>📚 日语词典查询</h3>
            <button class="close-dict-btn" onclick="hideDictionary()">×</button>
        </div>
        <div class="dictionary-content">
            <div class="search-box">
                <input type="text" id="dictSearchInput" placeholder="输入日语单词进行查询...">
                <button onclick="searchWord()">🔍</button>
            </div>
            <div class="word-info" id="wordInfo">
                <p class="placeholder">选中文本或输入单词进行查询</p>
                <p class="placeholder" style="font-size: 12px; margin-top: 10px;">
                    支持：汉字、假名、片假名等
                </p>
            </div>
            <div class="dict-controls">
                <button onclick="copySelectedText()" title="复制选中文本">📋</button>
                <button onclick="toggleDictionary()" title="开关词典功能">🔧</button>
                <button onclick="clearSearch()" title="清空搜索">🗑️</button>
            </div>
        </div>
    `;

    document.body.appendChild(panel);
    dictionaryPanel = panel;

    // 添加样式
    addDictionaryStyles();
}

// 添加词典面板样式
function addDictionaryStyles() {
    if (document.getElementById('dictionaryStyles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'dictionaryStyles';
    style.textContent = `
        .dictionary-panel {
            width: 400px;
            max-width: 90vw;
            max-height: 80vh;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            border: 1px solid #e1e5e9;
            overflow: hidden;
        }
        
        .dictionary-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #e1e5e9;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px 12px 0 0;
        }
        
        .dictionary-header h3 {
            margin: 0;
            font-size: 16px;
        }
        
        .close-dict-btn {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 5px;
            border-radius: 50%;
            transition: background-color 0.2s;
        }
        
        .close-dict-btn:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .dictionary-content {
            padding: 20px;
            height: calc(100% - 60px);
            overflow-y: auto;
        }
        
        .search-box {
            display: flex;
            margin-bottom: 20px;
            gap: 10px;
        }
        
        .search-box input {
            flex: 1;
            padding: 10px 15px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.2s;
        }
        
        .search-box input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .search-box button {
            padding: 10px 15px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .search-box button:hover {
            background: #5a6fd8;
        }
        
        .word-info {
            margin-bottom: 20px;
        }
        
        .word-info .placeholder {
            color: #666;
            font-style: italic;
            text-align: center;
            margin: 40px 0;
        }
        
        .word-entry {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        
        .word-entry h4 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 18px;
        }
        
        .word-reading {
            color: #666;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .word-writings {
            color: #666;
            font-size: 14px;
            margin-bottom: 8px;
            font-style: italic;
        }
        
        .word-meaning {
            color: #333;
            font-size: 16px;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .word-type {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-bottom: 10px;
        }
        
        .word-source {
            color: #999;
            font-size: 12px;
            margin-bottom: 10px;
            font-style: italic;
        }
        
        .word-examples {
            margin-top: 10px;
        }
        
        .word-examples h5 {
            margin: 0 0 5px 0;
            color: #555;
            font-size: 14px;
        }
        
        .word-examples ul {
            margin: 0;
            padding-left: 20px;
            color: #666;
            font-size: 14px;
        }
        
        .dict-controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            padding-top: 15px;
            border-top: 1px solid #e1e5e9;
        }
        
        .dict-controls button {
            padding: 8px 12px;
            background: #f8f9fa;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .dict-controls button:hover {
            background: #e9ecef;
        }
        
        .dict-controls button.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        /* 选中文本高亮 */
        .text-highlight {
            background-color: #fff3cd;
            border-radius: 3px;
            padding: 2px 4px;
        }
        

    `;

    document.head.appendChild(style);
}

// 设置词典事件监听器
function setupDictionaryEvents() {
    // 搜索框回车事件
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && document.activeElement.id === 'dictSearchInput') {
            searchWord();
        }
    });

    // 全局点击事件（点击外部关闭词典）
    document.addEventListener('click', function (e) {
        const panel = document.getElementById('dictionaryPanel');

        if (panel && panel.classList.contains('show') &&
            !panel.contains(e.target)) {
            hideDictionary();
        }
    });
}



// 启用epub.js文本选择监听
function enableEpubTextSelection() {
    console.log('🔍 启用epub.js文本选择监听...');
    console.log('🔍 当前window.rendition状态:', !!window.rendition);

    // 等待rendition创建后绑定epub.js的选择事件
    let checkCount = 0;
    const checkRendition = setInterval(() => {
        checkCount++;
        console.log(`🔍 第${checkCount}次检查rendition...`);

        if (window.rendition) {
            console.log('✅ 检测到rendition，开始绑定epub.js选择事件');
            const bindResult = bindEpubSelectionEvents();
            console.log('🔍 绑定结果:', bindResult);
            clearInterval(checkRendition);
        } else {
            console.log('⏳ rendition还未创建，继续等待...');
        }
    }, 500);

    // 30秒超时
    setTimeout(() => {
        clearInterval(checkRendition);
        console.warn('⚠️ 等待rendition超时，总共检查了', checkCount, '次');
        console.warn('⚠️ 最终window.rendition状态:', !!window.rendition);
    }, 30000);
}

// 绑定epub.js的选择事件
function bindEpubSelectionEvents() {
    try {
        if (!window.rendition) {
            console.error('❌ rendition不存在');
            return false;
        }

        console.log('🔍 开始绑定epub.js选择事件...');
        console.log('🔍 window.rendition:', window.rendition);
        console.log('🔍 rendition.on方法存在:', typeof window.rendition.on === 'function');

        // 监听epub.js的selected事件
        console.log('🔍 正在绑定selected事件监听器...');
        window.rendition.on('selected', function (cfiRange, contents) {
            console.log('🎯 ===== epub.js selected事件被触发了！ =====');
            console.log('🔍 isDictionaryEnabled:', isDictionaryEnabled);

            if (!isDictionaryEnabled) {
                console.log('🔍 词典功能已禁用，跳过处理');
                return;
            }

            console.log('🔍 cfiRange:', cfiRange);
            console.log('🔍 contents:', contents);
            console.log('🔍 contents.window:', contents?.window);

            try {
                // 从contents获取选中的文本
                const selection = contents.window.getSelection();
                console.log('🔍 selection对象:', selection);

                const text = selection.toString().trim();
                console.log('🔍 获取到的文本:', `"${text}"`);
                console.log('🔍 文本长度:', text.length);

                if (text && text.length > 0 && text.length < 100) {
                    selectedText = text;
                    console.log('✅ 成功保存选中文本:', selectedText);

                    // 显示查询按钮
                    showQueryButton(selection, contents);
                } else {
                    console.log('⚠️ 文本为空或过长，不保存');
                    hideQueryButton();
                }
            } catch (error) {
                console.error('❌ 处理selected事件失败:', error);
                console.error('❌ 错误详情:', error.stack);
            }
        });
        console.log('✅ selected事件监听器绑定完成');

        // 监听页面渲染事件，确保每个新页面都能触发选择事件
        console.log('🔍 正在绑定rendered事件监听器...');
        window.rendition.on('rendered', function (section, view) {
            console.log('🔍 新页面渲染完成:', section.index, section.href);
            console.log('🔍 视图对象:', view);

            // 确保新页面也能触发选择事件
            // epub.js的selected事件应该是全局的，但我们可以添加额外的调试
            if (view && view.document) {
                console.log('🔍 新页面文档已准备好');
            }
        });

        // 监听epub.js的selectedRange事件（如果存在）
        console.log('🔍 正在绑定selectedRange事件监听器...');
        window.rendition.on('selectedRange', function (cfiRange, contents) {
            console.log('🎯 ===== epub.js selectedRange事件被触发了！ =====');
            console.log('🔍 isDictionaryEnabled:', isDictionaryEnabled);

            if (!isDictionaryEnabled) {
                console.log('🔍 词典功能已禁用，跳过处理');
                return;
            }

            console.log('🔍 cfiRange:', cfiRange);
            console.log('🔍 contents:', contents);

            try {
                const selection = contents.window.getSelection();
                console.log('🔍 selection对象:', selection);

                const text = selection.toString().trim();
                console.log('🔍 获取到的文本:', `"${text}"`);

                if (text && text.length > 0 && text.length < 100) {
                    selectedText = text;
                    console.log('✅ 从selectedRange保存文本:', selectedText);
                }
            } catch (error) {
                console.error('❌ 处理selectedRange事件失败:', error);
                console.error('❌ 错误详情:', error.stack);
            }
        });
        console.log('✅ selectedRange事件监听器绑定完成');

        console.log('✅ 所有epub.js选择事件绑定完成');
        return true;

    } catch (error) {
        console.error('❌ 绑定epub.js选择事件失败:', error);
        console.error('❌ 错误详情:', error.stack);
        return false;
    }
}

// 显示单词信息
async function showWordInfo(word) {
    console.log('🔍 showWordInfo() 被调用，单词:', word);

    if (!dictionaryPanel) {
        console.error('❌ dictionaryPanel 不存在，无法显示单词信息');
        return;
    }

    const wordInfo = document.getElementById('wordInfo');
    const searchInput = document.getElementById('dictSearchInput');

    console.log('🔍 wordInfo 元素:', wordInfo);
    console.log('🔍 searchInput 元素:', searchInput);

    // 更新搜索框
    if (searchInput) {
        searchInput.value = word;
        console.log('🔍 已更新搜索框内容:', word);
    }

    // 显示加载状态
    console.log('🔍 显示加载状态...');
    wordInfo.innerHTML = `
        <div class="word-entry">
            <h4>${word}</h4>
            <p style="color: #666; text-align: center;">🔍 正在查询词典...</p>
        </div>
    `;

    try {
        // 查询单词
        console.log('🔍 开始查询单词...');
        const result = await lookupWord(word);
        console.log('🔍 查询结果:', result);

        if (result) {
            console.log('✅ 查询成功，开始渲染结果...');
            const htmlContent = `
                <div class="word-entry">
                    <h4>${word}</h4>
                    ${result.reading ? `<div class="word-reading">${result.reading}</div>` : ''}
                    ${result.writings ? `<div class="word-writings">书写形式: ${result.writings}</div>` : ''}
                    <div class="word-meaning">${result.meaning}</div>
                    <span class="word-type">${result.type}</span>
                    ${result.source ? `<div class="word-source">来源: ${result.source}</div>` : ''}
                    ${result.examples && result.examples.length > 0 ? `
                        <div class="word-examples">
                            <h5>例句：</h5>
                            <ul>
                                ${result.examples.map(example => `<li>${example}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;

            console.log('🔍 生成的HTML内容:', htmlContent);
            wordInfo.innerHTML = htmlContent;
            console.log('✅ 单词信息已渲染到面板');
        } else {
            console.log('⚠️ 未找到查询结果，显示未找到信息');
            wordInfo.innerHTML = `
                <div class="word-entry">
                    <h4>${word}</h4>
                    <p style="color: #666; font-style: italic;">未找到该单词的释义</p>
                    <p style="font-size: 12px; color: #999;">可以尝试：</p>
                    <ul style="font-size: 12px; color: #666;">
                        <li>检查拼写是否正确</li>
                        <li>尝试查询部分单词</li>
                        <li>检查网络连接</li>
                    </ul>
                </div>
            `;
            console.log('✅ 未找到信息已渲染到面板');
        }
    } catch (error) {
        console.error('❌ 显示单词信息失败:', error);
        wordInfo.innerHTML = `
            <div class="word-entry">
                <h4>${word}</h4>
                <p style="color: #e74c3c; font-style: italic;">查询失败，请检查网络连接</p>
                <p style="font-size: 12px; color: #999;">错误信息: ${error.message}</p>
            </div>
        `;
        console.log('✅ 错误信息已渲染到面板');
    }
}

// 查询单词
async function lookupWord(word) {
    // 本地词典查询
    const result = dictionaryData[word];
    if (result) {
        return result;
    }

    // 模糊匹配
    for (const [key, value] of Object.entries(dictionaryData)) {
        if (key.includes(word) || word.includes(key)) {
            return value;
        }
    }

    // 在线API查询
    try {
        const onlineResult = await fetchOnlineDictionary(word);
        return onlineResult;
    } catch (error) {
        console.error('❌ 词典查询失败:', error);
        return null;
    }
}

// 搜索单词
async function searchWord() {
    const input = document.getElementById('dictSearchInput');
    const word = input.value.trim();

    if (word) {
        await showWordInfo(word);
    }
}

// 复制选中文本
function copySelectedText() {
    if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(() => {
            showNotification('文本已复制到剪贴板');
        }).catch(() => {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = selectedText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('文本已复制到剪贴板');
        });
    }
}

// 切换词典功能
function toggleDictionary() {
    isDictionaryEnabled = !isDictionaryEnabled;

    // 更新菜单栏按钮状态
    const menuToggle = document.getElementById('dictToggleBtn');

    if (isDictionaryEnabled) {
        if (menuToggle) {
            menuToggle.classList.add('active');
            menuToggle.title = '词典已启用 - 点击禁用';
        }
        showNotification('词典功能已启用');
        console.log('✅ 词典功能已启用');
    } else {
        if (menuToggle) {
            menuToggle.classList.remove('active');
            menuToggle.title = '词典已禁用 - 点击启用';
        }
        showNotification('词典功能已禁用');
        console.log('⚠️ 词典功能已禁用');

        // 隐藏查询按钮（如果存在）
        hideQueryButton();
    }
}

// 显示词典面板
function showDictionary() {
    console.log('🎯 ===== showDictionary() 被调用 =====');
    console.log('🔍 dictionaryPanel 对象:', dictionaryPanel);
    console.log('🔍 dictionaryPanel 存在:', !!dictionaryPanel);
    console.log('🔍 dictionaryPanel ID:', dictionaryPanel?.id);

    // 检查面板是否在DOM中
    const panelInDOM = document.getElementById('dictionaryPanel');
    console.log('🔍 DOM中的面板:', panelInDOM);

    if (dictionaryPanel) {
        console.log('🔍 面板当前类名:', dictionaryPanel.className);
        console.log('🔍 添加 show 类到词典面板');
        dictionaryPanel.classList.add('show');

        // 检查面板是否真的显示了
        const isVisible = dictionaryPanel.classList.contains('show');
        console.log('🔍 面板是否包含 show 类:', isVisible);
        console.log('🔍 面板更新后类名:', dictionaryPanel.className);

        // 检查面板的样式
        const computedStyle = window.getComputedStyle(dictionaryPanel);
        console.log('🔍 面板的 right 样式:', computedStyle.right);
        console.log('🔍 面板的 display 样式:', computedStyle.display);
        console.log('🔍 面板的 visibility 样式:', computedStyle.visibility);
        console.log('🔍 面板的 z-index 样式:', computedStyle.zIndex);
        console.log('🔍 面板的 position 样式:', computedStyle.position);

        // 如果有选中的文本，自动查询
        if (selectedText && selectedText.trim()) {
            console.log('🔍 显示词典面板时自动查询选中文本:', selectedText);
            showWordInfo(selectedText.trim());
        } else {
            console.log('⚠️ 没有选中文本，不进行自动查询');
        }
    } else {
        console.error('❌ dictionaryPanel 不存在，无法显示面板');
        console.log('🔍 尝试重新查找面板...');
        const foundPanel = document.getElementById('dictionaryPanel');
        if (foundPanel) {
            console.log('🔍 在DOM中找到了面板，重新赋值');
            dictionaryPanel = foundPanel;
            showDictionary(); // 递归调用
        } else {
            console.error('❌ DOM中也没有找到面板');
        }
    }
}

// 隐藏词典面板
function hideDictionary() {
    if (dictionaryPanel) {
        dictionaryPanel.classList.remove('show');
    }
}

// 显示通知
function showNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 10px 20px;
        border-radius: 6px;
        z-index: 3000;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.3s;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // 显示动画
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);

    // 自动隐藏
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// 在线词典API调用
async function fetchOnlineDictionary(word) {
    try {
        console.log('🔍 查询在线词典:', word);

        // 使用提供的日语词典API
        const response = await fetch(`https://dict.3049589.xyz/api/japanese/definition?word=${encodeURIComponent(word)}`);
        const data = await response.json();

        console.log('📚 API响应:', data);

        if (data.success && data.found && data.data) {
            const entry = data.data;
            console.log('📚 处理API数据:', entry);

            // 构建读音信息
            let reading = '';
            if (entry.readings && entry.readings.length > 0) {
                reading = entry.readings[0].kana || '';
            }
            // 如果没有读音，使用headword
            if (!reading && entry.headword) {
                reading = entry.headword;
            }

            // 构建释义信息
            let meaning = '';
            let examples = [];
            let partOfSpeech = '';

            if (entry.definitions && entry.definitions.length > 0) {
                const def = entry.definitions[0];
                meaning = def.meaning || '';
                examples = def.examples || [];
                partOfSpeech = def.partOfSpeech || '';
            }

            // 构建书写形式
            let writings = '';
            if (entry.writings && entry.writings.length > 0) {
                writings = entry.writings.join('、');
            }

            const result = {
                reading: reading,
                meaning: meaning,
                type: partOfSpeech || '名词',
                examples: examples,
                writings: writings,
                source: entry.source || '在线词典'
            };

            console.log('📚 处理后的结果:', result);
            return result;
        } else {
            console.log('❌ API返回失败或未找到单词:', word, data);
            return null;
        }
    } catch (error) {
        console.error('❌ 在线词典查询失败:', error);
        return null;
    }
}

// 清空搜索
function clearSearch() {
    const input = document.getElementById('dictSearchInput');
    const wordInfo = document.getElementById('wordInfo');

    if (input) {
        input.value = '';
    }

    if (wordInfo) {
        wordInfo.innerHTML = `
            <p class="placeholder">选中文本或输入单词进行查询</p>
            <p class="placeholder" style="font-size: 12px; margin-top: 10px;">
                支持：汉字、假名、片假名等
            </p>
        `;
    }

    selectedText = '';
    showNotification('搜索已清空');
}

// 查询选中文本
function searchSelectedText() {
    console.log('🔍 searchSelectedText() 被调用');
    console.log('🔍 当前selectedText:', selectedText);
    console.log('🔍 isDictionaryEnabled:', isDictionaryEnabled);

    // 尝试从epub.js获取当前选中文本
    let currentSelectedText = '';

    if (window.rendition && window.rendition.manager) {
        try {
            const views = window.rendition.manager.views();
            for (const view of views) {
                if (view.document) {
                    const selection = (view.window || view.document.defaultView).getSelection();
                    const text = selection.toString().trim();
                    if (text) {
                        currentSelectedText = text;
                        console.log('🔍 从epub获取当前选中文本:', currentSelectedText);
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('❌ 从epub获取选中文本失败:', error);
        }
    }

    // 优先使用实时获取的文本，如果没有则使用存储的文本
    const textToSearch = currentSelectedText || selectedText;

    if (textToSearch && textToSearch.trim()) {
        console.log('🔍 查询文本:', textToSearch);
        selectedText = textToSearch; // 更新存储的文本
        showDictionary(); // 显示面板并自动查询
        return true;
    } else {
        console.warn('⚠️ 没有选中的文本');
        showNotification('请先选中要查询的文本');
        return false;
    }
}

// 测试epub.js文本选择功能
function testEpubTextSelection() {
    console.log('🧪 测试epub.js文本选择功能:');
    console.log('  - rendition存在:', !!window.rendition);
    console.log('  - manager存在:', !!(window.rendition && window.rendition.manager));
    console.log('  - 存储的selectedText:', selectedText);
    console.log('  - 词典是否启用:', isDictionaryEnabled);
    console.log('  - 词典面板是否存在:', !!dictionaryPanel);
    console.log('  - 词典面板是否显示:', dictionaryPanel?.classList.contains('show'));

    // 检查epub视图中的选中文本
    let epubText = '';
    if (window.rendition && window.rendition.manager) {
        try {
            const views = window.rendition.manager.views();
            console.log('  - epub视图数量:', views.length);

            for (let i = 0; i < views.length; i++) {
                const view = views[i];
                if (view.document) {
                    const selection = (view.window || view.document.defaultView).getSelection();
                    const text = selection.toString().trim();
                    console.log(`  - epub视图[${i}]选中文本:`, text);
                    if (text && !epubText) {
                        epubText = text;
                    }
                }
            }
        } catch (error) {
            console.error('  - epub视图检查失败:', error);
        }
    }

    if (epubText) {
        showNotification(`检测到epub选中文本: "${epubText}"`);
    } else {
        showNotification('未检测到epub选中文本');
    }

    return {
        epubSelection: epubText,
        storedSelection: selectedText,
        enabled: isDictionaryEnabled,
        panelExists: !!dictionaryPanel,
        panelVisible: dictionaryPanel?.classList.contains('show'),
        renditionExists: !!(window.rendition && window.rendition.manager)
    };
}

// 手动绑定rendition（供外部调用）
function bindRenditionManually() {
    console.log('🔍 手动绑定rendition被调用');
    if (window.rendition) {
        console.log('🔍 rendition存在，开始绑定epub选择事件');
        return bindEpubSelectionEvents();
    } else {
        console.warn('⚠️ rendition不存在，无法绑定');
        return false;
    }
}



// 强制重新绑定（调试用）
function forceRebind() {
    console.log('🔍 强制重新绑定...');
    console.log('🔍 window.rendition:', window.rendition);
    console.log('🔍 window.book:', window.book);

    if (window.rendition) {
        bindIframeSelectionListeners();
        return true;
    } else {
        console.warn('⚠️ rendition不存在，尝试重新初始化epub');
        if (window.initReader) {
            window.initReader();
        }
        return false;
    }
}

// 显示查询按钮
function showQueryButton(selection, contents) {
    // 移除已存在的查询按钮
    hideQueryButton();

    try {
        // 创建查询按钮（固定居中显示）
        const queryBtn = document.createElement('button');
        queryBtn.id = 'textQueryBtn';
        queryBtn.innerHTML = '🔍 查询选中文本';
        queryBtn.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            font-size: 14px;
            cursor: pointer;
            z-index: 3000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.2s;
            font-weight: 500;
        `;

        // 点击查询
        queryBtn.onclick = async function (event) {
            console.log('🎯 ===== 查询按钮点击事件触发 =====');
            console.log('🔍 查询文本:', selectedText);

            // 隐藏查询按钮
            hideQueryButton();

            // 显示加载提示
            showLoadingIndicator();

            try {
                // 先查询API
                console.log('🔍 开始查询API...');
                const result = await lookupWord(selectedText);
                console.log('🔍 API查询结果:', result);

                // 根据结果创建并显示面板
                if (result) {
                    showDictionaryWithResult(selectedText, result);
                } else {
                    showDictionaryWithError(selectedText, '未找到该单词的释义');
                }
            } catch (error) {
                console.error('❌ 查询失败:', error);
                showDictionaryWithError(selectedText, '查询失败，请检查网络连接');
            } finally {
                hideLoadingIndicator();
            }
        };

        // 鼠标悬停效果
        queryBtn.onmouseenter = function () {
            this.style.background = '#5a6fd8';
            this.style.transform = 'translateX(-50%) scale(1.05)';
        };

        queryBtn.onmouseleave = function () {
            this.style.background = '#667eea';
            this.style.transform = 'translateX(-50%) scale(1)';
        };

        document.body.appendChild(queryBtn);

        // 3秒后自动隐藏
        setTimeout(hideQueryButton, 3000);

    } catch (error) {
        console.error('❌ 显示查询按钮失败:', error);
    }
}

// 隐藏查询按钮
function hideQueryButton() {
    const existingBtn = document.getElementById('textQueryBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
}

// 显示加载提示
function showLoadingIndicator() {
    // 移除已存在的加载提示
    hideLoadingIndicator();

    const loading = document.createElement('div');
    loading.id = 'dictLoadingIndicator';
    loading.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px 30px;
        border-radius: 8px;
        z-index: 3000;
        font-size: 16px;
        text-align: center;
    `;
    loading.innerHTML = '🔍 正在查询词典...';

    document.body.appendChild(loading);
}

// 隐藏加载提示
function hideLoadingIndicator() {
    const loading = document.getElementById('dictLoadingIndicator');
    if (loading) {
        loading.remove();
    }
}

// 显示带结果的词典面板
function showDictionaryWithResult(word, result) {
    console.log('🎯 ===== 显示带结果的词典面板 =====');
    console.log('🔍 单词:', word);
    console.log('🔍 结果:', result);

    // 创建词典面板HTML
    const panelHTML = `
        <div class="dictionary-header">
            <h3>📚 日语词典查询</h3>
            <button class="close-dict-btn" onclick="hideDictionaryModal()">×</button>
        </div>
        <div class="dictionary-content">
            <div class="word-entry">
                <h4>${word}</h4>
                ${result.reading ? `<div class="word-reading">${result.reading}</div>` : ''}
                ${result.writings ? `<div class="word-writings">书写形式: ${result.writings}</div>` : ''}
                <div class="word-meaning">${result.meaning}</div>
                <span class="word-type">${result.type}</span>
                ${result.source ? `<div class="word-source">来源: ${result.source}</div>` : ''}
                ${result.examples && result.examples.length > 0 ? `
                    <div class="word-examples">
                        <h5>例句：</h5>
                        <ul>
                            ${result.examples.map(example => `<li>${example}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    showDictionaryModal(panelHTML);
}

// 显示带错误的词典面板
function showDictionaryWithError(word, errorMessage) {
    console.log('🎯 ===== 显示带错误的词典面板 =====');
    console.log('🔍 单词:', word);
    console.log('🔍 错误信息:', errorMessage);

    const panelHTML = `
        <div class="dictionary-header">
            <h3>📚 日语词典查询</h3>
            <button class="close-dict-btn" onclick="hideDictionaryModal()">×</button>
        </div>
        <div class="dictionary-content">
            <div class="word-entry">
                <h4>${word}</h4>
                <p style="color: #666; font-style: italic;">${errorMessage}</p>
                <p style="font-size: 12px; color: #999;">可以尝试：</p>
                <ul style="font-size: 12px; color: #666;">
                    <li>检查拼写是否正确</li>
                    <li>尝试查询部分单词</li>
                    <li>检查网络连接</li>
                </ul>
            </div>
        </div>
    `;

    showDictionaryModal(panelHTML);
}

// 显示词典模态窗口
function showDictionaryModal(content) {
    // 移除已存在的模态窗口
    hideDictionaryModal();

    const modal = document.createElement('div');
    modal.id = 'dictionaryModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2500;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    const panel = document.createElement('div');
    panel.className = 'dictionary-panel show';
    panel.innerHTML = content;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    // 点击背景关闭
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            hideDictionaryModal();
        }
    });

    console.log('✅ 词典模态窗口已显示');
}

// 隐藏词典模态窗口
function hideDictionaryModal() {
    const modal = document.getElementById('dictionaryModal');
    if (modal) {
        modal.remove();
        console.log('✅ 词典模态窗口已隐藏');
    }
}

// 导出函数供外部使用
window.Dictionary = {
    init: initDictionary,
    show: showDictionary,
    hide: hideDictionary,
    toggle: toggleDictionary,
    search: searchWord,
    searchSelected: searchSelectedText,
    copy: copySelectedText,
    clear: clearSearch,
    test: testEpubTextSelection,
    bindRendition: bindRenditionManually,
    forceRebind: forceRebind
};

// 自动初始化
document.addEventListener('DOMContentLoaded', function () {
    // 延迟初始化，确保epub.js已加载
    setTimeout(initDictionary, 1000);
}); 