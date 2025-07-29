/**
 * 书架页面 JavaScript
 * 管理电子书库和导航功能
 */

console.log('📚 书架页面 JavaScript 已加载');

// 全局变量
let importedBooks = [];
let recentBooks = [];

// 初始化书架
async function initBookshelf() {
    console.log('📚 初始化书架...');

    // 等待BookManager初始化完成
    if (!window.BookManager) {
        console.error('BookManager未加载，延迟初始化');
        setTimeout(initBookshelf, 100);
        return;
    }

    // 加载BookManager的数据
    window.BookManager.loadFromStorage();

    // 加载保存的书籍数据
    loadBooksFromStorage();

    // 设置事件监听器
    setupEventListeners();

    // 渲染书籍列表
    renderBooks();
    renderRecentBooks();

    // 异步清理无效数据（向后端验证bookId）
    setTimeout(async () => {
        try {
            await cleanupInvalidBooks();
        } catch (error) {
            console.error('📚 清理无效数据时出错:', error);
        }
    }, 1000); // 延迟1秒，让页面先正常显示

    console.log('📚 书架初始化完成');
}

// 设置事件监听器
function setupEventListeners() {
    // 文件导入监听器
    const importInput = document.getElementById('importEpub');
    if (importInput) {
        importInput.addEventListener('change', handleFileImport);
    }

    // 书籍卡片点击监听器
    document.addEventListener('click', function (e) {
        const bookCard = e.target.closest('.book-card');
        if (bookCard) {
            const fileName = bookCard.dataset.file;
            const bookData = bookCard.dataset.bookData;

            if (fileName) {
                // 预设书籍
                openBook(fileName);
            } else if (bookData) {
                // 导入的书籍
                const book = JSON.parse(bookData);
                openImportedBook(book);
            }
        }
    });
}

