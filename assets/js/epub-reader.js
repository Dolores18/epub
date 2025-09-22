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
let isLocationsGenerating = false; // 防止重复生成locations的标志
let currentBookLanguage = null; // 当前书籍语言
let currentBookMetadata = null; // 当前书籍元数据

// Locations本地存储管理
async function getBookId(book) {
    // 获取书籍的唯一标识
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = urlParams.get('bookId') || urlParams.get('book');

    if (bookId) {
        return bookId;
    }

    // 如果没有URL参数，使用书籍标题
    if (book && book.package && book.package.metadata) {
        const title = book.package.metadata.title;
        return title ? title.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown_book';
    }

    return 'unknown_book';
}

async function saveLocationsToLocal(book) {
    try {
        const bookId = await getBookId(book);
        const locationsData = {
            locations: book.locations._locations,
            total: book.locations.total,
            timestamp: Date.now()
        };

        const storageKey = `epub_locations_${bookId}`;
        localStorage.setItem(storageKey, JSON.stringify(locationsData));

        console.log('📍 [Locations] ✅ 已保存到本地存储');
        console.log('📍 [Locations] 存储键:', storageKey);
        console.log('📍 [Locations] 位置点数量:', locationsData.total);
    } catch (error) {
        console.error('📍 [Locations] ❌ 保存到本地失败:', error);
    }
}

async function loadLocationsFromLocal(book) {
    try {
        const bookId = await getBookId(book);
        const storageKey = `epub_locations_${bookId}`;
        const savedData = localStorage.getItem(storageKey);

        if (savedData) {
            const locationsData = JSON.parse(savedData);

            // 恢复locations数据
            book.locations._locations = locationsData.locations;
            book.locations.total = locationsData.total;

            console.log('📍 [Locations] ✅ 从本地存储加载成功');
            console.log('📍 [Locations] 存储键:', storageKey);
            console.log('📍 [Locations] 位置点数量:', locationsData.total);
            console.log('📍 [Locations] 保存时间:', new Date(locationsData.timestamp).toLocaleString());

            return true;
        } else {
            console.log('📍 [Locations] 本地存储中没有locations数据');
            return false;
        }
    } catch (error) {
        console.error('📍 [Locations] ❌ 从本地加载失败:', error);
        return false;
    }
}
let importedUrl = null;
let currentPage = 0;  // 当前页面索引
let totalPages = 0;   // 总页数
let pageHeight = 0;   // 页面高度

// 书写模式配置
let writingMode = "horizontal-tb";  // 默认横排模式，可设置为 "vertical-rl" 竖排模式和"horizontal-tb"横排模式

// 栏数配置
let currentSpread = "none";  // 默认单栏模式，可设置为 true 双栏模式

// 使用epub-fixed.js的增强功能创建rendition
function createRenditionWithFixedSupport(book, viewerId, options = {}) {
    console.log('📶 使用epub-fixed.js创建rendition...');

    // 默认配置
    const defaultConfig = {
        width: '100%',
        height: '100%',
        spread: currentSpread,  // 使用全局变量设置栏数
        allowScriptedContent: true,
        flow: 'paginated',
        manager: 'default',
        // 使用epub-fixed.js的增强功能
        direction: 'ltr',  // 强制设置为左到右，覆盖EPUB元数据
        writingMode: writingMode // 使用全局变量设置书写模式
    };

    // 合并用户配置
    const renditionConfig = { ...defaultConfig, ...options };

    console.log('📶 rendition配置:', renditionConfig);

    // 创建rendition，使用epub-fixed.js的增强功能
    const newRendition = book.renderTo(viewerId, renditionConfig);

    console.log('📶 rendition创建完成，已应用epub-fixed.js增强功能');
    return newRendition;
}



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
    // 保存当前语言到全局变量
    currentBookLanguage = language;
    console.log('📚 保存当前书籍语言:', currentBookLanguage);

    // 通知词典功能语言已更新
    if (window.Dictionary && window.Dictionary.onLanguageUpdated) {
        console.log('📚 通知词典功能语言已更新');
        window.Dictionary.onLanguageUpdated(language);
    }

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

// 提供获取当前书籍语言的全局接口
function getCurrentBookLanguage() {
    return currentBookLanguage;
}

