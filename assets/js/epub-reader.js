/**
 * EPUB Reader JavaScript
 * 完整的EPUB阅读器业务逻辑
 */

console.log('🚀 EPUB Reader JavaScript 文件已加载！');

// 库加载测试
function testLibraries() {
    console.log('库加载测试:');
    console.log('typeof JSZip:', typeof JSZip);
    console.log('typeof ePub:', typeof ePub);

    if (typeof JSZip === 'undefined') {
        console.error('❌ JSZip 未能正确加载！');
    } else {
        console.log('✅ JSZip 加载成功！');
    }

    if (typeof ePub === 'undefined') {
        console.error('❌ epub.js 未能正确加载！');
        // 在页面上也显示错误
        document.addEventListener('DOMContentLoaded', function () {
            const loading = document.getElementById('loading');
            if (loading) {
                loading.innerHTML = '<div class="error"><h3>epub.js 加载失败</h3><p>请检查网络连接或刷新页面重试</p></div>';
            }
        });
    } else {
        console.log('✅ epub.js 加载成功！');
    }

    // 测试基本 JavaScript 功能
    console.log('JavaScript 执行测试 - 时间:', new Date().toLocaleString());
}

// 全局变量
let book;
let rendition;
let currentLocation;
let importedUrl = null;
let currentPage = 0;  // 当前页面索引
let totalPages = 0;   // 总页数
let pageHeight = 0;   // 页面高度

// 根据语言获取字体设置
function getFontFamilyByLanguage(language) {
    debugLog('检测到的语言:', language);

    if (!language) {
        debugLog('未检测到语言，使用系统默认字体');
        return null; // 不设置字体，使用系统默认
    }

    // 标准化语言代码
    const lang = language.toLowerCase();

    if (lang === 'ja' || lang === 'jp' || lang === 'japanese' || lang.startsWith('ja-')) {
        debugLog('检测到日文，使用明朝体');
        return 'IPAexMincho, Hiragino Mincho ProN, Yu Mincho, MS Mincho, serif';
    } else if (lang === 'zh' || lang === 'zh-cn' || lang === 'zh-tw' || lang === 'chinese' || lang.startsWith('zh-')) {
        debugLog('检测到中文，使用中文字体');
        return 'SimSun, "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif';
    } else if (lang === 'ko' || lang === 'korean' || lang.startsWith('ko-')) {
        debugLog('检测到韩文，使用韩文字体');
        return 'Batang, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    } else {
        debugLog('检测到其他语言，使用系统默认字体');
        return null; // 不设置字体，使用系统默认
    }
}

// 应用基于语言的字体设置
function applyLanguageBasedFont(language) {
    const fontFamily = getFontFamilyByLanguage(language);

    if (!fontFamily) {
        debugLog('不设置字体，使用系统默认渲染');
        // 清除之前可能设置的字体覆盖
        rendition.themes.override({
            'body': { 'font-family': '' },
            '*': { 'font-family': '' }
        });
        return;
    }

    debugLog('应用字体:', fontFamily);

    // 设置默认主题
    rendition.themes.default({
        'body': {
            'font-family': fontFamily + ' !important',
            'line-height': '1.8',
            'letter-spacing': '0.05em',
            'font-size': '16px'
        }
    });

    // 简化字体设置，不再处理竖排样式（已在渲染前处理）
    const overrideStyles = {
        'body': {
            'font-family': fontFamily + ' !important'
        },
        '*': {
            'font-family': fontFamily + ' !important'
        },
        '.calibre': {
            'font-family': fontFamily + ' !important'
        },
        'p': {
            'font-family': fontFamily + ' !important'
        },
        'div': {
            'font-family': fontFamily + ' !important'
        }
    };

    rendition.themes.override(overrideStyles);

    // 调试：打印应用的样式
    console.log('📖 应用的样式:', overrideStyles);
}

// 强制禁用缓存 - 版本 2.0
console.log('🔄 强制禁用缓存 v2.0，当前时间戳:', Date.now());

// 添加调试日志
function debugLog(message, data = null) {
    console.log(`[EPUB Reader] ${message}`, data || '');
    // 在页面上也显示调试信息
    const loading = document.getElementById('loading');
    if (loading && loading.style.display !== 'none') {
        loading.innerHTML = `<p>正在加载电子书...</p><p style="font-size: 12px; color: #666;">${message}</p>`;
    }
}

