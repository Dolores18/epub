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
        console.log('📄 [位置更新] ProgressManager.updateLocation被调用');
        console.log('📄 [位置更新] 新位置CFI:', location.start.cfi);
        console.log('📄 [位置更新] 位置对象:', location);

        this.currentLocation = location;
        console.log('📄 [位置更新] 当前位置已更新为:', this.currentLocation);

        this.updateProgress();

        // 移除自动保存逻辑，只在退出时手动保存
        console.log('📄 [位置更新] 位置已更新，但不自动保存（只在退出时保存）');
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

            // 清除之前的定时器
            this.clearJumpTimer();

            // 实时跳转：locations已可用，无需防抖延迟
            console.log('📄 实时跳转到:', Math.round(percentage * 100) + '%');
            this.jumpToProgress(percentage, true); // 实时预览模式
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

            console.log('📄 拖拽结束，确认跳转到:', Math.round(percentage * 100) + '%');

            // 清除所有定时器
            this.clearJumpTimer();

            // 执行最终确认跳转
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

            // 清除之前的定时器
            this.clearJumpTimer();

            // 实时跳转：locations已可用，无需防抖延迟
            console.log('📄 实时跳转到:', Math.round(percentage * 100) + '%');
            this.jumpToProgress(percentage, true); // 实时预览模式

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

            console.log('📄 触摸拖拽结束，确认跳转到:', Math.round(percentage * 100) + '%');

            // 清除所有定时器
            this.clearJumpTimer();

            // 执行最终确认跳转
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

        try {
            // 设置跳转标志，防止在跳转过程中被relocated事件覆盖
            this.isJumping = true;
            this.targetPercentage = percentage;

            // 计算目标位置
            const totalLocations = this.book.locations.total;
            const targetLocation = Math.floor(percentage * totalLocations);

            const jumpType = isPreview ? '实时' : '确认';
            console.log(`📄 ${jumpType}跳转计算 - 总位置数:`, totalLocations, '目标位置:', targetLocation, '百分比:', percentage);

            // 获取目标位置的CFI
            const targetCfi = this.book.locations.cfiFromLocation(targetLocation);

            if (targetCfi) {
                console.log(`📄 ${jumpType}跳转到CFI:`, targetCfi);

                // 使用全局的rendition对象进行跳转
                if (window.rendition) {
                    window.rendition.display(targetCfi).then(() => {
                        console.log(`📄 ${jumpType}跳转成功`);
                        // 实时模式立即重置，确认模式稍微延迟
                        const delay = isPreview ? 50 : 200;
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
        console.log('📄 [渲染就绪] ========== onRenditionReady被调用 ==========');
        console.log('📄 [渲染就绪] 调用时间:', new Date().toLocaleString());
        console.log('📄 [渲染就绪] 当前book对象:', this.book ? '存在' : '不存在');
        console.log('📄 [渲染就绪] rendition对象:', window.rendition ? '存在' : '不存在');
        console.log('📄 [渲染就绪] 500ms后恢复阅读进度');

        // 使用500ms延迟确保book对象和locations都准备好
        setTimeout(() => {
            console.log('📄 [渲染就绪] ⏰ 延迟时间到，开始调用restoreReadingProgress');
            this.restoreReadingProgress();
        }, 500);
    },

    // 初始化退出按钮
    initExitButton() {
        console.log('📄 [初始化] 开始初始化退出按钮');
        const exitBtn = document.getElementById('exitBtn');
        console.log('📄 [初始化] 退出按钮元素:', exitBtn);

        if (!exitBtn) {
            console.warn('📄 [初始化] ❌ 找不到退出按钮元素');
            return;
        }

        exitBtn.addEventListener('click', (e) => {
            console.log('📄 [退出按钮] ========== 退出按钮被点击 ==========');
            console.log('📄 [退出按钮] 点击时间:', new Date().toLocaleString());
            console.log('📄 [退出按钮] 事件对象:', e);
            console.log('📄 [退出按钮] 事件目标:', e.target);
            console.log('📄 [退出按钮] 开始调用handleExit...');
            this.handleExit();
        });

        console.log('📄 [初始化] ✅ 退出按钮初始化完成');
    },

    // 处理退出操作
    handleExit() {
        console.log('📄 [退出] ========== 处理退出操作开始 ==========');
        console.log('📄 [退出] 退出时间:', new Date().toLocaleString());
        console.log('📄 [退出] 当前位置信息:', this.currentLocation);
        console.log('📄 [退出] 书籍信息:', this.book ? '存在' : '不存在');

        if (this.currentLocation) {
            console.log('📄 [退出] 当前CFI:', this.currentLocation.start.cfi);
        }

        if (this.book) {
            console.log('📄 [退出] 书籍标题:', this.book.package?.metadata?.title);
            console.log('📄 [退出] locations总数:', this.book.locations?.total);
        }

        // 保存当前阅读进度
        console.log('📄 [退出] 🚀 开始调用保存阅读进度...');
        this.saveReadingProgress();

        // 延迟返回书架页面，确保保存完成
        console.log('📄 [退出] ⏰ 设置1秒延迟后返回书架');
        setTimeout(() => {
            console.log('📄 [退出] 🏠 延迟时间到，返回书架页面');
            this.exitToBookshelf();
        }, 1000); // 给保存操作1秒时间
    },

    // 保存阅读进度
    saveReadingProgress() {
        console.log('📄 [保存进度] ========== 开始保存阅读进度 ==========');
        console.log('📄 [保存进度] 调用时间:', new Date().toLocaleString());
        console.log('📄 [保存进度] 调用堆栈:', new Error().stack);

        if (!this.currentLocation || !this.book) {
            console.warn('📄 [保存进度] ⚠️ 无法保存进度：缺少位置或书籍信息');
            console.log('📄 [保存进度] - currentLocation:', this.currentLocation);
            console.log('📄 [保存进度] - book:', this.book);
            console.log('📄 [保存进度] ========== 保存进度结束（失败）==========');
            return;
        }

        try {
            const bookId = this.getBookId();
            console.log('📄 [保存进度] 书籍ID:', bookId);

            const progressData = {
                cfi: this.currentLocation.start.cfi,
                percentage: this.book.locations ? this.book.locations.percentageFromCfi(this.currentLocation.start.cfi) : 0,
                chapterTitle: this.getCurrentChapterTitle()
            };

            console.log('📄 [保存进度] 准备保存的进度数据:', progressData);
            console.log('📄 [保存进度] - CFI位置:', progressData.cfi);
            console.log('📄 [保存进度] - 阅读百分比:', Math.round((progressData.percentage || 0) * 100) + '%');
            console.log('📄 [保存进度] - 章节标题:', progressData.chapterTitle);

            // 第一步：先保存到本地存储（确保数据不丢失）
            const storageKey = `epub_progress_${bookId}`;
            const localData = {
                ...progressData,
                timestamp: Date.now()
            };
            localStorage.setItem(storageKey, JSON.stringify(localData));
            console.log('📄 [保存进度] ✅ 第一步：已保存到本地存储');
            console.log('📄 [保存进度] 🔑 本地存储键:', storageKey);
            console.log('📄 [保存进度] 💾 本地存储数据:', localData);

            // 第二步：尝试保存到服务器
            console.log('📄 [保存进度] 🚀 第二步：开始保存到服务器');
            this.saveToServer(bookId, progressData);

        } catch (error) {
            console.error('📄 [保存进度] ❌ 保存阅读进度失败:', error);
            console.error('📄 [保存进度] 错误堆栈:', error.stack);
            console.log('📄 [保存进度] ========== 保存进度结束（异常）==========');
        }
    },

    // 保存到服务器的独立方法
    saveToServer(bookId, progressData) {
        console.log('📄 [服务器保存] ========== 开始服务器保存 ==========');

        const requestData = {
            bookId: bookId,
            progress: progressData
        };

        console.log('📄 [服务器保存] 🚀 准备发送POST请求到 /api/progress');
        console.log('📄 [服务器保存] 📤 请求数据:', JSON.stringify(requestData, null, 2));
        console.log('📄 [服务器保存] 🌐 开始fetch请求...');

        fetch('/api/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(response => {
                console.log('📄 [服务器保存] 📥 收到服务器响应，状态:', response.status);
                console.log('📄 [服务器保存] 📥 响应OK:', response.ok);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('📄 [服务器保存] 📋 服务器响应数据:', data);
                if (data.success) {
                    console.log('📄 [服务器保存] ✅ 阅读进度已成功保存到服务器');
                    console.log('📄 [服务器保存] 📅 保存时间戳:', data.timestamp);
                    console.log('📄 [服务器保存] ========== 服务器保存结束（成功）==========');
                } else {
                    console.error('📄 [服务器保存] ❌ 服务器返回错误:', data);
                    console.log('📄 [服务器保存] ========== 服务器保存结束（服务器错误）==========');
                }
            })
            .catch(error => {
                console.error('📄 [服务器保存] ❌ 服务器保存失败:', error);
                console.error('📄 [服务器保存] 🔍 错误类型:', error.name);
                console.error('📄 [服务器保存] 🔍 错误消息:', error.message);
                console.error('📄 [服务器保存] 🔍 错误详情:', error.stack);
                console.log('📄 [服务器保存] ========== 服务器保存结束（失败）==========');
            });
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

            // 只从服务器获取进度（确保跨浏览器同步）
            console.log('📄 [恢复进度] 🌐 从服务器获取阅读进度...');
            fetch(`/api/progress/${bookId}`)
                .then(response => {
                    console.log('📄 [恢复进度] 📥 服务器响应状态:', response.status);
                    return response.json();
                })
                .then(data => {
                    console.log('📄 [恢复进度] 📋 服务器响应数据:', data);
                    if (data.success && data.progress) {
                        console.log('📄 [恢复进度] ✅ 从服务器成功加载到阅读进度数据');
                        console.log('📄 [恢复进度] 📖 服务器进度数据:', data.progress);
                        console.log('📄 [恢复进度] 📊 阅读百分比:', Math.round((data.progress.percentage || 0) * 100) + '%');
                        console.log('📄 [恢复进度] 📅 保存时间:', new Date(data.progress.timestamp).toLocaleString());

                        this.applyProgress(data.progress);
                    } else {
                        console.log('📄 [恢复进度] ℹ️ 服务器没有进度数据，这可能是第一次阅读此书');
                        console.log('📄 [恢复进度] 📚 将从书籍开头开始阅读');
                    }
                })
                .catch(error => {
                    console.error('📄 [恢复进度] ❌ 从服务器获取进度失败:', error);
                    console.error('📄 [恢复进度] 🔍 错误详情:', error.message);
                    console.log('📄 [恢复进度] 📚 将从书籍开头开始阅读');
                });

        } catch (error) {
            console.error('📄 [恢复进度] ❌ 恢复阅读进度时发生异常:', error);
            console.error('📄 [恢复进度] 错误堆栈:', error.stack);
        }
    },



    // 应用进度数据
    applyProgress(progressData) {
        console.log('📄 [应用进度] ========== 开始应用进度数据 ==========');
        console.log('📄 [应用进度] 📋 进度数据:', progressData);
        console.log('📄 [应用进度] 📍 CFI位置:', progressData.cfi);
        console.log('📄 [应用进度] 📊 阅读百分比:', Math.round((progressData.percentage || 0) * 100) + '%');
        console.log('📄 [应用进度] 📖 章节标题:', progressData.chapterTitle);

        if (progressData.timestamp) {
            console.log('📄 [应用进度] 📅 保存时间:', new Date(progressData.timestamp).toLocaleString());
        }

        // 检查rendition状态
        if (window.rendition) {
            console.log('📄 [应用进度] ✅ rendition对象可用，开始跳转到保存位置');

            if (progressData.cfi) {
                console.log('📄 [应用进度] 🚀 执行跳转到CFI:', progressData.cfi);

                window.rendition.display(progressData.cfi).then(() => {
                    console.log('📄 [应用进度] ✅ 阅读进度恢复成功！已跳转到上次阅读位置');
                    console.log('📄 [应用进度] 📍 当前显示的CFI:', progressData.cfi);
                    console.log('� [应用恢进度] ========== 应用进度完成（成功）==========');
                }).catch((error) => {
                    console.error('📄 [应用进度] ❌ 恢复阅读进度失败:', error);
                    console.error('📄 [应用进度] 💥 失败的CFI:', progressData.cfi);
                    console.log('📄 [应用进度] ========== 应用进度完成（失败）==========');
                });
            } else {
                console.warn('📄 [应用进度] ⚠️ 保存的进度数据中没有CFI信息');
                console.log('📄 [应用进度] ========== 应用进度完成（无CFI）==========');
            }
        } else {
            console.error('📄 [应用进度] ❌ rendition对象不可用，无法恢复进度');
            console.log('📄 [应用进度] ========== 应用进度完成（无rendition）==========');
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