// 处理文件导入
async function handleFileImport(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    console.log(`📚 用户选择了 ${files.length} 个文件`);
    
    // 显示加载提示
    showLoading();
    
    try {
        const processedBooks = [];
        
        // 第一步：前端解析每个文件的元数据
        for (const file of files) {
            if (!file.name.toLowerCase().endsWith('.epub')) {
                showMessage(`跳过非EPUB文件: ${file.name}`, 'error');
                continue;
            }
            
            console.log('📚 解析文件元数据:', file.name);
            
            try {
                // 使用epub.js解析元数据
                const arrayBuffer = await file.arrayBuffer();
                const book = ePub(arrayBuffer);
                await book.ready;
                
                // 提取元数据
                const metadata = book.package.metadata;
                
                // 尝试获取封面
                let coverUrl = null;
                try {
                    coverUrl = await book.coverUrl();
                } catch (coverError) {
                    console.warn('获取封面失败:', coverError);
                }
                
                const bookInfo = {
                    file: file,
                    filename: file.name,
                    metadata: {
                        title: metadata.title || file.name.replace('.epub', ''),
                        creator: metadata.creator || '未知作者',
                        language: metadata.language || 'unknown',
                        publisher: metadata.publisher || '未知出版商',
                        identifier: metadata.identifier || '',
                        description: metadata.description || '',
                        coverUrl: coverUrl
                    }
                };
                
                processedBooks.push(bookInfo);
                console.log('📚 元数据解析完成:', bookInfo.metadata.title);
                
            } catch (parseError) {
                console.error('📚 解析文件失败:', file.name, parseError);
                showMessage(`解析文件 ${file.name} 失败: ${parseError.message}`, 'error');
            }
        }
        
        if (processedBooks.length === 0) {
            throw new Error('没有成功解析的EPUB文件');
        }
        
        // 第二步：上传到后端
        console.log('📚 上传文件到后端...');
        const formData = new FormData();
        
        // 添加文件和元数据
        processedBooks.forEach((bookInfo, index) => {
            formData.append('files', bookInfo.file);
            formData.append(`metadata_${index}`, JSON.stringify(bookInfo.metadata));
        });
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`上传失败: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📚 后端响应:', result);
        
        if (result.success) {
            // 第三步：添加到本地书架（使用前端解析的元数据）
            for (let i = 0; i < result.books.length; i++) {
                const serverBook = result.books[i];
                const localBook = processedBooks[i];
                
                importedBooks.push({
                    id: serverBook.id,
                    name: localBook.filename,
                    metadata: localBook.metadata, // 使用前端解析的完整元数据
                    addedDate: new Date().toISOString(),
                    size: localBook.file.size,
                    type: 'imported'
                });
            }
            
            // 保存到本地存储
            saveBooksToStorage();
            
            // 重新渲染（现在会显示真实的书名、作者）
            renderBooks();
            
            // 显示成功消息
            showMessage(`成功添加 ${result.books.length} 本书籍到书架`, 'success');
        } else {
            throw new Error(result.message || '上传失败');
        }
        
    } catch (error) {
        console.error('📚 文件处理失败:', error);
        showMessage(`文件处理失败: ${error.message}`, 'error');
    } finally {
        // 隐藏加载提示
        hideLoading();
        
        // 清空文件选择器
        event.target.value = '';
    }
}

// 生成书籍ID
function generateBookId() {
    return 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 打开预设书籍
async function openBook(fileName) {
    console.log('📚 打开预设书籍:', fileName);

    // 显示加载提示
    showLoading();

    try {
        // 使用BookManager处理预设文件
        const bookInfo = await window.BookManager.processPresetFile(fileName);

        // 添加到最近阅读
        addToRecentBooks({
            name: bookInfo.metadata.title || getBookDisplayName(fileName),
            id: bookInfo.id,
            type: 'preset',
            lastRead: new Date().toISOString()
        });

        // 跳转到阅读器页面（使用简洁的路由）
        setTimeout(() => {
            window.location.href = `/book/${encodeURIComponent(bookInfo.id)}`;
        }, 500);

    } catch (error) {
        hideLoading();
        console.error('打开预设书籍失败:', error);
        showMessage(`无法打开书籍: ${error.message}`, 'error');
    }
}

// 打开导入的书籍
function openImportedBook(bookData) {
    console.log('📚 打开导入书籍:', bookData.name);

    // 显示加载提示
    showLoading();

    // 添加到最近阅读
    addToRecentBooks({
        name: bookData.title || bookData.name,
        id: bookData.id,
        type: 'imported',
        lastRead: new Date().toISOString()
    });

    // 跳转到阅读器页面（使用简洁的路由）
    setTimeout(() => {
        window.location.href = `/book/${encodeURIComponent(bookData.id)}`;
    }, 500);
}

// 获取书籍显示名称
function getBookDisplayName(fileName) {
    const nameMap = {
        'mittukann.epub': '三日間の幸福',
        'noruwei.epub': 'ノルウェーの森'
    };
    return nameMap[fileName] || fileName.replace('.epub', '');
}

// 添加到最近阅读
function addToRecentBooks(bookInfo) {
    // 移除已存在的相同书籍
    recentBooks = recentBooks.filter(book => {
        if (bookInfo.type === 'preset') {
            return book.fileName !== bookInfo.fileName;
        } else {
            return book.id !== bookInfo.id;
        }
    });

    // 添加到开头
    recentBooks.unshift(bookInfo);

    // 限制最近阅读数量
    if (recentBooks.length > 5) {
        recentBooks = recentBooks.slice(0, 5);
    }

    // 保存到本地存储
    localStorage.setItem('recentBooks', JSON.stringify(recentBooks));

    // 重新渲染
    renderRecentBooks();
}

// 渲染书籍列表
function renderBooks() {
    const booksGrid = document.getElementById('booksGrid');
    if (!booksGrid) return;

    // 清空现有内容
    booksGrid.innerHTML = '';

    // 添加预设书籍
    const presetBook = createPresetBookCard();
    booksGrid.appendChild(presetBook);

    // 添加导入的书籍
    importedBooks.forEach(book => {
        const bookCard = createImportedBookCard(book);
        booksGrid.appendChild(bookCard);
    });
}

// 创建预设书籍卡片
function createPresetBookCard() {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.dataset.file = 'mittukann.epub';

    bookCard.innerHTML = `
        <div class="book-cover">
            <div class="book-cover-placeholder">📘</div>
        </div>
        <div class="book-info">
            <h3 class="book-title">三日間の幸福</h3>
            <p class="book-author">三秋縋</p>
            <p class="book-language">🇯🇵 日文</p>
        </div>
    `;

    return bookCard;
}

// 创建导入书籍卡片
function createImportedBookCard(book) {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.dataset.bookData = JSON.stringify(book);

    // 使用真实的元数据
    const title = book.metadata?.title || book.name.replace('.epub', '');
    const author = book.metadata?.creator || '未知作者';
    const language = getLanguageDisplay(book.metadata?.language);

    // 检查是否有封面
    const coverContent = book.metadata?.coverUrl
        ? `<img src="${book.metadata.coverUrl}" alt="封面" />`
        : '<div class="book-cover-placeholder">📖</div>';

    bookCard.innerHTML = `
        <div class="book-cover">
            ${coverContent}
        </div>
        <div class="book-info">
            <h3 class="book-title">${escapeHtml(title)}</h3>
            <p class="book-author">${escapeHtml(author)}</p>
            <p class="book-language">${language}</p>
        </div>
    `;

    return bookCard;
}

// 获取语言显示文本
function getLanguageDisplay(languageCode) {
    const languageMap = {
        'ja': '🇯🇵 日文',
        'zh': '🇨🇳 中文',
        'zh-cn': '🇨🇳 中文',
        'zh-tw': '🇹🇼 繁体中文',
        'ko': '🇰🇷 韩文',
        'en': '🇺🇸 英文',
        'fr': '🇫🇷 法文',
        'de': '🇩🇪 德文',
        'es': '🇪🇸 西班牙文',
        'it': '🇮🇹 意大利文',
        'ru': '🇷🇺 俄文'
    };

    if (!languageCode) return '🌍 未知';

    const lang = languageCode.toLowerCase();
    return languageMap[lang] || `🌍 ${languageCode}`;
}

// 从文件名检测语言
function detectLanguageFromFileName(fileName) {
    const name = fileName.toLowerCase();

    if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(fileName)) {
        return '🇯🇵 日文';
    } else if (/[\u4e00-\u9fff]/.test(fileName)) {
        return '🇨🇳 中文';
    } else if (/[\uac00-\ud7af]/.test(fileName)) {
        return '🇰🇷 韩文';
    } else {
        return '🌍 其他';
    }
}

// 渲染最近阅读
function renderRecentBooks() {
    const recentBooksContainer = document.getElementById('recentBooks');
    if (!recentBooksContainer) return;

    if (recentBooks.length === 0) {
        recentBooksContainer.innerHTML = '<p class="empty-message">暂无最近阅读的书籍</p>';
        return;
    }

    recentBooksContainer.innerHTML = '';

    recentBooks.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';

        if (book.type === 'preset') {
            bookCard.dataset.file = book.fileName;
        } else {
            // 查找对应的导入书籍数据
            const importedBook = importedBooks.find(b => b.id === book.id);
            if (importedBook) {
                bookCard.dataset.bookData = JSON.stringify(importedBook);
            }
        }

        const lastReadDate = new Date(book.lastRead).toLocaleDateString();

        bookCard.innerHTML = `
            <div class="book-cover">
                <div class="book-cover-placeholder">📖</div>
            </div>
            <div class="book-info">
                <h3 class="book-title">${escapeHtml(book.name)}</h3>
                <p class="book-author">最后阅读: ${lastReadDate}</p>
                <p class="book-language">${book.type === 'preset' ? '🇯🇵 日文' : '📁 导入'}</p>
            </div>
        `;

        recentBooksContainer.appendChild(bookCard);
    });
}

// 保存书籍到本地存储
function saveBooksToStorage() {
    try {
        // 只保存书籍元数据，不保存文件对象
        const booksToSave = importedBooks.map(book => ({
            id: book.id,
            name: book.name,
            addedDate: book.addedDate,
            size: book.size,
            type: book.type
        }));

        localStorage.setItem('importedBooks', JSON.stringify(booksToSave));
        console.log('📚 书籍数据已保存到本地存储');
    } catch (error) {
        console.error('保存书籍数据失败:', error);
    }
}

// 从本地存储加载书籍
function loadBooksFromStorage() {
    try {
        // 加载导入的书籍元数据
        const savedBooks = localStorage.getItem('importedBooks');
        if (savedBooks) {
            const booksData = JSON.parse(savedBooks);
            importedBooks = booksData.map(book => ({
                ...book,
                file: null // 文件对象无法持久化，需要用户重新选择
            }));
            console.log(`📚 从本地存储加载了 ${importedBooks.length} 本书籍`);
        }

        // 加载最近阅读
        const savedRecent = localStorage.getItem('recentBooks');
        if (savedRecent) {
            recentBooks = JSON.parse(savedRecent);
            console.log(`📚 从本地存储加载了 ${recentBooks.length} 条最近阅读记录`);
        }
    } catch (error) {
        console.error('加载书籍数据失败:', error);
        importedBooks = [];
        recentBooks = [];
    }
}

// 清理无效的书籍数据（向后端验证bookId）
async function cleanupInvalidBooks() {
    console.log('📚 开始清理无效的书籍数据...');
    
    if (importedBooks.length === 0) {
        console.log('📚 没有导入的书籍需要验证');
        return;
    }
    
    let cleanedCount = 0;
    const validBooks = [];
    
    // 向后端验证每个bookId是否还存在
    for (const book of importedBooks) {
        try {
            console.log('📚 验证书籍:', book.name, book.id);
            
            // 发送HEAD请求检查bookId是否存在
            const response = await fetch(`/api/book/${encodeURIComponent(book.id)}`, {
                method: 'HEAD'
            });
            
            if (response.ok) {
                // bookId有效，保留
                validBooks.push(book);
                console.log('📚 书籍有效:', book.name);
            } else {
                // bookId无效，清理
                console.log('📚 清理无效书籍:', book.name, `(${response.status})`);
                cleanedCount++;
            }
            
        } catch (error) {
            // 网络错误或其他问题，也清理掉
            console.log('📚 清理无法验证的书籍:', book.name, error.message);
            cleanedCount++;
        }
    }
    
    // 清理最近阅读记录中的无效项目
    const validRecentBooks = recentBooks.filter(recentBook => {
        if (recentBook.type === 'preset') {
            // 预设书籍保留
            return true;
        } else if (recentBook.type === 'imported') {
            // 检查对应的导入书籍是否还有效
            const bookExists = validBooks.some(book => book.id === recentBook.id);
            if (!bookExists) {
                console.log('📚 清理无效的最近阅读记录:', recentBook.name);
                cleanedCount++;
                return false;
            }
            return true;
        }
        return false;
    });

    // 更新数据
    importedBooks = validBooks;
    recentBooks = validRecentBooks;

    // 保存清理后的数据
    saveBooksToStorage();
    localStorage.setItem('recentBooks', JSON.stringify(recentBooks));

    // 重新渲染页面
    renderBooks();
    renderRecentBooks();

    console.log(`📚 清理完成，共清理了 ${cleanedCount} 个无效项目`);
    
    if (cleanedCount > 0) {
        showMessage(`已自动清理 ${cleanedCount} 个失效的书籍记录`, 'success');
    }
}

// 显示加载提示
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('show');
    }
}

// 隐藏加载提示
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
    }
}

// 显示消息
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;

    const container = document.querySelector('.bookshelf-container');
    container.insertBefore(messageDiv, container.firstChild);

    // 3秒后自动移除
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initBookshelf);

// 导出函数供其他页面使用
window.Bookshelf = {
    addToRecentBooks,
    getBookDisplayName
};