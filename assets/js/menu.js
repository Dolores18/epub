/**
 * Menu.js - 菜单相关功能
 * 包括主题选择、侧边栏控制等菜单功能
 */

console.log('🎨 Menu.js 文件已加载！');

// 切换主题选择面板
function toggleThemeSelector() {
    const themeSelectorPanel = document.getElementById('themeSelectorPanel');
    themeSelectorPanel.classList.toggle('show');
    // 打开主题选择面板时自动隐藏底部菜单
    hideBottomMenu();
}

// 主题管理器
const ThemeManager = {
    currentTheme: 'none',

    // 初始化主题系统
    async init() {
        console.log('🎨 初始化主题系统...');

        // 首先加载主题相关的HTML组件
        if (window.HTMLLoader) {
            await window.HTMLLoader.initThemeComponents();
        }

        // 从本地存储加载保存的主题
        const savedTheme = localStorage.getItem('epubReaderTheme') || 'none';
        this.applyTheme(savedTheme);

        // 绑定主题选择事件
        this.bindThemeEvents();

        console.log('🎨 主题系统初始化完成，当前主题:', savedTheme);
    },

    // 绑定主题选择事件
    bindThemeEvents() {
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.applyTheme(theme);
                this.updateThemeSelection(theme);

                // 选择主题后自动关闭面板
                setTimeout(() => {
                    toggleThemeSelector();
                }, 300);
            });
        });
    },

    // 应用主题
    applyTheme(themeName) {
        console.log('🎨 应用主题:', themeName);

        // 移除当前主题类
        const viewer = document.getElementById('viewer');
        if (viewer) {
            viewer.classList.remove('epub-theme-grass', 'epub-theme-dark', 'epub-theme-sepia');
        }

        // 禁用所有主题CSS文件
        const themeLinks = ['defaultThemeCSS', 'grayThemeCSS', 'sepiaThemeCSS', 'grassThemeCSS', 'cherryThemeCSS', 'skyThemeCSS', 'solarizedThemeCSS', 'darkThemeCSS'];
        themeLinks.forEach(linkId => {
            const link = document.getElementById(linkId);
            if (link) {
                link.disabled = true;
            }
        });

        // 应用新主题
        if (themeName !== 'none') {
            // 启用对应的CSS文件
            const themeMap = {
                'default': 'defaultThemeCSS',
                'gray': 'grayThemeCSS',
                'sepia': 'sepiaThemeCSS',
                'grass': 'grassThemeCSS',
                'cherry': 'cherryThemeCSS',
                'sky': 'skyThemeCSS',
                'solarized': 'solarizedThemeCSS',
                'dark': 'darkThemeCSS'
            };

            const linkId = themeMap[themeName];
            if (linkId) {
                const link = document.getElementById(linkId);
                if (link) {
                    link.disabled = false;
                }
            }

            // 添加主题类到viewer
            if (viewer) {
                viewer.classList.add(`epub-theme-${themeName}`);
            }

            // 如果rendition已初始化，也应用到epub内容
            if (window.rendition) {
                this.applyThemeToRendition(themeName);
            }
        } else {
            // 无主题模式，清除epub内容的主题样式
            if (window.rendition) {
                this.clearRenditionTheme();
            }
        }

        // 更新当前主题
        this.currentTheme = themeName;

        // 保存到本地存储
        localStorage.setItem('epubReaderTheme', themeName);

        // 更新主题选择界面
        this.updateThemeSelection(themeName);

        console.log('🎨 主题应用完成:', themeName);
    },

    // 应用主题到epub内容
    applyThemeToRendition(themeName) {
        if (!window.rendition) return;

        console.log('🎨 应用主题到epub内容:', themeName);

        try {
            // 清除之前的主题样式
            window.rendition.themes.override({});

            // 根据主题应用样式
            const themeStyles = this.getThemeStyles(themeName);
            if (themeStyles) {
                window.rendition.themes.override(themeStyles);
            }

            console.log('🎨 epub内容主题应用成功');
        } catch (error) {
            console.error('🎨 应用epub内容主题失败:', error);
        }
    },

    // 清除epub内容的主题样式
    clearRenditionTheme() {
        if (!window.rendition) return;

        console.log('🎨 清除epub内容主题样式');

        try {
            window.rendition.themes.override({
                'body': {
                    'background-color': '',
                    'color': ''
                }
            });
        } catch (error) {
            console.error('🎨 清除epub内容主题失败:', error);
        }
    },

    // 获取主题样式
    getThemeStyles(themeName) {
        const themes = {
            'grass': {
                'body': {
                    'background-color': '#d7dbbd !important',
                    'color': '#232c16 !important'
                },
                '*': {
                    'background-color': '#d7dbbd !important',
                    'color': '#232c16 !important'
                },
                'p': {
                    'background-color': '#d7dbbd !important',
                    'color': '#232c16 !important'
                },
                'div': {
                    'background-color': '#d7dbbd !important',
                    'color': '#232c16 !important'
                },
                'a': {
                    'color': '#177b4d !important'
                },
                'h1, h2, h3, h4, h5, h6': {
                    'color': '#232c16 !important'
                }
            },
            'dark': {
                'body': {
                    'background-color': '#1a1a1a !important',
                    'color': '#e0e0e0 !important'
                },
                '*': {
                    'background-color': '#1a1a1a !important',
                    'color': '#e0e0e0 !important'
                },
                'p': {
                    'background-color': '#1a1a1a !important',
                    'color': '#e0e0e0 !important'
                },
                'div': {
                    'background-color': '#1a1a1a !important',
                    'color': '#e0e0e0 !important'
                },
                'a': {
                    'color': '#4a9eff !important'
                },
                'h1, h2, h3, h4, h5, h6': {
                    'color': '#e0e0e0 !important'
                }
            },
            'sepia': {
                'body': {
                    'background-color': '#f4f1e8 !important',
                    'color': '#3c3530 !important'
                },
                '*': {
                    'background-color': '#f4f1e8 !important',
                    'color': '#3c3530 !important'
                },
                'p': {
                    'background-color': '#f4f1e8 !important',
                    'color': '#3c3530 !important'
                },
                'div': {
                    'background-color': '#f4f1e8 !important',
                    'color': '#3c3530 !important'
                },
                'a': {
                    'color': '#8b4513 !important'
                },
                'h1, h2, h3, h4, h5, h6': {
                    'color': '#3c3530 !important'
                }
            }
        };

        return themes[themeName] || null;
    },

    // 更新主题选择界面
    updateThemeSelection(themeName) {
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            if (option.dataset.theme === themeName) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    },

    // 当rendition创建后调用，应用当前主题
    onRenditionReady() {
        if (this.currentTheme !== 'none') {
            console.log('🎨 rendition就绪，应用当前主题:', this.currentTheme);
            this.applyThemeToRendition(this.currentTheme);
        }
    }
};

// 快速主题切换功能
function quickThemeSwitch() {
    const themes = ['none', 'default', 'gray', 'sepia', 'grass', 'cherry', 'sky', 'solarized', 'dark'];
    const currentIndex = themes.indexOf(ThemeManager.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    console.log('🎨 快速切换主题:', ThemeManager.currentTheme, '->', nextTheme);
    ThemeManager.applyTheme(nextTheme);
}

// 导出到全局作用域，供其他文件使用
window.ThemeManager = ThemeManager;
window.toggleThemeSelector = toggleThemeSelector;
window.quickThemeSwitch = quickThemeSwitch;