// 初始化阅读器，支持本地文件
async function initReader(file = null) {
    try {
        debugLog('开始初始化阅读器...');

        // 检查 epub.js 是否加载成功
        if (typeof ePub === 'undefined') {
            throw new Error('epub.js 库未能加载，请检查网络连接');
        }
        debugLog('epub.js 库加载成功');

        // 释放之前的对象 URL
        if (importedUrl) {
            URL.revokeObjectURL(importedUrl);
            importedUrl = null;
        }

        // 加载 EPUB 文件
        debugLog('正在加载 EPUB 文件...');
        if (file && file instanceof File) {
            try {
                debugLog('使用本地文件:', file.name, file.size, file.type);
                importedUrl = URL.createObjectURL(file);
                debugLog('创建的文件 URL:', importedUrl);
                book = ePub(importedUrl);
                debugLog('epub.js 创建 book 对象成功');
            } catch (error) {
                throw new Error(`创建文件 URL 失败: ${error.message}`);
            }
        } else {
            debugLog('使用默认文件: ./noruwei.epub');
            try {
                book = ePub('./noruwei.epub');
                debugLog('epub.js 创建 book 对象成功');
            } catch (error) {
                debugLog('epub.js 创建 book 对象失败:', error.message);
                throw new Error(`epub.js 无法创建 book 对象: ${error.message}`);
            }
        }

        // 等待书籍加载完成
        debugLog('等待书籍元数据加载...');
        debugLog('书籍对象:', book);
        debugLog('书籍 ready 属性:', book.ready);

        // 尝试直接创建渲染器，不等待 book.ready
        try {
            debugLog('跳过 book.ready，直接创建渲染器...');

            // 创建渲染器
            debugLog('创建渲染器...');
            rendition = book.renderTo('viewer', {
                width: '100%',
                height: '100%',
                spread: 'none',
                allowScriptedContent: true,
                flow: 'paginated',  // 使用分页模式，自动处理行截断
                manager: 'default'  // 使用默认管理器
            });

            // 显示第一章
            debugLog('显示第一章...');
            await rendition.display();

            // 应用保存的字体大小设置
            applyInitialFontSize();

            // 尝试获取语言信息并设置相应字体
            debugLog('获取EPUB语言信息...');
            try {
                // 等待metadata加载完成
                await book.ready;
                const metadata = book.package.metadata;
                const language = metadata.language;

                debugLog('EPUB元数据:', metadata);
                debugLog('检测到的语言:', language);

                // 显示详细的元数据信息
                showEpubMetadata();

                // 根据语言设置字体
                applyLanguageBasedFont(language);

            } catch (metadataError) {
                debugLog('获取语言信息失败，使用默认设置:', metadataError.message);
                // 如果无法获取语言信息，不设置特定字体，使用系统默认
                debugLog('使用系统默认字体渲染');
            }
            debugLog('第一章显示成功');

            // 将rendition设置为全局变量，供词典功能使用
            window.rendition = rendition;
            console.log('� rendition已设置为全n局变量');

            // 通知词典功能rendition已创建
            if (window.Dictionary && window.Dictionary.bindRendition) {
                console.log('🔍 通知词典功能绑定rendition');
                window.Dictionary.bindRendition();
            }

            // 分页模式下不需要手动计算页面信息
            // epub.js 会自动处理分页和行截断问题

            // 隐藏加载提示
            document.getElementById('loading').style.display = 'none';

            // 尝试加载目录
            debugLog('尝试加载目录...');
            try {
                await loadTOC();
            } catch (tocError) {
                debugLog('目录加载失败，继续:', tocError.message);
            }

            // 设置事件监听器
            debugLog('设置事件监听器...');
            setupEventListeners();

            // 尝试生成位置信息
            debugLog('尝试生成位置信息...');
            try {
                await book.locations.generate(1024);
            } catch (locationError) {
                debugLog('位置信息生成失败，继续:', locationError.message);
            }

            // 更新进度
            updateProgress();

            debugLog('阅读器初始化完成！');

        } catch (renderError) {
            debugLog('直接渲染失败，尝试等待 book.ready:', renderError.message);

            // 如果直接渲染失败，再尝试等待 book.ready
            const readyPromise = book.ready;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('加载超时，请检查文件格式或尝试其他电子书')), 10000);
            });

            await Promise.race([readyPromise, timeoutPromise]);
            debugLog('书籍元数据加载完成');

            // 重新创建渲染器
            rendition = book.renderTo('viewer', {
                width: '100%',
                height: '100%',
                spread: 'none',
                allowScriptedContent: true,
                flow: 'paginated',  // 使用分页模式，自动处理行截断
                manager: 'default'  // 使用默认管理器
            });

            await rendition.display();

            // 应用保存的字体大小设置
            applyInitialFontSize();

            document.getElementById('loading').style.display = 'none';

            // 将rendition设置为全局变量，供词典功能使用
            window.rendition = rendition;
            console.log('🔍 rendition已设置为全局变量');

            // 通知词典功能rendition已创建
            if (window.Dictionary && window.Dictionary.bindRendition) {
                console.log('🔍 通知词典功能绑定rendition');
                window.Dictionary.bindRendition();
            }

            await loadTOC();
            setupEventListeners();
            await book.locations.generate(1024);
            updateProgress();
        }

    } catch (error) {
        console.error('加载 EPUB 文件失败:', error);
        debugLog(`错误: ${error.message}`);
        showError(`无法加载电子书文件: ${error.message}`);
    }
}

// 加载目录
async function loadTOC() {
    try {
        const navigation = await book.loaded.navigation;
        const tocContainer = document.getElementById('toc');

        navigation.toc.forEach((chapter, index) => {
            const tocItem = document.createElement('div');
            tocItem.className = 'toc-item';
            tocItem.textContent = chapter.label;
            tocItem.onclick = () => goToChapter(chapter.href);
            tocContainer.appendChild(tocItem);
        });
    } catch (error) {
        console.error('加载目录失败:', error);
    }
}

