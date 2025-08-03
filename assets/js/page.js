/**
 * Page Progress Manager
 * 页面进度管理器 - 使用对象封装避免全局变量污染
 */

console.log('📄 Page Progress Manager 已加载');

// 进度管理器对象
const ProgressManager = {
    book: null,
    currentLocation: null,
    isDragging: false,
    isJumping: false,
    targetPercentage: null,
    jumpTimer: null,
    previewTimer: null,
    saveProgressTimer: null,
    lastDragTime: 0,
    lastPreviewPercentage: null,

    // 设置book对象
    setBook(book) {
        console.log('📄 ProgressManager.setBook被调用:', book);
        this.book = book;
        console.log('📄 book对象已设置，locations总数:', book && book.locations ? book.locations.total : '无locations');

        // 设置book后立即初始化进度条拖拽和退出按钮
        this.initProgressBarDrag();
        this.initExitButton();
        
        // 不在这里恢复进度，等待rendition准备好后再调用
        console.log('📄 等待rendition准备完成后恢复阅读进度');
    },

    // 更新当前位置并刷新进度
    updateLocation(location) {
        console.log('📄 ProgressManager.updateLocation被调用:', location.start.cfi);
        this.currentLocation = location;
        this.updateProgress();
        
        // 移除自动保存逻辑，只在退出时手动保存
        console.log('📄 位置已更新，但不自动保存（只在退出时保存）');
    },

    // 更新进度显示
    updateProgress() {
        // 如果正在拖拽或跳转中，跳过自动更新
        if (this.isDragging) {
            console.log('📄 正在拖拽中，跳过自动进度更新');
            return;
        }

        if (this.isJumping) {
            console.log('📄 正在跳转中，跳过自动进度更新');
            return;
        }

        if (this.currentLocation && this.book && this.book.locations) {
            try {
                const cfi = this.currentLocation.start.cfi;
                const progress = this.book.locations.percentageFromCfi(cfi);

                // 调试进度跳跃问题
                const locationIndex = this.book.locations.locationFromCfi(cfi);
                console.log('📄 [进度调试] CFI:', cfi);
                console.log('📄 [进度调试] 位置索引:', locationIndex, '/', this.book.locations.total);
                console.log('📄 [进度调试] 原始进度:', progress);
                console.log('📄 [进度调试] 百分比:', Math.round((progress || 0) * 100) + '%');

                const progressBar = document.getElementById('progressBar');
                const progressText = document.getElementById('progressText');

                console.log('📄 progressBar元素:', progressBar);
                console.log('📄 progressText元素:', progressText);

                if (progressBar && progressText) {
                    const percentage = Math.round(progress * 100);
                    progressBar.style.width = percentage + '%';
                    progressText.textContent = percentage + '%';
                    console.log('📄 进度更新成功 - 宽度:', percentage + '%', '文本:', percentage + '%');
                } else {
                    console.warn('📄 找不到进度显示元素');
                }
            } catch (error) {
                console.error('📄 进度计算失败:', error);
                console.error('📄 错误详情:', error.stack);
            }
        } else {
            console.warn('📄 缺少必要数据，无法计算进度');
        }
    },

    // 更新页面信息
    updatePageInfo() {
        console.log('📄 页面信息已更新');
    },

    // 初始化进度条拖拽功能
    initProgressBarDrag() {
        console.log('📄 初始化进度条拖拽功能');

        const progressContainer = document.querySelector('.progress');
        const progressBar = document.getElementById('progressBar');

        if (!progressContainer || !progressBar) {
            console.warn('📄 找不到进度条元素，无法初始化拖拽功能');
            return;
        }

        let isDragging = false;

        // 鼠标按下事件
        const handleMouseDown = (e) => {
            if (!this.book || !this.book.locations) {
                console.warn('📄 书籍或位置信息未准备好，无法拖拽');
                return;
            }

            isDragging = true;
            this.isDragging = true;

            console.log('📄 开始拖拽');

            // 添加全局事件监听器
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            // 防止文本选择
            e.preventDefault();
            document.body.style.userSelect = 'none';
        };

        // 鼠标移动事件
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const containerRect = progressContainer.getBoundingClientRect();
            const relativeX = e.clientX - containerRect.left;
            const percentage = Math.max(0, Math.min(1, relativeX / containerRect.width));

            // 更新进度条显示
            progressBar.style.width = (percentage * 100) + '%';
            document.getElementById('progressText').textContent = Math.round(percentage * 100) + '%';

            // 记录最后拖拽时间
            this.lastDragTime = Date.now();

            // 清除之前的定时器
            if (this.jumpTimer) {
                clearTimeout(this.jumpTimer);
                this.jumpTimer = null;
            }
            if (this.previewTimer) {
                clearTimeout(this.previewTimer);
                this.previewTimer = null;
            }

            // 快速预览：如果位置变化超过5%，立即预览
            const percentageDiff = Math.abs(percentage - (this.lastPreviewPercentage || 0));
            if (percentageDiff > 0.05) {
                this.previewTimer = setTimeout(() => {
                    if (isDragging) {
                        console.log('📄 快速预览跳转到:', Math.round(percentage * 100) + '%');
                        this.jumpToProgress(percentage, true); // true表示预览模式
                        this.lastPreviewPercentage = percentage;
                    }
                }, 100); // 100ms快速预览
            }

            // 确认跳转：用户停止拖拽300ms后执行最终跳转
            this.jumpTimer = setTimeout(() => {
                if (isDragging && Date.now() - this.lastDragTime >= 300) {
                    console.log('📄 用户停止拖拽，确认跳转到:', Math.round(percentage * 100) + '%');
                    this.jumpToProgress(percentage, false); // false表示确认模式
                }
            }, 300);

            console.log('📄 拖拽中，进度:', Math.round(percentage * 100) + '%');
        };

        // 鼠标释放事件
        const handleMouseUp = (e) => {
            if (!isDragging) return;

            isDragging = false;
            this.isDragging = false;

            // 计算最终位置
            const containerRect = progressContainer.getBoundingClientRect();
            const relativeX = e.clientX - containerRect.left;
            const percentage = Math.max(0, Math.min(1, relativeX / containerRect.width));

            console.log('📄 拖拽结束，最终进度:', Math.round(percentage * 100) + '%');

            // 清除所有定时器
            if (this.jumpTimer) {
                clearTimeout(this.jumpTimer);
                this.jumpTimer = null;
            }
            if (this.previewTimer) {
                clearTimeout(this.previewTimer);
                this.previewTimer = null;
            }

            // 重置预览位置
            this.lastPreviewPercentage = null;

            // 立即执行最终跳转（用户已经释放鼠标，确定了目标位置）
            this.jumpToProgress(percentage, false);

            // 移除全局事件监听器
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            // 恢复文本选择
            document.body.style.userSelect = '';
        };

        // 直接点击进度条事件
        const handleProgressClick = (e) => {
            if (!this.book || !this.book.locations) {
                console.warn('📄 书籍或位置信息未准备好，无法跳转');
                return;
            }

            const containerRect = progressContainer.getBoundingClientRect();
            const relativeX = e.clientX - containerRect.left;
            const percentage = Math.max(0, Math.min(1, relativeX / containerRect.width));

            console.log('📄 点击进度条，跳转到:', Math.round(percentage * 100) + '%');

            // 更新进度条显示
            progressBar.style.width = (percentage * 100) + '%';
            document.getElementById('progressText').textContent = Math.round(percentage * 100) + '%';

            // 跳转到对应位置
            this.jumpToProgress(percentage);
        };

        // 绑定事件
        progressContainer.addEventListener('mousedown', handleMouseDown);
        progressContainer.addEventListener('click', handleProgressClick);

        // 添加触摸支持（移动端）
        this.initTouchDrag(progressContainer, progressBar);

        console.log('📄 进度条拖拽功能初始化完成');
    },

    // 初始化触摸拖拽支持
    initTouchDrag(progressContainer, progressBar) {
        let isTouching = false;

        const handleTouchStart = (e) => {
            if (!this.book || !this.book.locations) return;

            isTouching = true;
            this.isDragging = true;

            console.log('📄 开始触摸拖拽');
            e.preventDefault();
        };

        const handleTouchMove = (e) => {
            if (!isTouching) return;

            const touch = e.touches[0];
            const containerRect = progressContainer.getBoundingClientRect();
            const relativeX = touch.clientX - containerRect.left;
            const percentage = Math.max(0, Math.min(1, relativeX / containerRect.width));

            // 更新进度条显示
            progressBar.style.width = (percentage * 100) + '%';
            document.getElementById('progressText').textContent = Math.round(percentage * 100) + '%';

            // 记录最后拖拽时间
            this.lastDragTime = Date.now();

            // 清除之前的定时器
            if (this.jumpTimer) {
                clearTimeout(this.jumpTimer);
                this.jumpTimer = null;
            }
            if (this.previewTimer) {
                clearTimeout(this.previewTimer);
                this.previewTimer = null;
            }

            // 快速预览：如果位置变化超过5%，立即预览
            const percentageDiff = Math.abs(percentage - (this.lastPreviewPercentage || 0));
            if (percentageDiff > 0.05) {
                this.previewTimer = setTimeout(() => {
                    if (isTouching) {
                        console.log('📄 快速预览跳转到:', Math.round(percentage * 100) + '%');
                        this.jumpToProgress(percentage, true); // true表示预览模式
                        this.lastPreviewPercentage = percentage;
                    }
                }, 100); // 100ms快速预览
            }

            // 确认跳转：用户停止拖拽300ms后执行最终跳转
            this.jumpTimer = setTimeout(() => {
                if (isTouching && Date.now() - this.lastDragTime >= 300) {
                    console.log('📄 用户停止触摸拖拽，确认跳转到:', Math.round(percentage * 100) + '%');
                    this.jumpToProgress(percentage, false); // false表示确认模式
                }
            }, 300);

            e.preventDefault();
        };

        const handleTouchEnd = (e) => {
            if (!isTouching) return;

            isTouching = false;
            this.isDragging = false;

            const touch = e.changedTouches[0];
            const containerRect = progressContainer.getBoundingClientRect();
            const relativeX = touch.clientX - containerRect.left;
            const percentage = Math.max(0, Math.min(1, relativeX / containerRect.width));

            console.log('📄 触摸拖拽结束，跳转到:', Math.round(percentage * 100) + '%');

            // 清除所有定时器
            if (this.jumpTimer) {
                clearTimeout(this.jumpTimer);
                this.jumpTimer = null;
            }
            if (this.previewTimer) {
                clearTimeout(this.previewTimer);
                this.previewTimer = null;
            }

            // 重置预览位置
            this.lastPreviewPercentage = null;

            // 立即执行最终跳转（用户已经结束触摸，确定了目标位置）
            this.jumpToProgress(percentage, false);

            e.preventDefault();
        };

        // 绑定触摸事件
        progressContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        progressContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        progressContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
    },

    // 跳转到指定进度位置
    jumpToProgress(percentage, isPreview = false) {
        if (!this.book || !this.book.locations) {
            console.error('📄 无法跳转：书籍或位置信息未准备好');
            return;
        }

        // 预览模式下，如果已经在跳转中，跳过
        if (isPreview && this.isJumping) {
            console.log('📄 预览模式：跳过，正在跳转中');
            return;
        }

        // 如果已经在跳转中，取消之前的跳转
        if (this.isJumping && !isPreview) {
            console.log('📄 取消之前的跳转，执行新的跳转');
        }

        try {
            // 设置跳转标志，防止在跳转过程中被relocated事件覆盖
            this.isJumping = true;
            this.targetPercentage = percentage;

            // 计算目标位置
            const totalLocations = this.book.locations.total;
            const targetLocation = Math.floor(percentage * totalLocations);

            const jumpType = isPreview ? '预览' : '确认';
            console.log(`📄 ${jumpType}跳转计算 - 总位置数:`, totalLocations, '目标位置:', targetLocation, '百分比:', percentage);

            // 获取目标位置的CFI
            const targetCfi = this.book.locations.cfiFromLocation(targetLocation);

            if (targetCfi) {
                console.log(`📄 ${jumpType}跳转到CFI:`, targetCfi);

                // 使用全局的rendition对象进行跳转
                if (window.rendition) {
                    window.rendition.display(targetCfi).then(() => {
                        console.log(`📄 ${jumpType}跳转成功`);
                        // 预览模式使用较短的延迟，确认模式使用较长的延迟
                        const delay = isPreview ? 200 : 500;
                        setTimeout(() => {
                            this.isJumping = false;
                            this.targetPercentage = null;
                        }, delay);
                    }).catch((error) => {
                        console.error(`📄 ${jumpType}跳转失败:`, error);
                        this.isJumping = false;
                        this.targetPercentage = null;
                    });
                } else {
                    console.error('📄 找不到rendition对象，无法跳转');
                    this.isJumping = false;
                    this.targetPercentage = null;
                }
            } else {
                console.error('📄 无法获取目标CFI');
                this.isJumping = false;
                this.targetPercentage = null;
            }
        } catch (error) {
            console.error('📄 跳转过程中发生错误:', error);
            this.isJumping = false;
            this.targetPercentage = null;
        }
    },

    // 清理定时器的方法
    clearJumpTimer() {
        if (this.jumpTimer) {
            clearTimeout(this.jumpTimer);
            this.jumpTimer = null;
            console.log('📄 清除跳转定时器');
        }
        if (this.previewTimer) {
            clearTimeout(this.previewTimer);
            this.previewTimer = null;
            console.log('📄 清除预览定时器');
        }
    },

    // 当rendition准备好后调用此方法
    onRenditionReady() {
        console.log('📄 rendition已准备好，500ms后恢复阅读进度');
        // 使用500ms延迟确保book对象和locations都准备好
        setTimeout(() => {
            this.restoreReadingProgress();
        }, 500);
    },

    // 初始化退出按钮
    initExitButton() {
        const exitBtn = document.getElementById('exitBtn');
        if (!exitBtn) {
            console.warn('📄 找不到退出按钮元素');
            return;
        }

        exitBtn.addEventListener('click', () => {
            this.handleExit();
        });

        console.log('📄 退出按钮初始化完成');
    },

    // 处理退出操作
    handleExit() {
        console.log('📄 用户点击退出按钮');
        
        // 保存当前阅读进度
        this.saveReadingProgress();
        
        // 返回书架页面
        this.exitToBookshelf();
    },

    // 保存阅读进度
    saveReadingProgress() {
        console.log('📄 [保存进度] 开始保存阅读进度');
        
        if (!this.currentLocation || !this.book) {
            console.warn('📄 [保存进度] ⚠️ 无法保存进度：缺少位置或书籍信息');
            console.log('📄 [保存进度] - currentLocation:', this.currentLocation);
            console.log('📄 [保存进度] - book:', this.book);
            return;
        }

        try {
            const bookId = this.getBookId();
            console.log('📄 [保存进度] 书籍ID:', bookId);
            
            const progressData = {
                cfi: this.currentLocation.start.cfi,
                percentage: this.book.locations ? this.book.locations.percentageFromCfi(this.currentLocation.start.cfi) : 0,
                timestamp: Date.now(),
                chapterTitle: this.getCurrentChapterTitle()
            };

            console.log('📄 [保存进度] 准备保存的进度数据:', progressData);
            console.log('📄 [保存进度] - CFI位置:', progressData.cfi);
            console.log('📄 [保存进度] - 阅读百分比:', Math.round((progressData.percentage || 0) * 100) + '%');
            console.log('📄 [保存进度] - 章节标题:', progressData.chapterTitle);

            // 保存到localStorage
            const storageKey = `epub_progress_${bookId}`;
            console.log('📄 [保存进度] 使用存储键:', storageKey);
            
            localStorage.setItem(storageKey, JSON.stringify(progressData));
            console.log('📄 [保存进度] ✅ 阅读进度已成功保存到本地存储');
            
            // 验证保存是否成功
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                console.log('📄 [保存进度] ✅ 验证：数据已成功写入localStorage');
            } else {
                console.error('📄 [保存进度] ❌ 验证失败：数据未能写入localStorage');
            }
        } catch (error) {
            console.error('📄 [保存进度] ❌ 保存阅读进度失败:', error);
            console.error('📄 [保存进度] 错误堆栈:', error.stack);
        }
    },

    // 恢复阅读进度
    restoreReadingProgress() {
        console.log('📄 [恢复进度] 开始恢复阅读进度流程');
        console.log('📄 [恢复进度] 当前book对象:', this.book);
        console.log('📄 [恢复进度] book是否存在:', !!this.book);
        
        if (!this.book) {
            console.warn('📄 [恢复进度] 无法恢复进度：书籍信息未准备好');
            return;
        }
        
        console.log('📄 [恢复进度] book对象验证通过，继续执行...');

        try {
            const bookId = this.getBookId();
            console.log('📄 [恢复进度] 获取到书籍ID:', bookId);
            
            const storageKey = `epub_progress_${bookId}`;
            console.log('📄 [恢复进度] 使用存储键:', storageKey);
            
            console.log('📄 [恢复进度] 开始从localStorage加载阅读进度...');
            const savedProgress = localStorage.getItem(storageKey);
            
            if (savedProgress) {
                console.log('📄 [恢复进度] ✅ 从本地存储成功加载到阅读进度数据');
                console.log('📄 [恢复进度] 原始存储数据:', savedProgress);
                
                const progressData = JSON.parse(savedProgress);
                console.log('📄 [恢复进度] 解析后的进度数据:', progressData);
                console.log('📄 [恢复进度] - CFI位置:', progressData.cfi);
                console.log('📄 [恢复进度] - 阅读百分比:', Math.round((progressData.percentage || 0) * 100) + '%');
                console.log('📄 [恢复进度] - 章节标题:', progressData.chapterTitle);
                console.log('📄 [恢复进度] - 保存时间:', new Date(progressData.timestamp).toLocaleString());

                // 检查rendition状态
                if (window.rendition) {
                    console.log('📄 [恢复进度] ✅ rendition对象可用，开始跳转到保存位置');
                    
                    if (progressData.cfi) {
                        console.log('📄 [恢复进度] 执行跳转到CFI:', progressData.cfi);
                        
                        window.rendition.display(progressData.cfi).then(() => {
                            console.log('📄 [恢复进度] ✅ 阅读进度恢复成功！已跳转到上次阅读位置');
                            console.log('📄 [恢复进度] 当前显示的CFI:', progressData.cfi);
                        }).catch((error) => {
                            console.error('📄 [恢复进度] ❌ 恢复阅读进度失败:', error);
                            console.error('📄 [恢复进度] 失败的CFI:', progressData.cfi);
                        });
                    } else {
                        console.warn('📄 [恢复进度] ⚠️ 保存的进度数据中没有CFI信息');
                    }
                } else {
                    console.error('📄 [恢复进度] ❌ rendition对象不可用，无法恢复进度');
                }
            } else {
                console.log('📄 [恢复进度] ℹ️ 没有找到保存的阅读进度，这可能是第一次阅读此书');
                console.log('📄 [恢复进度] 检查的存储键:', storageKey);
            }
        } catch (error) {
            console.error('📄 [恢复进度] ❌ 恢复阅读进度时发生异常:', error);
            console.error('📄 [恢复进度] 错误堆栈:', error.stack);
        }
    },

    // 获取书籍ID（用于存储标识）
    getBookId() {
        // 尝试从URL参数获取书籍ID
        const urlParams = new URLSearchParams(window.location.search);
        const bookParam = urlParams.get('bookId') || urlParams.get('book'); // 支持两种参数名
        
        console.log('📄 [getBookId] URL参数:', window.location.search);
        console.log('📄 [getBookId] bookId参数:', urlParams.get('bookId'));
        console.log('📄 [getBookId] book参数:', urlParams.get('book'));
        
        if (bookParam) {
            console.log('📄 [getBookId] 使用URL参数作为书籍ID:', bookParam);
            return bookParam;
        }

        // 如果没有URL参数，使用书籍标题作为ID
        if (this.book && this.book.package && this.book.package.metadata) {
            const title = this.book.package.metadata.title;
            const bookId = title ? title.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown_book';
            console.log('📄 [getBookId] 使用书籍标题作为ID:', bookId, '原标题:', title);
            return bookId;
        }

        console.log('📄 [getBookId] 使用默认ID: unknown_book');
        return 'unknown_book';
    },

    // 获取当前章节标题
    getCurrentChapterTitle() {
        try {
            if (this.currentLocation && this.currentLocation.start) {
                // 尝试从当前位置获取章节信息
                const href = this.currentLocation.start.href;
                if (this.book && this.book.navigation && this.book.navigation.toc) {
                    const tocItem = this.book.navigation.toc.find(item => item.href === href);
                    return tocItem ? tocItem.label : '未知章节';
                }
            }
            return '未知章节';
        } catch (error) {
            console.error('📄 获取章节标题失败:', error);
            return '未知章节';
        }
    },

    // 防抖保存进度（避免频繁保存）
    debouncedSaveProgress() {
        if (this.saveProgressTimer) {
            clearTimeout(this.saveProgressTimer);
        }
        
        this.saveProgressTimer = setTimeout(() => {
            this.saveReadingProgress();
        }, 200); // 改为200ms
    },

    // 退出到书架页面
    exitToBookshelf() {
        // 检查是否在PWA模式下
        if (window.matchMedia('(display-mode: standalone)').matches) {
            // PWA模式下，导航到书架页面
            window.location.href = '/index.html';
        } else {
            // 浏览器模式下，可以关闭窗口或返回上一页
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/index.html';
            }
        }
    }
};

// 导出到全局供其他模块使用
if (typeof window !== 'undefined') {
    window.ProgressManager = ProgressManager;

    // 保持向后兼容
    window.updateProgress = function () {
        ProgressManager.updateProgress();
    };
    window.updatePageInfo = function () {
        ProgressManager.updatePageInfo();
    };
}