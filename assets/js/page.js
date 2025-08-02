/**
 * Page Progress Manager
 * 页面进度管理器 - 从epub-reader.js提取的进度相关代码
 */

console.log('📄 Page Progress Manager 已加载');

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

// 更新页面信息
function updatePageInfo() {
    // 分页模式下，进度信息由 updateProgress() 函数处理
    // 这里可以添加其他页面相关的更新逻辑
    console.log('页面信息已更新');
}

// 导出函数供其他模块使用
if (typeof window !== 'undefined') {
    window.updateProgress = updateProgress;
    window.updatePageInfo = updatePageInfo;
}