// 调试函数：显示EPUB元数据信息
function showEpubMetadata() {
    if (book && book.package && book.package.metadata) {
        const metadata = book.package.metadata;
        console.log('📚 EPUB元数据信息:');
        console.log('  标题:', metadata.title);
        console.log('  作者:', metadata.creator);
        console.log('  语言:', metadata.language);
        console.log('  出版商:', metadata.publisher);
        console.log('  标识符:', metadata.identifier);
        console.log('  完整元数据:', metadata);

        // 在页面上也显示语言信息
        const loading = document.getElementById('loading');
        if (loading && loading.style.display !== 'none') {
            loading.innerHTML = `
                <p>正在加载电子书...</p>
                <p style="font-size: 12px; color: #666;">
                    检测到语言: ${metadata.language || '未知'}<br>
                    应用字体: ${getFontFamilyByLanguage(metadata.language) || '系统默认'}
                </p>
            `;
        }
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 位置变化监听
    rendition.on('relocated', (location) => {
        currentLocation = location;
        updateProgress();
        updateButtons();
    });

    // 添加更多事件监听
    rendition.on('rendered', (section) => {
        console.log('页面渲染完成:', section);

        // 每次页面渲染完成后，重新应用基于语言的字体设置
        setTimeout(() => {
            if (book && book.package && book.package.metadata) {
                const language = book.package.metadata.language;
                applyLanguageBasedFont(language);

                // 样式检查已移除，现在使用硬编码模式
            }
        }, 100); // 延迟100ms确保DOM完全渲染
    });

    rendition.on('layout', (layout) => {
        console.log('布局变化:', layout);
    });

    // text-orientation修复已在渲染前处理，不需要在这里调用
}

// 检测当前是否为竖排模式
function isVerticalMode() {
    const viewer = document.getElementById('viewer');
    return viewer && viewer.classList.contains('vertical-rl');
}

// 智能上一页（竖排模式下从右到左）
function prevPage() {
    if (rendition) {
        const isVertical = isVerticalMode();
        console.log('执行上一页 (竖排模式:', isVertical, ')');
        try {
            if (isVertical) {
                // 竖排模式：上一页应该向右翻（使用next）
                rendition.next();
            } else {
                // 横排模式：正常向左翻
                rendition.prev();
            }
        } catch (error) {
            console.error('上一页失败:', error);
        }
    } else {
        console.warn('rendition 未初始化');
    }
}

// 智能下一页（竖排模式下从右到左）
function nextPage() {
    if (rendition) {
        const isVertical = isVerticalMode();
        console.log('执行下一页 (竖排模式:', isVertical, ')');
        try {
            if (isVertical) {
                // 竖排模式：下一页应该向左翻（使用prev）
                rendition.prev();
            } else {
                // 横排模式：正常向右翻
                rendition.next();
            }
        } catch (error) {
            console.error('下一页失败:', error);
        }
    } else {
        console.warn('rendition 未初始化');
    }
}

// 更新页面信息
function updatePageInfo() {
    // 分页模式下，进度信息由 updateProgress() 函数处理
    // 这里可以添加其他页面相关的更新逻辑
    console.log('页面信息已更新');
}

// 跳转到章节
function goToChapter(href) {
    if (rendition) {
        rendition.display(href);
    }
}

// 更新进度
function updateProgress() {
    if (currentLocation) {
        const progress = book.locations.percentageFromCfi(currentLocation.start.cfi);
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        progressBar.style.width = (progress * 100) + '%';
        progressText.textContent = Math.round(progress * 100) + '%';
    }
}

// 更新按钮状态
function updateButtons() {
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

    if (currentLocation) {
        // 更新左右翻页控件
        if (prevPageBtn) {
            prevPageBtn.disabled = currentLocation.atStart;
            prevPageBtn.style.opacity = currentLocation.atStart ? '0.5' : '1';
        }
        if (nextPageBtn) {
            nextPageBtn.disabled = currentLocation.atEnd;
            nextPageBtn.style.opacity = currentLocation.atEnd ? '0.5' : '1';
        }
    }
}

// 切换侧边栏
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('show');
    // 打开侧边栏时自动隐藏底部菜单
    hideBottomMenu();
}

// 切换设置面板
function toggleSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    settingsPanel.classList.toggle('show');
    // 打开设置面板时自动隐藏底部菜单
    hideBottomMenu();
}

// 显示/隐藏底部菜单
function showBottomMenu() {
    console.log('🔍 showBottomMenu() 被调用');
    const bottomMenu = document.getElementById('bottomMenu');
    console.log('🔍 bottomMenu 元素:', bottomMenu);
    bottomMenu.classList.add('show');
    console.log('🔍 菜单已显示，当前classList:', bottomMenu.classList.toString());

    // 添加全局点击监听器，点击空白区域隐藏菜单
    setTimeout(() => {
        document.addEventListener('click', handleGlobalClick);
        // 同时监听epub内容区域的点击
        bindEpubClickListener();
    }, 0);
}

function hideBottomMenu() {
    console.log('🔍 hideBottomMenu() 被调用');
    const bottomMenu = document.getElementById('bottomMenu');
    bottomMenu.classList.remove('show');
    console.log('🔍 菜单已隐藏，当前classList:', bottomMenu.classList.toString());

    // 移除全局点击监听器
    document.removeEventListener('click', handleGlobalClick);
    // 移除epub点击监听器
    unbindEpubClickListener();
}

// 处理全局点击事件
function handleGlobalClick(e) {
    const bottomMenu = document.getElementById('bottomMenu');

    // 如果菜单不存在或已隐藏，移除监听器
    if (!bottomMenu || !bottomMenu.classList.contains('show')) {
        document.removeEventListener('click', handleGlobalClick);
        return;
    }

    // 检查点击目标是否在菜单内
    if (!bottomMenu.contains(e.target)) {
        console.log('🔍 点击主文档空白区域，隐藏菜单');
        hideBottomMenu();
    } else {
        console.log('🔍 点击菜单内部，保持显示');
    }
}