// 将函数暴露到全局作用域，供词典功能使用
window.getCurrentBookLanguage = getCurrentBookLanguage;

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
            console.log('📄 [epub-reader.js] 进入主分支：直接创建渲染器');

            // 创建渲染器（使用epub-fixed.js增强功能）
            debugLog('创建渲染器...');
            rendition = createRenditionWithFixedSupport(book, 'viewer');

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

                // 保存元数据到全局变量
                currentBookMetadata = metadata;
                console.log('📚 书籍元数据已保存到全局变量:', currentBookMetadata);

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

                // 即使metadata获取失败，也尝试更新书本信息（使用默认值）
                try {
                    if (book && book.package && book.package.metadata) {
                        showEpubMetadata();
                    } else {
                        // 如果完全没有metadata，显示默认信息
                        updateBookInfo({ title: '未知标题' });
                    }
                } catch (updateError) {
                    console.error('更新书本信息失败:', updateError);
                    updateBookInfo({ title: '未知标题' });
                }
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

            // 通知ProgressManager rendition已准备好，可以恢复阅读进度
            if (window.ProgressManager && window.ProgressManager.onRenditionReady) {
                console.log('📄 通知ProgressManager rendition已准备好');
                window.ProgressManager.onRenditionReady();
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

            // 先生成位置信息，再设置事件监听器
            debugLog('尝试生成位置信息...');
            console.log('📄 [epub-reader.js] 准备生成locations，当前book:', book);
            console.log('📄 [epub-reader.js] window.ProgressManager存在:', !!window.ProgressManager);
            try {
                // 尝试从本地加载locations
                await loadLocationsFromLocal(book);

                // 如果本地没有或加载失败，则生成并保存
                if (!isLocationsGenerating && book.locations.total === 0) {
                    console.log('📄 [epub-reader.js] 本地无locations，开始生成...');
                    isLocationsGenerating = true;
                    await book.locations.generate(1024);
                    console.log('📄 [epub-reader.js] locations生成完成，总数:', book.locations.total);

                    // 保存到本地
                    await saveLocationsToLocal(book);
                    isLocationsGenerating = false;
                } else {
                    console.log('📄 [epub-reader.js] locations已可用，总数:', book.locations.total);
                }
                // 使用ProgressManager设置book对象
                if (window.ProgressManager) {
                    console.log('📄 [epub-reader.js] 调用ProgressManager.setBook');
                    window.ProgressManager.setBook(book);
                    console.log('📄 [epub-reader.js] book对象已设置到ProgressManager');
                } else {
                    console.warn('📄 [epub-reader.js] ProgressManager未找到');
                }
            } catch (locationError) {
                console.error('📄 [epub-reader.js] 位置信息生成失败:', locationError);
                debugLog('位置信息生成失败，继续:', locationError.message);
            }

            // 设置事件监听器（在locations生成后）
            debugLog('设置事件监听器...');
            setupEventListeners();

            // 更新进度
            updateProgress();

            debugLog('阅读器初始化完成！');

        } catch (renderError) {
            debugLog('直接渲染失败，尝试等待 book.ready:', renderError.message);
            console.log('📄 [epub-reader.js] 进入备用分支：等待book.ready');

            // 如果直接渲染失败，再尝试等待 book.ready
            const readyPromise = book.ready;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('加载超时，请检查文件格式或尝试其他电子书')), 10000);
            });

            await Promise.race([readyPromise, timeoutPromise]);
            debugLog('书籍元数据加载完成');

            // 显示详细的元数据信息并更新侧边栏
            showEpubMetadata();

            // 重新创建渲染器（使用epub-fixed.js增强功能）
            rendition = createRenditionWithFixedSupport(book, 'viewer');

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

            // 通知ProgressManager rendition已准备好，可以恢复阅读进度
            if (window.ProgressManager && window.ProgressManager.onRenditionReady) {
                console.log('📄 通知ProgressManager rendition已准备好');
                window.ProgressManager.onRenditionReady();
            }

            // 通知主题管理器rendition已创建
            if (window.ThemeManager && window.ThemeManager.onRenditionReady) {
                console.log('🎨 通知主题管理器rendition已创建');
                window.ThemeManager.onRenditionReady();
            }

            await loadTOC();
            setupEventListeners();
            // 尝试从本地加载locations
            await loadLocationsFromLocal(book);

            // 如果本地没有或加载失败，则生成并保存
            if (!isLocationsGenerating && book.locations.total === 0) {
                console.log('📄 [epub-reader.js] 本地无locations，开始生成...');
                isLocationsGenerating = true;
                await book.locations.generate(1024);
                console.log('📄 [epub-reader.js] locations生成完成，总数:', book.locations.total);

                // 保存到本地
                await saveLocationsToLocal(book);
                isLocationsGenerating = false;
            } else {
                console.log('📄 [epub-reader.js] locations已可用，总数:', book.locations.total);
            }
            // 使用ProgressManager设置book对象
            if (window.ProgressManager) {
                console.log('📄 [epub-reader.js] 调用ProgressManager.setBook');
                window.ProgressManager.setBook(book);
                console.log('📄 [epub-reader.js] book对象已设置到ProgressManager');
            } else {
                console.warn('📄 [epub-reader.js] ProgressManager未找到');
            }
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

