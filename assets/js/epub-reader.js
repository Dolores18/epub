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

            // 设置日文字体主题
            rendition.themes.default({
                'body': {
                    'font-family': 'IPAexMincho, Hiragino Mincho ProN, Yu Mincho, MS Mincho, serif',
                    'line-height': '1.8',
                    'letter-spacing': '0.05em',
                    'font-size': '16px'
                }
            });

            // 显示第一章
            debugLog('显示第一章...');
            await rendition.display();
            debugLog('第一章显示成功');

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
            document.getElementById('loading').style.display = 'none';
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
    });

    rendition.on('layout', (layout) => {
        console.log('布局变化:', layout);
    });
}

// 上一页
function prevPage() {
    if (rendition) {
        console.log('执行上一页');
        try {
            // 使用 epub.js 的标准翻页方法，自动处理行截断
            rendition.prev();
        } catch (error) {
            console.error('上一页失败:', error);
        }
    } else {
        console.warn('rendition 未初始化');
    }
}

// 下一页
function nextPage() {
    if (rendition) {
        console.log('执行下一页');
        try {
            // 使用 epub.js 的标准翻页方法，自动处理行截断
            rendition.next();
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
}

// 切换设置面板
function toggleSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    settingsPanel.classList.toggle('show');
}

// 显示/隐藏底部菜单
function showBottomMenu() {
    console.log('🔍 showBottomMenu() 被调用');
    const bottomMenu = document.getElementById('bottomMenu');
    console.log('🔍 bottomMenu 元素:', bottomMenu);
    bottomMenu.classList.add('show');
    console.log('🔍 菜单已显示，当前classList:', bottomMenu.classList.toString());

    // 为菜单添加点击事件，点击菜单区域隐藏菜单
    bottomMenu.addEventListener('click', function (e) {
        console.log('🔍 bottomMenu 被点击了！');
        // 如果点击的是菜单本身（不是按钮），则隐藏菜单
        if (e.target === bottomMenu || e.target.classList.contains('menu-section')) {
            console.log('🔍 点击菜单区域，准备隐藏菜单');
            hideBottomMenu();
        }
    }, { once: true }); // once: true 确保事件只绑定一次
}

function hideBottomMenu() {
    console.log('🔍 hideBottomMenu() 被调用');
    const bottomMenu = document.getElementById('bottomMenu');
    bottomMenu.classList.remove('show');
    console.log('🔍 菜单已隐藏，当前classList:', bottomMenu.classList.toString());
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

// 改变字体大小
function changeFontSize(delta) {
    if (rendition) {
        const currentSize = parseInt(rendition.themes.fontSize()) || 16;
        const newSize = Math.max(12, Math.min(24, currentSize + delta));
        rendition.themes.fontSize(newSize + 'px');
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
            const viewer = document.getElementById('viewer');
            if (viewer) {
                viewer.style.fontFamily = fontSelect.value;
            }
            // epub.js 内部内容也同步切换
            if (rendition) {
                rendition.themes.override('font-family', fontSelect.value);
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
            console.log('🔍 事件对象:', e);
            e.stopPropagation(); // 阻止事件冒泡
            toggleBottomMenu();
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

            // 点击中央区域显示菜单
            toggleBottomMenu();
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
        bottomMargin: 20,
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
            'padding-bottom': '20px',
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
        bottomMargin: document.getElementById('bottomMargin')?.value || 20,
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
window.addEventListener('load', initReader);

// 页面卸载时保存设置
window.addEventListener('beforeunload', saveMarginSettings);