// epub点击事件处理器
let epubClickHandler = null;

// 绑定epub内容区域的点击监听器
function bindEpubClickListener() {
    if (!window.rendition) {
        console.warn('⚠️ rendition未初始化，无法绑定epub点击监听器');
        return;
    }

    try {
        console.log('🔍 使用epub.js官方API绑定点击事件');

        // 使用epub.js的官方API监听链接点击事件
        window.rendition.on('linkClicked', function (href) {
            console.log('🔍 epub链接被点击:', href);
            hideBottomMenu();
        });

        // 监听文本选择事件（用户点击文本时也会触发）
        window.rendition.on('selected', function (cfiRange, contents) {
            console.log('🔍 epub文本被选择/点击');
            hideBottomMenu();
        });

        // 尝试监听更通用的内容点击事件
        // 通过监听contents的点击事件
        window.rendition.on('rendered', function (section, view) {
            if (view.contents) {
                console.log('🔍 为新渲染的内容绑定点击监听器');
                view.contents.document.addEventListener('click', function (event) {
                    console.log('🔍 epub内容被点击，隐藏菜单');
                    hideBottomMenu();
                }, true); // 使用捕获阶段，避免被epub.js拦截
            }
        });

        // 为已存在的视图绑定点击事件
        if (window.rendition.manager) {
            const views = window.rendition.manager.views();
            views.forEach((view, index) => {
                if (view.contents) {
                    console.log(`🔍 为现有视图${index}绑定点击监听器`);
                    view.contents.document.addEventListener('click', function (event) {
                        console.log('🔍 epub内容被点击，隐藏菜单');
                        hideBottomMenu();
                    }, true); // 使用捕获阶段
                }
            });
        }

    } catch (error) {
        console.error('❌ 绑定epub点击监听器失败:', error);
    }
}

// 解绑epub内容区域的点击监听器
function unbindEpubClickListener() {
    if (!window.rendition) {
        return;
    }

    try {
        console.log('🔍 解绑epub点击监听器');

        // 移除epub.js官方事件监听器
        window.rendition.off('linkClicked');
        window.rendition.off('selected');
        window.rendition.off('rendered');

        // 注意：由于addEventListener是在rendered事件中动态添加的，
        // 这里无法直接移除，但当菜单隐藏后，点击处理器会检查菜单状态

        epubClickHandler = null;

    } catch (error) {
        console.error('❌ 解绑epub点击监听器失败:', error);
    }
}

// 切换底部菜单显示状态
function toggleBottomMenu() {
    console.log('🔍 toggleBottomMenu() 被调用');
    const bottomMenu = document.getElementById('bottomMenu');
    console.log('🔍 当前菜单状态 - 是否显示:', bottomMenu.classList.contains('show'));
    if (bottomMenu.classList.contains('show')) {
        console.log('🔍 菜单当前显示，准备隐藏');
        hideBottomMenu();
    } else {
        console.log('🔍 菜单当前隐藏，准备显示');
        showBottomMenu();
    }
}

// 全局变量来跟踪当前字体大小
let currentFontSize = 16;

// 改变字体大小
function changeFontSize(delta) {
    if (!rendition) {
        console.warn('rendition 未初始化，无法调整字体大小');
        return;
    }

    try {
        console.log('调整前字体大小:', currentFontSize, '调整量:', delta);

        // 计算新的字体大小，限制在合理范围内
        const newSize = Math.max(10, Math.min(32, currentFontSize + delta));

        if (newSize === currentFontSize) {
            console.log('字体大小已达到限制，无法继续调整');
            return;
        }

        console.log('新字体大小:', newSize);

        // 更新全局变量
        currentFontSize = newSize;

        // 使用 epub.js 的主题系统设置字体大小
        rendition.themes.override({
            'body': {
                'font-size': newSize + 'px !important'
            },
            '*': {
                'font-size': newSize + 'px !important'
            },
            'p': {
                'font-size': newSize + 'px !important'
            },
            'div': {
                'font-size': newSize + 'px !important'
            }
        });

        // 也尝试使用 fontSize 方法
        rendition.themes.fontSize(newSize + 'px');

        console.log('字体大小已调整为:', newSize + 'px');

        // 保存到本地存储
        localStorage.setItem('epubReaderFontSize', newSize.toString());

    } catch (error) {
        console.error('调整字体大小失败:', error);
    }
}

// 初始化字体大小（从本地存储加载）
function initializeFontSize() {
    try {
        const savedSize = localStorage.getItem('epubReaderFontSize');
        if (savedSize) {
            currentFontSize = parseInt(savedSize);
            console.log('从本地存储加载字体大小:', currentFontSize);
        }
    } catch (error) {
        console.error('加载字体大小设置失败:', error);
    }
}

// 应用初始字体大小
function applyInitialFontSize() {
    if (rendition && currentFontSize !== 16) {
        console.log('应用初始字体大小:', currentFontSize);
        rendition.themes.override({
            'body': {
                'font-size': currentFontSize + 'px !important'
            },
            '*': {
                'font-size': currentFontSize + 'px !important'
            }
        });
        rendition.themes.fontSize(currentFontSize + 'px');
    }
}