// 显示EPUB元数据信息并更新侧边栏
function showEpubMetadata() {
    console.log('📚 showEpubMetadata 被调用');
    console.log('📚 book 存在:', !!book);
    console.log('📚 book.package 存在:', !!(book && book.package));
    console.log('📚 book.package.metadata 存在:', !!(book && book.package && book.package.metadata));

    if (book && book.package && book.package.metadata) {
        const metadata = book.package.metadata;
        console.log('📚 EPUB元数据信息:');
        console.log('  标题:', metadata.title);
        console.log('  作者:', metadata.creator);
        console.log('  语言:', metadata.language);
        console.log('  出版商:', metadata.publisher);
        console.log('  标识符:', metadata.identifier);
        console.log('  完整元数据:', metadata);

        // 更新侧边栏的书本信息
        updateBookInfo(metadata);

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

// 从全局变量更新侧边栏书本信息
function updateBookInfoFromGlobal() {
    console.log('📚 updateBookInfoFromGlobal 被调用');
    console.log('📚 currentBookMetadata:', currentBookMetadata);

    if (currentBookMetadata) {
        updateBookInfo(currentBookMetadata);
    } else {
        console.log('📚 没有全局元数据，使用默认信息');
        updateBookInfo({ title: '未知标题' });
    }
}

// 更新侧边栏书本信息
function updateBookInfo(metadata) {
    console.log('📚 updateBookInfo 被调用，metadata:', metadata);
    try {
        // 更新书本标题
        const bookTitle = document.getElementById('bookTitle');
        if (bookTitle) {
            bookTitle.textContent = metadata.title || '未知标题';
        }

        // 更新作者信息
        const bookAuthor = document.getElementById('bookAuthor');
        if (bookAuthor) {
            const author = metadata.creator || metadata.author;
            if (author) {
                bookAuthor.textContent = `作者: ${author}`;
                bookAuthor.style.display = 'block';
            } else {
                bookAuthor.style.display = 'none';
            }
        }

        // 更新副标题（如果有出版商信息）
        const bookSubtitle = document.getElementById('bookSubtitle');
        if (bookSubtitle) {
            if (metadata.publisher) {
                bookSubtitle.textContent = `出版商: ${metadata.publisher}`;
                bookSubtitle.style.display = 'block';
            } else if (metadata.language) {
                bookSubtitle.textContent = `语言: ${metadata.language}`;
                bookSubtitle.style.display = 'block';
            } else {
                bookSubtitle.style.display = 'none';
            }
        }

        // 更新页面标题
        document.title = metadata.title || 'EPUB阅读器';

        console.log('✅ 侧边栏书本信息已更新');
    } catch (error) {
        console.error('❌ 更新书本信息失败:', error);
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 位置变化监听
    rendition.on('relocated', async (location) => {
        console.log('📍 relocated事件触发，当前起始位置CFI:', location.start.cfi);

        currentLocation = location;

        // 使用ProgressManager更新位置
        if (window.ProgressManager) {
            // 如果ProgressManager中没有book，尝试设置
            if (!window.ProgressManager.book && book && book.locations) {
                console.log('📍 [修复] ProgressManager中没有book，现在设置');
                window.ProgressManager.setBook(book);
            }

            // 先尝试从本地加载locations
            if (book && book.locations && book.locations.total === 0) {
                const loaded = await loadLocationsFromLocal(book);
                if (!loaded && !isLocationsGenerating) {
                    console.log('📍 [修复] 本地无locations，开始生成');
                    isLocationsGenerating = true;
                    book.locations.generate(1024).then(() => {
                        console.log('📍 [修复] locations生成完成，总数:', book.locations.total);
                        // 保存到本地
                        saveLocationsToLocal(book);
                        isLocationsGenerating = false;
                        window.ProgressManager.setBook(book);
                        window.ProgressManager.updateLocation(location);
                    }).catch((error) => {
                        console.error('📍 [修复] locations生成失败:', error);
                        isLocationsGenerating = false;
                    });
                    return; // 等待生成完成
                }
            }

            // locations已可用，直接更新位置
            if (isLocationsGenerating) {
                console.log('📍 [修复] locations正在生成中，跳过位置更新');
            } else {
                console.log('📍 [修复] locations已可用，更新位置');
                window.ProgressManager.updateLocation(location);
            }
        } else {
            console.warn('📍 ProgressManager未找到，使用fallback');
            updateProgress();
        }

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
    return writingMode === "vertical-rl" || writingMode === "vertical-lr";
}

// 检测当前是否为双栏模式
function isDoubleColumnMode() {
    return currentSpread === true;
}

// 切换单栏/双栏模式
async function toggleColumnMode() {
    if (!rendition) {
        console.warn('rendition 未初始化，无法切换栏数');
        return;
    }

    try {
        console.log('切换前栏数模式:', currentSpread);
        
        // 切换栏数
        const newSpread = currentSpread === "none" ? true : "none";
        currentSpread = newSpread;
        
        console.log('新栏数模式:', currentSpread);
        
        // 保存当前位置 - 优先使用全局变量currentLocation
        const currentCfi = currentLocation?.start?.cfi || rendition.currentLocation?.start?.cfi;
        console.log('🔄 保存当前位置CFI:', currentCfi);
        
        // 销毁当前rendition
        rendition.destroy();
        
        // 重新创建rendition with新的spread设置
        rendition = createRenditionWithFixedSupport(book, 'viewer');
        
        // 重新设置为全局变量
        window.rendition = rendition;
        
        // 重新显示内容
        if (currentCfi) {
            console.log('🔄 恢复到位置:', currentCfi);
            await rendition.display(currentCfi);
        } else {
            console.log('🔄 没有保存的位置，显示开头');
            await rendition.display();
        }
        
        // 重新应用字体设置
        applyInitialFontSize();
        
        // 重新应用语言字体
        if (currentBookLanguage) {
            applyLanguageBasedFont(currentBookLanguage);
        }
        
        // 重新设置事件监听器
        setupEventListeners();
        
        // 通知词典功能重新绑定
        if (window.Dictionary && window.Dictionary.bindRendition) {
            console.log('🔍 重新通知词典功能绑定rendition');
            window.Dictionary.bindRendition();
        }
        
        // 保存设置到本地存储
        localStorage.setItem('epubReaderSpread', currentSpread);
        
        console.log('栏数切换完成:', currentSpread === "none" ? "单栏" : "双栏");
        
    } catch (error) {
        console.error('栏数切换失败:', error);
    }
}

// 设置栏数模式
async function setColumnMode(spread) {
    if (spread === currentSpread) {
        console.log('栏数模式无变化，跳过');
        return;
    }
    
    if (!rendition) {
        console.warn('rendition 未初始化，无法设置栏数');
        return;
    }

    try {
        console.log('设置栏数模式:', currentSpread, '->', spread);
        
        // 保存当前位置 - 优先使用全局变量currentLocation
        const currentCfi = currentLocation?.start?.cfi || rendition.currentLocation?.start?.cfi;
        console.log('🔄 保存当前位置CFI:', currentCfi);
        
        // 更新栏数设置
        currentSpread = spread;
        
        // 销毁当前rendition
        rendition.destroy();
        
        // 重新创建rendition with新的spread设置
        rendition = createRenditionWithFixedSupport(book, 'viewer');
        
        // 重新设置为全局变量
        window.rendition = rendition;
        
        // 重新显示内容
        if (currentCfi) {
            console.log('🔄 恢复到位置:', currentCfi);
            await rendition.display(currentCfi);
        } else {
            console.log('🔄 没有保存的位置，显示开头');
            await rendition.display();
        }
        
        // 重新应用字体设置
        applyInitialFontSize();
        
        // 重新应用语言字体
        if (currentBookLanguage) {
            applyLanguageBasedFont(currentBookLanguage);
        }
        
        // 重新设置事件监听器
        setupEventListeners();
        
        // 通知词典功能重新绑定
        if (window.Dictionary && window.Dictionary.bindRendition) {
            console.log('🔍 重新通知词典功能绑定rendition');
            window.Dictionary.bindRendition();
        }
        
        // 保存设置到本地存储
        localStorage.setItem('epubReaderSpread', currentSpread);
        
        console.log('栏数设置完成:', currentSpread === "none" ? "单栏" : "双栏");
        
    } catch (error) {
        console.error('栏数设置失败:', error);
    }
}

// 智能上一页
function prevPage() {
    if (rendition) {
        const isVertical = isVerticalMode();
        console.log('执行上一页 (竖排模式:', isVertical, ')');
        try {
            // 无论横排还是竖排，上一页都是 rendition.prev()
            rendition.prev();
        } catch (error) {
            console.error('上一页失败:', error);
        }
    } else {
        console.warn('rendition 未初始化');
    }
}

// 智能下一页
function nextPage() {
    if (rendition) {
        const isVertical = isVerticalMode();
        console.log('执行下一页 (竖排模式:', isVertical, ')');
        try {
            // 无论横排还是竖排，下一页都是 rendition.next()
            rendition.next();
        } catch (error) {
            console.error('下一页失败:', error);
        }
    } else {
        console.warn('rendition 未初始化');
    }
}



// 跳转到章节
function goToChapter(href) {
    if (rendition) {
        rendition.display(href);
    }
}



// 更新按钮状态
function updateButtons() {
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

    if (currentLocation) {
        const isVertical = isVerticalMode();

        if (isVertical) {
            // 竖排模式：左控件=下一页，右控件=上一页
            if (prevPageBtn) {
                // 左控件：在最后一页时禁用（不能再下一页）
                prevPageBtn.disabled = currentLocation.atEnd;
                prevPageBtn.style.opacity = currentLocation.atEnd ? '0.5' : '1';
            }
            if (nextPageBtn) {
                // 右控件：在第一页时禁用（不能再上一页）
                nextPageBtn.disabled = currentLocation.atStart;
                nextPageBtn.style.opacity = currentLocation.atStart ? '0.5' : '1';
            }
        } else {
            // 横排模式：左控件=上一页，右控件=下一页
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

    // 检查是否点击了退出按钮，如果是则不处理
    if (e.target.closest('#exitBtn') || e.target.closest('.exit-btn')) {
        console.log('🔍 点击了退出按钮，不处理菜单隐藏');
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

// 初始化栏数设置（从本地存储加载）
function initializeSpreadSettings() {
    try {
        const savedSpread = localStorage.getItem('epubReaderSpread');
        if (savedSpread) {
            // 处理本地存储的值：将字符串转换为正确的类型
            if (savedSpread === "true") {
                currentSpread = true;
            } else if (savedSpread === "false") {
                currentSpread = false;
            } else {
                currentSpread = savedSpread; // "none"
            }
            console.log('从本地存储加载栏数设置:', savedSpread, '->', currentSpread);
        }
    } catch (error) {
        console.error('加载栏数设置失败:', error);
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
async function initializeApp() {
    // 测试库加载
    testLibraries();

    // 初始化字体大小设置
    initializeFontSize();
    
    // 初始化栏数设置
    initializeSpreadSettings();

    // 初始化词典功能
    if (window.Dictionary) {
        console.log('🔍 初始化词典功能...');
        window.Dictionary.init();
    } else {
        console.warn('⚠️ 词典功能未加载');
    }

    // 初始化主题管理器
    if (window.ThemeManager) {
        console.log('🎨 初始化主题管理器...');
        await window.ThemeManager.init();
    } else {
        console.warn('⚠️ 主题管理器未加载');
    }

    // 文件导入功能已移除

    // 字体切换功能
    const fontSelect = document.getElementById('fontSelect');
    console.log('🔤 字体选择器元素:', fontSelect);
    if (fontSelect) {
        console.log('🔤 绑定字体切换事件监听器');
        fontSelect.addEventListener('change', function () {
            const selectedFont = fontSelect.value;
            console.log('🔤 字体切换:', selectedFont);

            if (selectedFont === 'auto') {
                // 自动模式：根据语言选择字体
                console.log('🔤 自动模式：根据语言选择字体');
                if (book && book.package && book.package.metadata) {
                    const language = book.package.metadata.language;
                    console.log('🔤 检测到语言:', language);
                    applyLanguageBasedFont(language);
                } else {
                    console.warn('🔤 无法获取书籍语言信息');
                }
            } else {
                // 手动模式：使用用户选择的字体
                console.log('🔤 手动模式：使用选择的字体');
                const viewer = document.getElementById('viewer');
                if (viewer) {
                    viewer.style.fontFamily = selectedFont;
                    console.log('🔤 已设置viewer字体:', selectedFont);
                }
                // epub.js 内部内容也同步切换
                if (rendition) {
                    rendition.themes.override({
                        'body': { 'font-family': selectedFont + ' !important' },
                        '*': { 'font-family': selectedFont + ' !important' }
                    });
                    console.log('🔤 已应用epub.js字体覆盖');
                } else {
                    console.warn('🔤 rendition未初始化，无法应用字体');
                }
            }
        });
    }

    // 栏数切换功能
    const columnSelect = document.getElementById('columnSelect');
    console.log('📖 栏数选择器元素:', columnSelect);
    if (columnSelect) {
        // 设置初始值：true -> "true", "none" -> "none"
        const initialValue = currentSpread === true ? "true" : "none";
        console.log('📖 设置栏数选择器初始值:', currentSpread, '->', initialValue);
        columnSelect.value = initialValue;
        
        console.log('📖 绑定栏数切换事件监听器');
        columnSelect.addEventListener('change', function () {
            const selectedValue = columnSelect.value;
            const selectedSpread = selectedValue === "true" ? true : "none";
            console.log('📖 栏数切换:', selectedValue, '->', selectedSpread);
            setColumnMode(selectedSpread).catch(error => console.error('UI切换栏数失败:', error));
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

    // 绑定左右翻页控件事件（智能翻页）
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

    if (prevPageBtn) {
        console.log('🔍 绑定左控件事件');
        prevPageBtn.addEventListener('click', function (e) {
            console.log('🔍 左控件被点击');
            e.stopPropagation(); // 阻止事件冒泡

            // 智能判断：在竖排模式下，左控件应该是下一页
            const isVertical = isVerticalMode();
            if (isVertical) {
                console.log('🔍 竖排模式：左控件 -> 下一页');
                nextPage();
            } else {
                console.log('🔍 横排模式：左控件 -> 上一页');
                prevPage();
            }
        });
    }

    if (nextPageBtn) {
        console.log('🔍 绑定右控件事件');
        nextPageBtn.addEventListener('click', function (e) {
            console.log('🔍 右控件被点击');
            e.stopPropagation(); // 阻止事件冒泡

            // 智能判断：在竖排模式下，右控件应该是上一页
            const isVertical = isVerticalMode();
            if (isVertical) {
                console.log('🔍 竖排模式：右控件 -> 上一页');
                prevPage();
            } else {
                console.log('🔍 横排模式：右控件 -> 下一页');
                nextPage();
            }
        });
    }

    // 键盘快捷键（包括智能左右翻页）
    document.addEventListener('keydown', function (e) {
        switch (e.key) {
            case 'ArrowLeft':
                // 左箭头键：智能翻页
                e.preventDefault();
                const isVertical = isVerticalMode();
                if (isVertical) {
                    // 竖排模式：左键=下一页
                    nextPage();
                } else {
                    // 横排模式：左键=上一页
                    prevPage();
                }
                break;
            case 'ArrowRight':
                // 右箭头键：智能翻页
                e.preventDefault();
                const isVerticalRight = isVerticalMode();
                if (isVerticalRight) {
                    // 竖排模式：右键=上一页
                    prevPage();
                } else {
                    // 横排模式：右键=下一页
                    nextPage();
                }
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
            case 'h':
            case 'H':
                // H键快速切换主题
                if (window.quickThemeSwitch) {
                    window.quickThemeSwitch();
                }
                break;
            case 'c':
            case 'C':
                // C键切换单栏/双栏
                toggleColumnMode().catch(error => console.error('键盘切换栏数失败:', error));
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

        // 根据书写模式创建渲染器
        const renditionConfig = {
            width: '100%',
            height: '100%',
            spread: 'none',
            allowScriptedContent: true,
            flow: 'paginated',
            manager: 'default'
        };

        // 使用epub-fixed.js增强功能创建渲染器
        rendition = createRenditionWithFixedSupport(book, 'viewer');
        console.log('📶 rendition创建成功，已应用书写模式');

        // 显示内容
        console.log('📚 开始显示内容...');
        await rendition.display();
        console.log('📚 内容显示成功');

        // 等待并处理元数据
        try {
            await book.ready;
            if (book && book.package && book.package.metadata) {
                currentBookMetadata = book.package.metadata;
                console.log('📚 API加载：书籍元数据已保存到全局变量:', currentBookMetadata);

                // 立即更新侧边栏
                updateBookInfoFromGlobal();

                // 显示详细元数据
                showEpubMetadata();
            }
        } catch (metadataError) {
            console.error('📚 API加载：获取元数据失败:', metadataError);
        }

        // 设置全局变量
        window.rendition = rendition;
        console.log('📚 设置全局rendition变量');

        // 通知词典功能
        if (window.Dictionary && window.Dictionary.bindRendition) {
            console.log('📚 通知词典功能绑定rendition');
            window.Dictionary.bindRendition();
        }

        // 通知ProgressManager rendition已准备好，可以恢复阅读进度
        if (window.ProgressManager && window.ProgressManager.onRenditionReady) {
            console.log('📄 通知ProgressManager rendition已准备好');
            window.ProgressManager.onRenditionReady();
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

        // 处理locations - 这是关键！
        console.log('📚 处理locations...');
        try {
            // 尝试从本地加载locations
            await loadLocationsFromLocal(book);

            // 如果本地没有或加载失败，则生成并保存
            if (!isLocationsGenerating && book.locations.total === 0) {
                console.log('📚 本地无locations，开始生成...');
                isLocationsGenerating = true;
                await book.locations.generate(1024);
                console.log('📚 locations生成完成，总数:', book.locations.total);

                // 保存到本地
                await saveLocationsToLocal(book);
                isLocationsGenerating = false;
            } else {
                console.log('📚 locations已可用，总数:', book.locations.total);
            }

            // 使用ProgressManager设置book对象
            if (window.ProgressManager) {
                console.log('📚 调用ProgressManager.setBook');
                window.ProgressManager.setBook(book);
                console.log('📚 book对象已设置到ProgressManager');
            } else {
                console.warn('📚 ProgressManager未找到');
            }
        } catch (locationError) {
            console.error('📚 locations处理失败:', locationError);
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

// 提供获取当前书籍语言的全局接口
function getCurrentBookLanguage() {
    return currentBookLanguage;
}

// 提供获取当前书籍元数据的全局接口
function getCurrentBookMetadata() {
    return currentBookMetadata;
}

// 手动触发侧边栏更新的全局接口
function refreshBookInfo() {
    console.log('📚 手动刷新书本信息');
    updateBookInfoFromGlobal();
}

// 处理栏数选择器变化的全局函数
function handleColumnChange() {
    const columnSelect = document.getElementById('columnSelect');
    if (columnSelect) {
        const selectedValue = columnSelect.value;
        const selectedSpread = selectedValue === "true" ? true : "none";
        console.log('📖 HTML回调：栏数切换:', selectedValue, '->', selectedSpread);
        setColumnMode(selectedSpread).catch(error => console.error('HTML回调切换栏数失败:', error));
    }
}

// 将函数暴露到全局作用域，供外部调用
window.getCurrentBookLanguage = getCurrentBookLanguage;
window.getCurrentBookMetadata = getCurrentBookMetadata;
window.refreshBookInfo = refreshBookInfo;
window.toggleColumnMode = toggleColumnMode;
window.setColumnMode = setColumnMode;
window.isDoubleColumnMode = isDoubleColumnMode;
window.handleColumnChange = handleColumnChange;




