/**
 * 书籍管理器
 * 统一处理EPUB文件的解析、缓存和管理
 */

console.log('📚 书籍管理器已加载');

// 测试epub.js是否加载
console.log('📚 检查epub.js加载状态:', typeof ePub);
if (typeof ePub === 'undefined') {
    console.error('❌ epub.js未加载！');
} else {
    console.log('✅ epub.js已正确加载');
}

class BookManager {
    constructor() {
        this.bookCache = new Map(); // book对象缓存
        this.metadataCache = new Map(); // 元数据缓存
        this.fileCache = new Map(); // 文件对象缓存（当前会话）
    }

    /**
     * 处理EPUB文件导入
     * @param {File} file - EPUB文件对象
     * @returns {Promise<Object>} 书籍信息
     */
    async processEpubFile(file) {
        console.log('📚 开始处理EPUB文件:', file.name);

        try {
            // 检查epub.js是否加载
            if (typeof ePub === 'undefined') {
                throw new Error('epub.js库未加载，请检查脚本引用');
            }
            console.log('📚 epub.js库已加载');

            // 验证文件
            console.log('📚 验证文件...');
            this.validateEpubFile(file);

            // 生成书籍ID
            console.log('📚 生成书籍ID...');
            const bookId = this.generateBookId(file);

            // 创建文件URL
            console.log('📚 创建文件URL...');
            const fileUrl = URL.createObjectURL(file);
            console.log('📚 文件URL:', fileUrl);

            // 创建epub.js book对象
            console.log('📚 创建epub.js book对象...');
            const book = ePub(fileUrl);
            console.log('📚 book对象创建成功:', book);
            console.log('📚 book.ready状态:', book.ready);

            // 等待书籍准备完成（添加超时处理和更详细的日志）
            console.log('📚 等待书籍准备完成...');
            
            try {
                const readyPromise = book.ready;
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        console.error('📚 书籍加载超时！');
                        reject(new Error('书籍加载超时，请检查文件格式'));
                    }, 15000);
                });

                // 添加进度监听
                book.ready.then(() => {
                    console.log('📚 book.ready Promise resolved');
                }).catch(error => {
                    console.error('📚 book.ready Promise rejected:', error);
                });

                // 添加更详细的状态监听
                console.log('📚 开始等待，当前时间:', new Date().toLocaleTimeString());
                
                // 定期检查状态
                const statusInterval = setInterval(() => {
                    console.log('📚 等待中... book.isOpen:', book.isOpen, 'opened状态:', book.opened);
                }, 2000);

                try {
                    await Promise.race([readyPromise, timeoutPromise]);
                    clearInterval(statusInterval);
                    console.log('📚 书籍准备完成');
                } catch (error) {
                    clearInterval(statusInterval);
                    throw error;
                }
                
            } catch (readyError) {
                console.error('📚 等待书籍准备时出错:', readyError);
                throw readyError;
            }

            // 提取元数据
            console.log('📚 提取元数据...');
            let metadata;
            try {
                metadata = await this.extractMetadata(book);
                console.log('📚 元数据提取完成:', metadata);
            } catch (metadataError) {
                console.warn('📚 元数据提取失败，使用默认值:', metadataError);
                metadata = {
                    title: file.name.replace('.epub', ''),
                    creator: '未知作者',
                    language: 'unknown',
                    publisher: '未知出版商',
                    identifier: '',
                    description: '',
                    coverUrl: null,
                    rights: '',
                    date: ''
                };
            }

            // 创建书籍信息对象
            const bookInfo = {
                id: bookId,
                fileName: file.name,
                fileSize: file.size,
                fileUrl: fileUrl,
                metadata: metadata,
                addedDate: new Date().toISOString(),
                type: 'imported'
            };

            // 缓存数据（只在当前会话中缓存book对象）
            this.bookCache.set(bookId, book);
            this.metadataCache.set(bookId, bookInfo);
            this.fileCache.set(bookId, file);
            
            // 将文件URL存储到sessionStorage，供阅读器页面使用
            sessionStorage.setItem(`book_${bookId}_url`, fileUrl);
            sessionStorage.setItem(`book_${bookId}_metadata`, JSON.stringify(bookInfo));

            console.log('📚 EPUB文件处理完成:', bookInfo);
            return bookInfo;

        } catch (error) {
            console.error('📚 EPUB文件处理失败:', error);
            throw new Error(`处理EPUB文件失败: ${error.message}`);
        }
    }

    /**
     * 验证EPUB文件
     * @param {File} file - 文件对象
     */
    validateEpubFile(file) {
        if (!file) {
            throw new Error('文件不能为空');
        }

        if (!(file instanceof File)) {
            throw new Error('必须是File对象');
        }

        if (!file.name.toLowerCase().endsWith('.epub')) {
            throw new Error('文件必须是.epub格式');
        }

        if (file.size === 0) {
            throw new Error('文件不能为空');
        }

        if (file.size > 100 * 1024 * 1024) { // 100MB限制
            throw new Error('文件大小不能超过100MB');
        }
    }

    /**
     * 提取EPUB元数据
     * @param {Object} book - epub.js book对象
     * @returns {Promise<Object>} 元数据
     */
    async extractMetadata(book) {
        try {
            const metadata = book.package.metadata;
            
            // 尝试获取封面
            let coverUrl = null;
            try {
                const cover = await book.coverUrl();
                if (cover) {
                    coverUrl = cover;
                }
            } catch (coverError) {
                console.warn('获取封面失败:', coverError);
            }

            return {
                title: metadata.title || '未知标题',
                creator: metadata.creator || '未知作者',
                language: metadata.language || 'unknown',
                publisher: metadata.publisher || '未知出版商',
                identifier: metadata.identifier || '',
                description: metadata.description || '',
                coverUrl: coverUrl,
                rights: metadata.rights || '',
                date: metadata.date || ''
            };
        } catch (error) {
            console.warn('提取元数据失败:', error);
            return {
                title: '未知标题',
                creator: '未知作者',
                language: 'unknown',
                publisher: '未知出版商',
                identifier: '',
                description: '',
                coverUrl: null,
                rights: '',
                date: ''
            };
        }
    }

    /**
     * 生成书籍ID
     * @param {File} file - 文件对象
     * @returns {string} 书籍ID
     */
    generateBookId(file) {
        // 基于文件名和大小生成相对稳定的ID
        const hash = this.simpleHash(file.name + file.size + file.lastModified);
        return `book_${hash}_${Date.now()}`;
    }

    /**
     * 简单哈希函数
     * @param {string} str - 输入字符串
     * @returns {string} 哈希值
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 获取书籍对象
     * @param {string} bookId - 书籍ID
     * @returns {Object|null} book对象
     */
    getBook(bookId) {
        return this.bookCache.get(bookId) || null;
    }

    /**
     * 获取书籍元数据
     * @param {string} bookId - 书籍ID
     * @returns {Object|null} 元数据
     */
    getBookMetadata(bookId) {
        return this.metadataCache.get(bookId) || null;
    }

    /**
     * 获取所有书籍元数据
     * @returns {Array} 书籍列表
     */
    getAllBooks() {
        return Array.from(this.metadataCache.values());
    }

    /**
     * 删除书籍
     * @param {string} bookId - 书籍ID
     */
    removeBook(bookId) {
        const bookInfo = this.metadataCache.get(bookId);
        
        if (bookInfo && bookInfo.fileUrl) {
            // 释放文件URL
            URL.revokeObjectURL(bookInfo.fileUrl);
        }

        // 清除缓存
        this.bookCache.delete(bookId);
        this.metadataCache.delete(bookId);
        this.fileCache.delete(bookId);

        console.log('📚 已删除书籍:', bookId);
    }

    /**
     * 清理所有缓存
     */
    clearCache() {
        // 释放所有文件URL
        for (const bookInfo of this.metadataCache.values()) {
            if (bookInfo.fileUrl) {
                URL.revokeObjectURL(bookInfo.fileUrl);
            }
        }

        // 清空缓存
        this.bookCache.clear();
        this.metadataCache.clear();
        this.fileCache.clear();

        console.log('📚 已清理所有缓存');
    }

    /**
     * 处理预设文件
     * @param {string} fileName - 文件名
     * @returns {Promise<Object>} 书籍信息
     */
    async processPresetFile(fileName) {
        console.log('📚 处理预设文件:', fileName);

        try {
            // 检查是否已缓存
            const existingId = `preset_${fileName}`;
            if (this.bookCache.has(existingId)) {
                return this.metadataCache.get(existingId);
            }

            // 获取文件
            const response = await fetch(fileName);
            if (!response.ok) {
                throw new Error(`文件不存在: ${fileName}`);
            }

            const blob = await response.blob();
            const file = new File([blob], fileName, { type: 'application/epub+zip' });

            // 创建book对象
            const fileUrl = URL.createObjectURL(file);
            const book = ePub(fileUrl);
            await book.ready;

            // 提取元数据
            const metadata = await this.extractMetadata(book);

            // 创建书籍信息
            const bookInfo = {
                id: existingId,
                fileName: fileName,
                fileSize: blob.size,
                fileUrl: fileUrl,
                metadata: metadata,
                addedDate: new Date().toISOString(),
                type: 'preset'
            };

            // 缓存数据
            this.bookCache.set(existingId, book);
            this.metadataCache.set(existingId, bookInfo);

            console.log('📚 预设文件处理完成:', bookInfo);
            return bookInfo;

        } catch (error) {
            console.error('📚 预设文件处理失败:', error);
            throw new Error(`处理预设文件失败: ${error.message}`);
        }
    }

    /**
     * 保存书籍元数据到本地存储
     */
    saveToStorage() {
        try {
            const booksToSave = [];
            
            for (const bookInfo of this.metadataCache.values()) {
                if (bookInfo.type === 'imported') {
                    // 只保存导入书籍的元数据，不保存文件URL
                    booksToSave.push({
                        id: bookInfo.id,
                        fileName: bookInfo.fileName,
                        fileSize: bookInfo.fileSize,
                        metadata: bookInfo.metadata,
                        addedDate: bookInfo.addedDate,
                        type: bookInfo.type
                    });
                }
            }

            localStorage.setItem('bookManager_books', JSON.stringify(booksToSave));
            console.log('📚 书籍元数据已保存到本地存储');
        } catch (error) {
            console.error('保存书籍元数据失败:', error);
        }
    }

    /**
     * 从本地存储加载书籍元数据
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('bookManager_books');
            if (saved) {
                const books = JSON.parse(saved);
                
                for (const bookInfo of books) {
                    // 只恢复元数据，book对象需要重新创建
                    this.metadataCache.set(bookInfo.id, {
                        ...bookInfo,
                        fileUrl: null // 文件URL无法持久化
                    });
                }

                console.log(`📚 从本地存储加载了 ${books.length} 本书籍的元数据`);
            }
        } catch (error) {
            console.error('加载书籍元数据失败:', error);
        }
    }
}

// 创建全局实例
const bookManager = new BookManager();

// 页面卸载时保存数据
window.addEventListener('beforeunload', () => {
    bookManager.saveToStorage();
});

// 导出全局实例
window.BookManager = bookManager;

console.log('📚 书籍管理器初始化完成');