// 显示错误信息
function showError(message) {
    const loading = document.getElementById('loading');
    const currentUrl = window.location.href;
    const isFileProtocol = currentUrl.startsWith('file://');

    loading.innerHTML = `
        <div class="error">
            <h3>加载失败</h3>
            <p><strong>错误信息:</strong> ${message}</p>
            <p><strong>当前地址:</strong> ${currentUrl}</p>
            ${isFileProtocol ? '<p style="color: red;"><strong>⚠️ 检测到 file:// 协议，这是问题所在！</strong></p>' : ''}

            <h4>解决方案:</h4>
            <ol style="text-align: left; display: inline-block;">
                ${isFileProtocol ?
            '<li style="color: red; font-weight: bold;">请使用 HTTP 服务器访问，运行: <code>python3 start-server.py</code></li>' :
            '<li>✅ 正在通过 HTTP 服务器访问</li>'
        }
                <li>确保 noruwei.epub 文件在同一目录下</li>
                <li>检查浏览器控制台是否有更多错误信息</li>
                <li>尝试刷新页面</li>
            </ol>

            <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                重新加载
            </button>

            <details style="margin-top: 1rem; text-align: left;">
                <summary>调试信息</summary>
                <p><strong>User Agent:</strong> ${navigator.userAgent}</p>
                <p><strong>epub.js 状态:</strong> ${typeof ePub !== 'undefined' ? '✅ 已加载' : '❌ 未加载'}</p>
                <p><strong>当前时间:</strong> ${new Date().toLocaleString()}</p>
            </details>
        </div>
    `;
}

// DOM 加载完成后的初始化
function initializeApp() {
    // 测试库加载
    testLibraries();

    // 初始化字体大小设置
    initializeFontSize();

    // 初始化词典功能
    if (window.Dictionary) {
        console.log('🔍 初始化词典功能...');
        window.Dictionary.init();
    } else {
        console.warn('⚠️ 词典功能未加载');
    }

    // 监听文件导入
    const importInput = document.getElementById('importEpub');
    if (importInput) {
        importInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                // 检查文件类型
                if (!(file instanceof File)) {
                    showError('请选择本地的 EPUB 文件（File 类型）');
                    return;
                }

                // 检查文件扩展名
                if (!file.name.toLowerCase().endsWith('.epub')) {
                    showError('请选择 EPUB 格式的文件（.epub 扩展名）');
                    return;
                }

                document.getElementById('loading').style.display = '';
                document.getElementById('loading').innerHTML = '<p>正在加载电子书...</p>';
                initReader(file);
            }
        });
    }

    // 字体切换功能
    const fontSelect = document.getElementById('fontSelect');
    if (fontSelect) {
        fontSelect.addEventListener('change', function () {
            const selectedFont = fontSelect.value;

            if (selectedFont === 'auto') {
                // 自动模式：根据语言选择字体
                if (book && book.package && book.package.metadata) {
                    const language = book.package.metadata.language;
                    applyLanguageBasedFont(language);
                }
            } else {
                // 手动模式：使用用户选择的字体
                const viewer = document.getElementById('viewer');
                if (viewer) {
                    viewer.style.fontFamily = selectedFont;
                }
                // epub.js 内部内容也同步切换
                if (rendition) {
                    rendition.themes.override({
                        'body': { 'font-family': selectedFont + ' !important' },
                        '*': { 'font-family': selectedFont + ' !important' }
                    });
                }
            }
        });
    }

    // 页边距控制功能
    setupMarginControls();

    // 加载保存的页边距设置
    loadMarginSettings();

    // 侧边栏控制
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', toggleSidebar);
    }

    // 菜单触发区域
    const menuTrigger = document.getElementById('menuTrigger');
    console.log('🔍 menuTrigger 元素:', menuTrigger);
    if (menuTrigger) {
        console.log('🔍 为 menuTrigger 添加点击事件监听器');
        menuTrigger.addEventListener('click', function (e) {
            console.log('🔍 menuTrigger 被点击了！');
            e.stopPropagation(); // 阻止事件冒泡

            // 只在菜单隐藏时显示
            const bottomMenu = document.getElementById('bottomMenu');
            if (!bottomMenu.classList.contains('show')) {
                console.log('🔍 显示菜单');
                showBottomMenu();
            }
        });
    } else {
        console.error('❌ 找不到 menuTrigger 元素！');
    }

    // 阅读器区域点击事件
    const viewer = document.getElementById('viewer');
    if (viewer) {
        viewer.addEventListener('click', function (e) {
            // 检查是否点击了翻页控件
            const target = e.target;
            if (target.closest('.page-control')) {
                // 点击了翻页控件，不处理（控件有自己的事件）
                return;
            }

            // 点击中央区域显示菜单（只在菜单隐藏时显示）
            const bottomMenu = document.getElementById('bottomMenu');
            if (!bottomMenu.classList.contains('show')) {
                console.log('🔍 点击阅读区域，显示菜单');
                showBottomMenu();
            }
        });
    }

    // 绑定左右翻页控件事件
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

    if (prevPageBtn) {
        console.log('🔍 绑定上一页按钮事件');
        prevPageBtn.addEventListener('click', function (e) {
            console.log('🔍 上一页按钮被点击');
            e.stopPropagation(); // 阻止事件冒泡
            prevPage();
        });
    }

    if (nextPageBtn) {
        console.log('🔍 绑定下一页按钮事件');
        nextPageBtn.addEventListener('click', function (e) {
            console.log('🔍 下一页按钮被点击');
            e.stopPropagation(); // 阻止事件冒泡
            nextPage();
        });
    }

    // 键盘快捷键（包括基本的左右翻页）
    document.addEventListener('keydown', function (e) {
        switch (e.key) {
            case 'ArrowLeft':
                // 左箭头键：上一页（最基本功能，优先级最高）
                e.preventDefault();
                prevPage();
                break;
            case 'ArrowRight':
                // 右箭头键：下一页（最基本功能，优先级最高）
                e.preventDefault();
                nextPage();
                break;
            case 'Escape':
                // ESC键关闭所有面板
                document.getElementById('sidebar').classList.remove('show');
                document.getElementById('settingsPanel').classList.remove('show');
                document.getElementById('bottomMenu').classList.remove('show');
                if (window.Dictionary) {
                    window.Dictionary.hide();
                }
                break;
            case 'm':
            case 'M':
                // M键切换菜单
                toggleBottomMenu();
                break;
            case 't':
            case 'T':
                // T键切换目录
                toggleSidebar();
                break;
            case 'd':
            case 'D':
                // D键切换词典
                if (window.Dictionary) {
                    window.Dictionary.toggle();
                }
                break;
        }
    });
}

