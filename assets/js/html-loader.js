/**
 * HTML Loader - 动态加载HTML片段
 * 用于加载主题相关的HTML组件，保持主文件简洁
 */

console.log('📄 HTML Loader 文件已加载！');

// HTML加载器
const HTMLLoader = {
    // 加载HTML片段到指定容器
    async loadHTML(url, containerId) {
        try {
            console.log(`📄 加载HTML片段: ${url} -> #${containerId}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const container = document.getElementById(containerId);
            
            if (container) {
                container.innerHTML = html;
                console.log(`✅ HTML片段加载成功: ${url}`);
            } else {
                console.error(`❌ 找不到容器: #${containerId}`);
            }
        } catch (error) {
            console.error(`❌ 加载HTML片段失败: ${url}`, error);
        }
    },

    // 动态插入CSS链接
    async loadCSSLinks(url) {
        try {
            console.log(`📄 加载CSS链接: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            
            // 创建临时容器来解析HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // 获取所有link标签并插入到head中
            const links = tempDiv.querySelectorAll('link');
            links.forEach(link => {
                document.head.appendChild(link.cloneNode(true));
            });
            
            console.log(`✅ CSS链接加载成功: ${url}, 共${links.length}个文件`);
        } catch (error) {
            console.error(`❌ 加载CSS链接失败: ${url}`, error);
        }
    },

    // 初始化所有主题相关的HTML组件
    async initThemeComponents() {
        console.log('📄 初始化主题组件...');
        
        // 加载CSS链接
        await this.loadCSSLinks('assets/html/theme-css-links.html');
        
        // 加载主题选择面板
        await this.loadHTML('assets/html/theme-selector-panel.html', 'themeSelectorContainer');
        
        console.log('📄 主题组件初始化完成');
    }
};

// 导出到全局作用域
window.HTMLLoader = HTMLLoader;