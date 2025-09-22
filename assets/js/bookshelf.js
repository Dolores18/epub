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

    // 临时：强制清理本地存储（因为后端数据已清空）
    console.log('📚 强制清理本地存储...');
    localStorage.removeItem('importedBooks');
    localStorage.removeItem('recentBooks');
    localStorage.removeItem('bookManager_books');

    // 确保加载提示是隐藏的
    hideLoading();

    // 设置事件监听器
    setupEventListeners();

    // 从后端加载书籍数据
    await loadBooksFromServer();

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

    // 异步提取缺失的封面
    setTimeout(async () => {
        try {
            await extractMissingCovers();
        } catch (error) {
            console.error('📚 提取封面时出错:', error);
        }
    }, 2000); // 延迟2秒，让页面完全加载

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
                let coverBlob = null;
                try {
                    coverUrl = await book.coverUrl();
                    if (coverUrl) {
                        // 将封面转换为blob以便上传
                        const response = await fetch(coverUrl);
                        coverBlob = await response.blob();
                        console.log('📚 封面获取成功:', coverBlob.size, 'bytes');
                    }
                } catch (coverError) {
                    console.warn('获取封面失败:', coverError);
                }
                
                const bookInfo = {
                    file: file,
                    filename: file.name,
                    coverBlob: coverBlob, // 添加封面blob
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
        
        // 添加文件、元数据和封面
        processedBooks.forEach((bookInfo, index) => {
            formData.append('files', bookInfo.file);
            formData.append(`metadata_${index}`, JSON.stringify(bookInfo.metadata));
            
            // 如果有封面，添加封面文件
            if (bookInfo.coverBlob) {
                formData.append(`cover_${index}`, bookInfo.coverBlob, `cover_${index}.jpg`);
            }
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
            // 显示成功消息
            showMessage(`成功添加 ${result.books.length} 本书籍到书架`, 'success');
            
            // 重新从服务器加载数据
            await loadBooksFromServer();
            
            // 重新渲染（现在会显示真实的书名、作者）
            renderBooks();
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
            hideLoading(); // 跳转前隐藏加载提示
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
        name: bookData.metadata?.title || bookData.name,
        id: bookData.id,
        type: 'imported',
        lastRead: new Date().toISOString()
    });

    // 跳转到阅读器页面（使用简洁的路由）
    setTimeout(() => {
        hideLoading(); // 跳转前隐藏加载提示
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
        <div class="book-card-menu" onclick="toggleBookMenu(event, '${book.id}')">
            <div class="book-card-menu-icon">⋮</div>
            <div class="book-card-dropdown" id="menu-${book.id}">
                <button class="book-card-dropdown-item delete" onclick="deleteBook(event, '${book.id}', '${escapeHtml(title)}')">
                    🗑️ 删除书籍
                </button>
            </div>
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

        // 获取书籍的真实信息
        let displayTitle = book.name;
        let displayAuthor = '最后阅读: ' + lastReadDate;
        let coverContent = '<div class="book-cover-placeholder">📖</div>';
        
        if (book.type === 'preset') {
            // 预设书籍使用固定信息
            displayTitle = getBookDisplayName(book.fileName || book.name);
            coverContent = '<div class="book-cover-placeholder">📘</div>';
        } else {
            // 导入书籍查找真实信息
            const importedBook = importedBooks.find(b => b.id === book.id);
            if (importedBook) {
                displayTitle = importedBook.metadata?.title || importedBook.name;
                displayAuthor = importedBook.metadata?.creator || '未知作者';
                
                if (importedBook.metadata?.coverUrl) {
                    coverContent = `<img src="${importedBook.metadata.coverUrl}" alt="封面" />`;
                }
            }
        }

        bookCard.innerHTML = `
            <div class="book-cover">
                ${coverContent}
            </div>
            <div class="book-info">
                <h3 class="book-title">${escapeHtml(displayTitle)}</h3>
                <p class="book-author">${escapeHtml(displayAuthor)}</p>
                <p class="book-language">最后阅读: ${lastReadDate}</p>
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

// 从服务器加载书籍数据
async function loadBooksFromServer() {
    try {
        console.log('📚 从服务器加载书籍数据...');
        
        const response = await fetch('/api/books');
        if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success) {
            // 转换服务器数据格式为前端格式
            importedBooks = result.books.map(book => ({
                id: book.id,
                name: book.filename,
                metadata: {
                    title: book.title,
                    creator: book.author,
                    language: book.language,
                    publisher: book.publisher,
                    description: book.description,
                    identifier: book.identifier,
                    coverUrl: book.coverUrl  // 使用服务器提供的封面URL
                },
                addedDate: book.addedDate,
                size: book.fileSize,
                type: 'imported'
            }));
            
            console.log(`📚 从服务器加载了 ${importedBooks.length} 本书籍`);
            
            // 如果服务器没有书籍，清理本地存储的无效数据
            if (importedBooks.length === 0) {
                console.log('📚 服务器无书籍数据，清理本地存储...');
                localStorage.removeItem('importedBooks');
                localStorage.removeItem('recentBooks');
                recentBooks = [];
            }
        } else {
            console.warn('服务器返回失败响应:', result);
            importedBooks = [];
        }
        
        // 加载最近阅读（仍从本地存储加载）
        if (importedBooks.length > 0) {
            const savedRecent = localStorage.getItem('recentBooks');
            if (savedRecent) {
                recentBooks = JSON.parse(savedRecent);
                console.log(`📚 从本地存储加载了 ${recentBooks.length} 条最近阅读记录`);
            }
        }
        
    } catch (error) {
        console.error('从服务器加载书籍数据失败:', error);
        console.log('📚 尝试从本地存储加载...');
        
        // 降级到本地存储
        loadBooksFromLocalStorage();
    }
}

// 从本地存储加载书籍（降级方案）
function loadBooksFromLocalStorage() {
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

// 提取缺失的封面
async function extractMissingCovers() {
    console.log('📸 开始检查并提取缺失的封面...');
    
    // 找出没有封面的书籍
    const booksWithoutCover = importedBooks.filter(book => !book.metadata?.coverUrl);
    
    if (booksWithoutCover.length === 0) {
        console.log('📸 所有书籍都有封面，无需提取');
        return;
    }
    
    console.log(`📸 发现 ${booksWithoutCover.length} 本书籍缺少封面，开始提取...`);
    
    // 显示提取进度提示
    showMessage(`正在为 ${booksWithoutCover.length} 本书籍提取封面...`, 'info');
    
    let extractedCount = 0;
    
    for (const book of booksWithoutCover) {
        try {
            console.log(`📸 正在为 "${book.metadata.title}" 提取封面...`);
            
            // 从服务器下载EPUB文件
            const response = await fetch(`/api/book/${encodeURIComponent(book.id)}`);
            if (!response.ok) {
                console.warn(`📸 无法下载书籍文件: ${book.id}`);
                continue;
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            // 使用epub.js解析封面
            const epubBook = ePub(arrayBuffer);
            await epubBook.ready;
            
            let coverUrl = null;
            try {
                coverUrl = await epubBook.coverUrl();
            } catch (coverError) {
                console.warn(`📸 无法提取封面: ${book.metadata.title}`, coverError);
                continue;
            }
            
            if (!coverUrl) {
                console.warn(`📸 书籍无封面: ${book.metadata.title}`);
                continue;
            }
            
            // 将封面转换为blob
            const coverResponse = await fetch(coverUrl);
            const coverBlob = await coverResponse.blob();
            
            // 上传封面到服务器
            const formData = new FormData();
            formData.append('bookId', book.id);
            formData.append('cover', coverBlob, `${book.id}_cover.jpg`);
            
            const uploadResponse = await fetch('/api/upload-cover', {
                method: 'POST',
                body: formData
            });
            
            if (uploadResponse.ok) {
                const result = await uploadResponse.json();
                console.log(`📸 封面提取成功: ${book.metadata.title}`);
                
                // 更新本地数据
                book.metadata.coverUrl = result.coverUrl;
                
                // 重新渲染书籍卡片和最近阅读
                renderBooks();
                renderRecentBooks();
                
                extractedCount++;
            } else {
                console.warn(`📸 封面上传失败: ${book.metadata.title}`);
            }
            
            // 释放资源
            URL.revokeObjectURL(coverUrl);
            
            // 添加延迟，避免过于频繁的请求
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`📸 处理书籍封面失败: ${book.metadata.title}`, error);
        }
    }
    
    console.log('📸 封面提取完成');
    
    // 显示完成提示
    if (extractedCount > 0) {
        showMessage(`成功为 ${extractedCount} 本书籍提取了封面`, 'success');
    }
}



// 汉堡菜单控制函数
function toggleBookMenu(event, bookId) {
    event.stopPropagation(); // 防止触发书籍卡片的点击事件
    
    const menu = document.getElementById(`menu-${bookId}`);
    const allMenus = document.querySelectorAll('.book-card-dropdown');
    
    // 关闭所有其他菜单
    allMenus.forEach(m => {
        if (m !== menu) {
            m.classList.remove('show');
        }
    });
    
    // 切换当前菜单
    menu.classList.toggle('show');
}

// 删除书籍函数
async function deleteBook(event, bookId, bookTitle) {
    event.stopPropagation(); // 防止事件冒泡
    
    // 确认对话框
    if (!confirm(`确定要删除《${bookTitle}》吗？\n\n此操作将永久删除书籍文件和相关数据，无法恢复。`)) {
        return;
    }
    
    try {
        console.log(`🗑️ 开始删除书籍: ${bookId} - ${bookTitle}`);
        
        // 显示加载状态
        showLoading('正在删除书籍...');
        
        // 调用后端API删除书籍（使用POST方法）
        const response = await fetch('/api/delete-book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookId: bookId
            })
        });
        
        if (!response.ok) {
            throw new Error(`删除失败: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('🗑️ 删除响应:', result);
        
        if (result.success) {
            // 从本地数据中移除
            importedBooks = importedBooks.filter(book => book.id !== bookId);
            
            // 从最近阅读中移除
            recentBooks = recentBooks.filter(book => book.id !== bookId);
            
            // 保存更新后的数据
            saveBooksToStorage();
            
            // 重新渲染书籍列表
            renderBooks();
            renderRecentBooks();
            
            // 显示成功消息
            showSuccessMessage(`《${bookTitle}》删除成功`);
            
            console.log(`✅ 书籍删除成功: ${bookTitle}`);
        } else {
            throw new Error(result.message || '删除失败');
        }
        
    } catch (error) {
        console.error('❌ 删除书籍失败:', error);
        alert(`删除书籍失败：${error.message}`);
    } finally {
        hideLoading();
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    // 创建成功提示元素
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideInRight 0.3s ease;
    `;
    successDiv.textContent = message;
    
    // 添加到页面
    document.body.appendChild(successDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 300);
    }, 3000);
}

// 点击其他地方关闭菜单
document.addEventListener('click', function(event) {
    if (!event.target.closest('.book-card-menu')) {
        const allMenus = document.querySelectorAll('.book-card-dropdown');
        allMenus.forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// 导出函数供其他页面使用
window.Bookshelf = {
    addToRecentBooks,
    getBookDisplayName,
    toggleBookMenu,
    deleteBook
};