// 设置页边距控制
function setupMarginControls() {
    const marginControls = [
        { id: 'topMargin', property: 'padding-top', unit: 'px' },
        { id: 'bottomMargin', property: 'padding-bottom', unit: 'px' },
        { id: 'leftMargin', property: 'padding-left', unit: 'px' },
        { id: 'rightMargin', property: 'padding-right', unit: 'px' },
        { id: 'lineHeight', property: 'line-height', unit: '' }
    ];

    marginControls.forEach(control => {
        const slider = document.getElementById(control.id);
        const valueDisplay = document.getElementById(control.id + 'Value');

        if (slider && valueDisplay) {
            // 初始化显示值
            updateValueDisplay(slider, valueDisplay, control.unit);

            // 监听滑块变化
            slider.addEventListener('input', function () {
                updateValueDisplay(slider, valueDisplay, control.unit);
                applyMarginStyle(control.property, slider.value, control.unit);
            });
        }
    });
}

// 更新值显示
function updateValueDisplay(slider, display, unit) {
    display.textContent = slider.value + unit;
}

// 应用页边距样式
function applyMarginStyle(property, value, unit) {
    if (rendition) {
        const styles = {};
        styles[property] = value + unit;

        // 应用到epub.js的主题系统
        rendition.themes.override(styles);

        console.log(`应用样式: ${property} = ${value}${unit}`);
    }
}

// 重置页边距为默认值
function resetMargins() {
    const defaultValues = {
        topMargin: 20,
        bottomMargin: 30,
        leftMargin: 30,
        rightMargin: 30,
        lineHeight: 1.8
    };

    Object.keys(defaultValues).forEach(id => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(id + 'Value');

        if (slider && valueDisplay) {
            slider.value = defaultValues[id];
            const unit = id === 'lineHeight' ? '' : 'px';
            updateValueDisplay(slider, valueDisplay, unit);
        }
    });

    // 重新应用默认样式
    if (rendition) {
        rendition.themes.override({
            'padding-top': '20px',
            'padding-bottom': '30px',
            'padding-left': '30px',
            'padding-right': '30px',
            'line-height': '1.8'
        });
    }
}

// 保存页边距设置到本地存储
function saveMarginSettings() {
    const settings = {
        topMargin: document.getElementById('topMargin')?.value || 20,
        bottomMargin: document.getElementById('bottomMargin')?.value || 30,
        leftMargin: document.getElementById('leftMargin')?.value || 30,
        rightMargin: document.getElementById('rightMargin')?.value || 30,
        lineHeight: document.getElementById('lineHeight')?.value || 1.8
    };

    localStorage.setItem('epubReaderMargins', JSON.stringify(settings));
    console.log('页边距设置已保存');
}

// 从本地存储加载页边距设置
function loadMarginSettings() {
    try {
        const saved = localStorage.getItem('epubReaderMargins');
        if (saved) {
            const settings = JSON.parse(saved);

            Object.keys(settings).forEach(id => {
                const slider = document.getElementById(id);
                if (slider) {
                    slider.value = settings[id];
                    const valueDisplay = document.getElementById(id + 'Value');
                    const unit = id === 'lineHeight' ? '' : 'px';
                    if (valueDisplay) {
                        updateValueDisplay(slider, valueDisplay, unit);
                    }
                }
            });

            console.log('页边距设置已加载');
        }
    } catch (error) {
        console.error('加载页边距设置失败:', error);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeApp);

// 页面加载完成后的处理
window.addEventListener('load', async function () {
    console.log('🔍 阅读器页面加载完成');

    // 延迟一点时间，确保DOM完全加载
    setTimeout(async () => {
        // 检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = urlParams.get('bookId');

        if (bookId) {
            console.log('🔍 从书架传来的bookId:', bookId);
            try {
                await loadBookFromAPI(bookId);
            } catch (error) {
                console.error('❌ 加载书籍失败:', error);
                showError(`加载书籍失败: ${error.message}`);
            }
        } else if (!book && !rendition) {
            console.log('🔍 没有参数，尝试加载默认EPUB文件');
            initReader();
        } else {
            console.log('🔍 已有文件加载，跳过默认文件加载');
        }
    }, 100);
});

// 从后端API加载书籍
async function loadBookFromAPI(bookId) {
    console.log('📚 从后端API获取书籍:', bookId);

    try {
        // 构建API URL
        const apiUrl = `/api/book/${encodeURIComponent(bookId)}`;
        console.log('📚 请求URL:', apiUrl);

        // 获取EPUB文件
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`获取书籍失败: ${response.status} ${response.statusText}`);
        }

        // 获取文件blob
        const blob = await response.blob();
        console.log('📚 获取到文件blob:', blob.size, 'bytes');

        // 转换为ArrayBuffer避免路径问题
        console.log('📚 转换为ArrayBuffer...');
        const arrayBuffer = await blob.arrayBuffer();
        console.log('📚 ArrayBuffer大小:', arrayBuffer.byteLength, 'bytes');

        // 创建book对象
        console.log('📚 创建epub.js对象...');
        book = ePub(arrayBuffer);
        console.log('📚 book对象创建成功');

        // 等待book加载完成后再检测书写模式
        await book.ready;
        console.log('🔍 book加载完成，开始检测书写模式 v2.0...');
        console.log('🔍 book.package:', book.package);
        console.log('🔍 book.package.metadata:', book.package?.metadata);
        console.log('🔍 direction值:', book.package?.metadata?.direction);

        let isVertical = false;
        if (book.package && book.package.metadata && book.package.metadata.direction === 'rtl') {
            isVertical = true;
            console.log('✅ 检测到竖排文本 (direction: rtl)');
        } else {
            console.log('❌ 检测到横排文本或无direction信息');
        }
        console.log('🔍 isVertical结果:', isVertical);

        // 为viewer添加相应的样式类（在创建rendition之前）
        const viewer = document.getElementById('viewer');
        if (viewer) {
            if (isVertical) {
                viewer.classList.add('vertical-rl');
                console.log('📖 已为viewer添加vertical-rl类');
            } else {
                viewer.classList.remove('vertical-rl');
                console.log('📖 已移除viewer的vertical-rl类');
            }
        }

        // 根据书写模式创建渲染器
        const renditionConfig = {
            width: '100%',
            height: '100%',
            spread: 'none',
            allowScriptedContent: true,
            flow: 'paginated',
            manager: 'default'
        };

        // 如果是竖排，不修改rendition配置，只通过CSS主题实现
        if (isVertical) {
            console.log('📖 竖排模式：仅通过CSS主题实现，不修改rendition配置');
            // 不修改rendition配置，保持默认的分页逻辑
        }

        rendition = book.renderTo('viewer', renditionConfig);
        console.log('📖 rendition配置:', renditionConfig);

        // 根据检测结果设置相应主题（在display之前）
        if (isVertical) {
            console.log('📖 设置竖排主题');

            // 注册竖排主题（确保应用到每个iframe内部）
            rendition.themes.register('vertical-japanese', {
                'html': {
                    'writing-mode': 'vertical-rl !important',
                    '-webkit-writing-mode': 'vertical-rl !important',
                    '-ms-writing-mode': 'tb-rl !important',
                    'text-orientation': 'upright !important',
                    '-webkit-text-orientation': 'upright !important',
                    'height': '100vh !important',
                    'width': '100vw !important'
                },
                'body': {
                    'writing-mode': 'vertical-rl !important',
                    '-webkit-writing-mode': 'vertical-rl !important',
                    '-ms-writing-mode': 'tb-rl !important',
                    'text-orientation': 'upright !important',
                    '-webkit-text-orientation': 'upright !important',
                    'height': '100% !important',
                    'width': '100% !important',
                    'margin': '0 !important',
                    'padding': '20px !important',
                    'box-sizing': 'border-box !important'
                },
                'p, div, span, h1, h2, h3, h4, h5, h6': {
                    'text-orientation': 'upright !important',
                    '-webkit-text-orientation': 'upright !important',
                    'line-height': '2.0 !important'
                },
                'p': {
                    'text-align': 'justify !important',
                    'margin-bottom': '1em !important'
                }
            });

            // 选择并应用竖排主题
            rendition.themes.select('vertical-japanese');
            console.log('📖 已选择vertical-japanese主题');

            // 监听每个页面渲染，确保竖排样式被正确应用
            rendition.on('rendered', function(section) {
                console.log('📖 页面渲染完成，重新应用竖排主题');
                rendition.themes.select('vertical-japanese');
            });
        } else {
            console.log('📖 使用默认横排主题');
        }
        console.log('📚 rendition创建成功');

        // 显示内容
        console.log('📚 开始显示内容...');
        await rendition.display();
        console.log('📚 内容显示成功');

        // 设置全局变量
        window.rendition = rendition;
        console.log('📚 设置全局rendition变量');

        // 通知词典功能
        if (window.Dictionary && window.Dictionary.bindRendition) {
            console.log('📚 通知词典功能绑定rendition');
            window.Dictionary.bindRendition();
        }

        // 隐藏加载提示
        document.getElementById('loading').style.display = 'none';

        // 加载目录 - 这是关键！
        console.log('📚 加载目录...');
        try {
            await loadTOC();
            console.log('📚 目录加载成功');
        } catch (tocError) {
            console.error('📚 目录加载失败:', tocError);
        }

        // 设置事件监听器
        setupEventListeners();

        console.log('📚 书籍加载完成！');

    } catch (error) {
        console.error('❌ 从后端获取书籍失败:', error);
        showError(`
            <div>
                <h3>无法加载书籍</h3>
                <p>书籍ID: ${bookId}</p>
                <p>错误信息: ${error.message}</p>
                <button onclick="window.location.href='/'" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    返回书架
                </button>
            </div>
        `);
    }
}

// 页面卸载时保存设置
window.addEventListener('beforeunload', saveMarginSettings);

// 简化的书写模式检测（仅用于调试）
function detectWritingModeForDebug() {
    if (!book || !book.package || !book.package.metadata) {
        return false;
    }
    return book.package.metadata.direction === 'rtl';
}



// 删除了复杂的检测函数，现在在渲染前直接处理

// 直接从 EPUB 文件检测书写模式
async function detectWritingModeFromEpub() {
    try {
        console.log('📖 尝试直接从EPUB文件检测书写模式...');

        // 获取当前书籍的 ArrayBuffer
        if (!book.archive) {
            console.warn('📖 无法访问EPUB文件内容');
            return detectWritingModeFromEpubJS();
        }

        // 查找 OPF 文件
        const containerXml = await book.archive.getText('META-INF/container.xml');
        console.log('📖 container.xml:', containerXml);

        // 解析 container.xml 找到 OPF 文件路径
        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(containerXml, 'text/xml');
        const rootfile = containerDoc.querySelector('rootfile');
        const opfPath = rootfile ? rootfile.getAttribute('full-path') : 'content.opf';

        console.log('📖 OPF文件路径:', opfPath);

        // 读取 OPF 文件
        const opfContent = await book.archive.getText(opfPath);
        console.log('📖 OPF内容:', opfContent);

        // 解析 OPF 文件
        const opfDoc = parser.parseFromString(opfContent, 'text/xml');

        // 查找 primary-writing-mode
        const writingModeMeta = opfDoc.querySelector('meta[name="primary-writing-mode"]');
        const writingMode = writingModeMeta ? writingModeMeta.getAttribute('content') : null;

        // 查找 page-progression-direction
        const spine = opfDoc.querySelector('spine');
        const pageProgression = spine ? spine.getAttribute('page-progression-direction') : null;

        console.log('📖 直接解析 - 书写模式:', writingMode);
        console.log('📖 直接解析 - 页面方向:', pageProgression);

        // 应用竖排样式
        if (writingMode === 'vertical-rl' || pageProgression === 'rtl') {
            console.log('📖 检测到竖排，应用竖排样式（包含text-orientation: upright修复）');

            const viewer = document.getElementById('viewer');
            if (viewer) {
                viewer.classList.add('vertical-rl');
            }

            return {
                body: {
                    'writing-mode': 'vertical-rl !important',
                    '-webkit-writing-mode': 'vertical-rl !important',
                    '-ms-writing-mode': 'tb-rl !important',
                    'direction': 'rtl !important',
                    'text-orientation': 'upright !important',
                    '-webkit-text-orientation': 'upright !important'
                },
                all: {
                    'writing-mode': 'inherit !important',
                    '-webkit-writing-mode': 'inherit !important',
                    'text-orientation': 'upright !important',
                    '-webkit-text-orientation': 'upright !important'
                },
                text: {
                    'text-orientation': 'upright !important',
                    '-webkit-text-orientation': 'upright !important',
                    'line-height': '2.0 !important',
                    'text-align': 'justify !important'
                }
            };
        } else {
            console.log('📖 使用横排样式');
            return { body: {}, all: {}, text: {} };
        }

    } catch (error) {
        console.error('直接解析EPUB失败:', error);
        return detectWritingModeFromEpubJS();
    }
}

// 检测并应用书写模式（保留用于调试）
function detectAndApplyWritingMode() {
    if (!book) {
        console.warn('书籍未加载，无法检测书写模式');
        return;
    }

    try {
        // 检查EPUB元数据中的书写模式
        const metadata = book.package.metadata;
        const spine = book.package.spine;

        // 查找primary-writing-mode元数据
        let writingMode = null;
        let pageProgression = null;

        // 检查metadata中的writing-mode
        if (book.package.metadata && book.package.metadata.meta) {
            const metas = Array.isArray(book.package.metadata.meta)
                ? book.package.metadata.meta
                : [book.package.metadata.meta];

            for (const meta of metas) {
                if (meta && meta.name === 'primary-writing-mode') {
                    writingMode = meta.content;
                    break;
                }
            }
        }

        // 检查spine中的page-progression-direction
        if (spine && spine.pageProgressionDirection) {
            pageProgression = spine.pageProgressionDirection;
        }

        console.log('📖 检测到书写模式:', writingMode);
        console.log('📖 检测到页面方向:', pageProgression);

        // 应用竖排样式
        const viewer = document.getElementById('viewer');
        if (writingMode === 'vertical-rl' || pageProgression === 'rtl') {
            console.log('📖 应用竖排样式');
            viewer.classList.add('vertical-rl');

            // 同时设置rendition的流动方向
            if (rendition) {
                rendition.settings.flow = 'paginated';
                rendition.settings.spread = 'none'; // 竖排时不使用跨页
            }
        } else {
            console.log('📖 使用横排样式');
            viewer.classList.remove('vertical-rl');
        }

    } catch (error) {
        console.error('检测书写模式失败:', error);
    }
}