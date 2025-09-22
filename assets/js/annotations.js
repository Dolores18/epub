/**
 * EPUB 注释系统
 * 基于 epub-fixed.js 的注释 API 实现
 * 支持高亮、下划线、标记和笔记功能
 */

class EpubAnnotationManager {
    constructor() {
        this.rendition = null;
        this.annotations = new Map(); // 本地存储的注释数据
        this.selectedRange = null;
        this.isSelectionMode = false;
        
        // 注释类型配置
        this.annotationTypes = {
            highlight: {
                name: '高亮',
                className: 'epub-highlight',
                color: '#ffeb3b',
                icon: '🔆'
            },
            underline: {
                name: '下划线',
                className: 'epub-underline', 
                color: '#2196f3',
                icon: '📝'
            },
            mark: {
                name: '标记',
                className: 'epub-mark',
                color: '#f44336',
                icon: '📌'
            }
        };

        this.init();
    }

    /**
     * 初始化注释系统
     */
    init() {
        this.loadAnnotationsFromStorage();
        this.setupEventListeners();
        this.loadCSS();
        
        // 确保DOM准备好后再创建HTML元素
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createAnnotationElements();
            });
        } else {
            // DOM已经加载完成
            this.createAnnotationElements();
        }
        
        console.log('📝 [注释系统] 初始化完成');
    }

    /**
     * 动态加载CSS文件
     */
    loadCSS() {
        // 检查是否已经加载过CSS
        if (document.getElementById('annotationsCSS')) {
            console.log('📝 [注释系统] CSS已存在，跳过加载');
            return;
        }

        const link = document.createElement('link');
        link.id = 'annotationsCSS';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'assets/css/annotations.css?v=' + Date.now();
        document.head.appendChild(link);
        console.log('📝 [注释系统] CSS已动态加载');
    }

    /**
     * 创建注释系统的HTML元素
     */
    createAnnotationElements() {
        // 检查DOM是否准备好
        if (!document.body) {
            console.error('📝 [注释系统] document.body不存在，延迟创建HTML元素');
            setTimeout(() => this.createAnnotationElements(), 100);
            return;
        }
        
        // 检查是否已经创建过
        if (document.getElementById('annotationsPanel')) {
            console.log('📝 [注释系统] HTML元素已存在，跳过创建');
            return;
        }

        // 注释面板HTML
        const annotationPanelHTML = `
            <div class="annotations-panel" id="annotationsPanel">
                <div class="annotations-content">
                    <div class="annotations-header">
                        <h3>📝 笔记与标注</h3>
                        <button class="close-annotations-btn" data-action="close-panel">×</button>
                    </div>
                    <div class="annotations-body">
                        <div class="annotation-toolbar" id="annotationToolbar" style="display: none;">
                            <div class="toolbar-buttons">
                                <button id="dictionaryBtn" data-action="dictionary" title="词典查询">📖 词典</button>
                                <button id="highlightBtn" data-action="highlight" title="高亮标注">🟡 高亮</button>
                                <button id="underlineBtn" data-action="underline" title="下划线标注">📏 下划线</button>
                                <button id="noteBtn" data-action="note" title="添加笔记">📝 笔记</button>
                                <button id="removeBtn" data-action="remove" title="删除标注">🗑️ 删除</button>
                            </div>
                            <div class="selected-text" id="selectedText"></div>
                        </div>
                        <div class="annotations-list">
                            <div class="annotations-header-section">
                                <h4>已保存的标注</h4>
                                <div class="filter-controls">
                                    <select id="annotationFilter" data-action="filter">
                                        <option value="all">全部标注</option>
                                        <option value="highlight">高亮</option>
                                        <option value="underline">下划线</option>
                                        <option value="note">笔记</option>
                                    </select>
                                    <button data-action="clear-all" class="clear-btn" title="清除所有标注">🗑️ 清空</button>
                                </div>
                            </div>
                            <div id="annotationsList" class="annotations-items">
                                <div class="no-annotations" id="noAnnotations">
                                    <p>📝 还没有任何标注</p>
                                    <p class="help-text">选择文本后点击上方的工具栏按钮来添加标注</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 注释模态框HTML
        const annotationModalHTML = `
            <div class="annotation-modal" id="annotationModal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 id="modalTitle">编辑笔记</h4>
                        <button class="modal-close" data-action="close-modal">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="selected-text-display" id="modalSelectedText"></div>
                        <div class="note-input-section">
                            <label for="noteInput">笔记内容：</label>
                            <textarea id="noteInput" placeholder="在此输入您的笔记内容..." rows="4"></textarea>
                        </div>
                        <div class="annotation-colors">
                            <label>标注颜色：</label>
                            <div class="color-options">
                                <button class="color-btn yellow" data-color="yellow" title="黄色">🟡</button>
                                <button class="color-btn green" data-color="green" title="绿色">🟢</button>
                                <button class="color-btn blue" data-color="blue" title="蓝色">🔵</button>
                                <button class="color-btn pink" data-color="pink" title="粉色">🩷</button>
                                <button class="color-btn purple" data-color="purple" title="紫色">🟣</button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button data-action="save-annotation" class="save-btn">💾 保存</button>
                        <button data-action="close-modal" class="cancel-btn">❌ 取消</button>
                    </div>
                </div>
            </div>
        `;

        // 快捷工具条HTML
        const annotationTooltipHTML = `
            <div class="annotation-tooltip" id="annotationTooltip" style="display: none;">
                <button data-action="quick-dictionary" title="词典查询">📖</button>
                <button data-action="quick-highlight" title="快速高亮">🟡</button>
                <button data-action="quick-underline" title="快速下划线">📏</button>
                <button data-action="quick-note" title="添加笔记">📝</button>
            </div>
        `;

        // 插入HTML
        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = annotationPanelHTML + annotationModalHTML + annotationTooltipHTML;
            
            while (tempDiv.firstChild) {
                document.body.appendChild(tempDiv.firstChild);
            }

            console.log('📝 [注释系统] HTML元素已动态创建');
        } catch (error) {
            console.error('📝 [注释系统] 创建HTML元素失败:', error);
            // 如果失败，稍后重试
            setTimeout(() => this.createAnnotationElements(), 500);
        }
    }

    /**
     * 设置 rendition 实例（简化版，主要用于存储rendition引用）
     * @param {Object} rendition EPUB.js rendition 实例
     */
    setRendition(rendition) {
        console.log('📝 [注释系统] 设置rendition引用');
        this.rendition = rendition || window.rendition;
        
        // 恢复已保存的注释
        if (this.rendition && this.rendition.annotations) {
            this.restoreAnnotations();
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                switch(e.key) {
                    case 'h': // Alt+H 高亮
                        e.preventDefault();
                        this.addHighlightFromSelection();
                        break;
                    case 'u': // Alt+U 下划线
                        e.preventDefault();
                        this.addUnderlineFromSelection();
                        break;
                    case 'm': // Alt+M 标记
                        e.preventDefault();
                        this.addMarkFromSelection();
                        break;
                }
            }
        });

        // 事件代理 - 处理所有data-action属性的点击事件
        document.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (!action) return;

            e.preventDefault();
            e.stopPropagation();

            this.handleAction(action, e.target);
        });

        // 监听选择过滤器变化
        document.addEventListener('change', (e) => {
            if (e.target.getAttribute('data-action') === 'filter') {
                this.filterAnnotations(e.target.value);
            }
        });

        // 监听颜色选择
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-btn')) {
                this.selectColor(e.target);
            }
        });
    }

    /**
     * 处理所有动作
     * @param {string} action 动作类型
     * @param {Element} element 触发元素
     */
    handleAction(action, element) {
        console.log('📝 [注释系统] 处理动作:', action);

        switch (action) {
            case 'close-panel':
                this.hideAnnotationsPanel();
                break;
            case 'close-toolbar':
                this.hideAnnotationToolbar();
                break;
            case 'dictionary':
            case 'quick-dictionary':
                this.handleDictionaryAction();
                break;
            case 'highlight':
            case 'quick-highlight':
                this.addHighlightFromSelection();
                break;
            case 'underline':
            case 'quick-underline':
                this.addUnderlineFromSelection();
                break;
            case 'note':
            case 'quick-note':
                this.addMarkFromSelection();
                break;
            case 'remove':
                this.removeCurrentSelection();
                break;
            case 'clear-all':
                this.clearAllAnnotations();
                break;
            case 'close-modal':
                this.hideAnnotationModal();
                break;
            case 'save-annotation':
                this.saveCurrentAnnotation();
                break;
            default:
                console.warn('📝 [注释系统] 未知动作:', action);
        }
    }

    /**
     * 处理词典动作
     */
    handleDictionaryAction() {
        const selectedTextElement = document.getElementById('selectedText');
        const selectedText = selectedTextElement ? selectedTextElement.textContent.trim() : '';
        
        if (!selectedText) {
            this.showMessage('请先选择文本');
            return;
        }

        console.log('📖 [注释系统] 词典查询:', selectedText);
        
        // 尝试调用外部词典API（如果存在）
        if (typeof window.lookupWord === 'function') {
            try {
                window.selectedText = selectedText;
                window.lookupWord(selectedText).then(result => {
                    if (result && typeof window.showDictionaryWithResult === 'function') {
                        window.showDictionaryWithResult(selectedText, result);
                    } else if (typeof window.showDictionaryWithError === 'function') {
                        window.showDictionaryWithError(selectedText, '未找到该单词的释义');
                    }
                }).catch(error => {
                    console.error('📖 [注释系统] 词典查询失败:', error);
                    this.showMessage('词典查询失败');
                });
            } catch (error) {
                console.error('📖 [注释系统] 词典查询错误:', error);
                this.showMessage('词典查询出错');
            }
        } else {
            // 如果没有外部词典API，显示简单提示
            this.showMessage('📖 已选择文本: ' + selectedText);
        }
        
        this.hideAnnotationToolbar();
    }

    /**
     * 处理文本选择事件
     * @param {Object} cfiRange 选择的CFI范围
     * @param {Object} contents 内容对象
     */
    handleTextSelection(cfiRange, contents) {
        this.selectedRange = cfiRange;
        console.log('📝 [注释系统] 文本已选择:', cfiRange);
        
        // 获取选中的文本内容
        if (contents && contents.window) {
            const selection = contents.window.getSelection();
            const selectedText = selection.toString().trim();
            console.log('📝 [注释系统] 选中文本:', selectedText);
            
            if (selectedText) {
                // 更新工具栏中的选中文本显示
                this.updateSelectedTextDisplay(selectedText);
                
                // 显示注释工具栏
                this.showAnnotationToolbar();
                
                // 显示快捷工具提示
                this.showQuickAnnotationTooltip(contents);
                
                // 同时处理词典功能（如果启用）
                this.handleDictionaryIntegration(cfiRange, contents);
            }
        }
    }

    /**
     * 处理词典集成
     * @param {Object} cfiRange 选择的CFI范围
     * @param {Object} contents 内容对象
     */
    handleDictionaryIntegration(cfiRange, contents) {
        // 调用词典的文本选择处理方法（如果存在）
        if (typeof window.Dictionary !== 'undefined' && window.Dictionary.handleTextSelection) {
            try {
                const text = window.Dictionary.handleTextSelection(cfiRange, contents);
                console.log('📝 [注释系统] 词典处理结果:', text);
            } catch (error) {
                console.error('📝 [注释系统] 词典处理失败:', error);
            }
        }
    }

    /**
     * 处理注释点击事件
     * @param {Object} annotation 被点击的注释
     */
    handleAnnotationClick(annotation) {
        console.log('📝 [注释系统] 注释被点击:', annotation);
        
        // 显示注释详情
        this.showAnnotationDetails(annotation);
    }

    /**
     * 从选择添加高亮
     */
    addHighlightFromSelection() {
        if (this.selectedRange) {
            this.addAnnotation('highlight', this.selectedRange);
        } else {
            this.showMessage('请先选择要高亮的文本');
        }
    }

    /**
     * 从选择添加下划线
     */
    addUnderlineFromSelection() {
        if (this.selectedRange) {
            this.addAnnotation('underline', this.selectedRange);
        } else {
            this.showMessage('请先选择要添加下划线的文本');
        }
    }

    /**
     * 从选择添加标记
     */
    addMarkFromSelection() {
        if (this.selectedRange) {
            this.addAnnotation('mark', this.selectedRange);
        } else {
            this.showMessage('请先选择要标记的文本');
        }
    }

    /**
     * 添加注释
     * @param {string} type 注释类型 (highlight, underline, mark)
     * @param {string} cfiRange CFI 范围
     * @param {Object} data 注释数据
     * @param {string} note 注释文本
     */
    addAnnotation(type, cfiRange, data = {}, note = '') {
        if (!this.rendition || !this.rendition.annotations) {
            console.error('📝 [注释系统] Rendition 未准备好');
            return null;
        }

        const config = this.annotationTypes[type];
        if (!config) {
            console.error('📝 [注释系统] 未知的注释类型:', type);
            return null;
        }

        // 创建注释数据
        const annotationData = {
            id: this.generateId(),
            type: type,
            cfiRange: cfiRange,
            note: note,
            timestamp: new Date().toISOString(),
            color: config.color,
            ...data
        };

        // 样式配置
        const styles = {
            'background-color': type === 'highlight' ? config.color : 'transparent',
            'border-bottom': type === 'underline' ? `2px solid ${config.color}` : 'none',
            'border-left': type === 'mark' ? `4px solid ${config.color}` : 'none'
        };

        try {
            // 调用 epub-fixed.js API
            let annotation;
            const callback = (e) => this.handleAnnotationClick.call(this, annotationData);
            
            if (type === 'highlight') {
                annotation = this.rendition.annotations.highlight(
                    cfiRange, 
                    annotationData, 
                    callback,
                    config.className,
                    styles
                );
            } else if (type === 'underline') {
                annotation = this.rendition.annotations.underline(
                    cfiRange,
                    annotationData,
                    callback, 
                    config.className,
                    styles
                );
            } else if (type === 'mark') {
                annotation = this.rendition.annotations.mark(
                    cfiRange,
                    annotationData,
                    callback
                );
            }

            if (annotation) {
                // 保存到本地存储
                this.annotations.set(annotationData.id, annotationData);
                this.saveAnnotationsToStorage();
                
                console.log(`📝 [注释系统] ${config.name}添加成功:`, annotationData);
                this.showMessage(`${config.icon} ${config.name}已添加`);
                
                // 清除选择
                this.selectedRange = null;
                this.hideAnnotationToolbar();
                
                return annotationData;
            }
        } catch (error) {
            console.error('📝 [注释系统] 添加注释失败:', error);
            this.showMessage('添加注释失败: ' + error.message);
        }
        
        return null;
    }

    /**
     * 删除注释
     * @param {string} annotationId 注释ID
     */
    removeAnnotation(annotationId) {
        const annotation = this.annotations.get(annotationId);
        if (!annotation) {
            console.warn('📝 [注释系统] 注释不存在:', annotationId);
            return;
        }

        try {
            // 调用 epub-fixed.js API
            this.rendition.annotations.remove(annotation.cfiRange, annotation.type);
            
            // 从本地存储移除
            this.annotations.delete(annotationId);
            this.saveAnnotationsToStorage();
            
            console.log('📝 [注释系统] 注释已删除:', annotation);
            this.showMessage('🗑️ 注释已删除');
            
        } catch (error) {
            console.error('📝 [注释系统] 删除注释失败:', error);
            this.showMessage('删除注释失败: ' + error.message);
        }
    }

    /**
     * 编辑注释文本
     * @param {string} annotationId 注释ID
     * @param {string} newNote 新的注释文本
     */
    editAnnotation(annotationId, newNote) {
        const annotation = this.annotations.get(annotationId);
        if (!annotation) {
            console.warn('📝 [注释系统] 注释不存在:', annotationId);
            return;
        }

        annotation.note = newNote;
        annotation.timestamp = new Date().toISOString();
        
        this.annotations.set(annotationId, annotation);
        this.saveAnnotationsToStorage();
        
        console.log('📝 [注释系统] 注释已更新:', annotation);
        this.showMessage('✏️ 注释已更新');
    }

    /**
     * 获取所有注释
     * @returns {Array} 注释列表
     */
    getAllAnnotations() {
        return Array.from(this.annotations.values());
    }

    /**
     * 按类型获取注释
     * @param {string} type 注释类型
     * @returns {Array} 注释列表
     */
    getAnnotationsByType(type) {
        return this.getAllAnnotations().filter(annotation => annotation.type === type);
    }

    /**
     * 恢复保存的注释
     */
    restoreAnnotations() {
        if (!this.rendition || !this.rendition.annotations) {
            return;
        }

        console.log('📝 [注释系统] 恢复已保存的注释...');
        
        this.annotations.forEach(annotation => {
            const config = this.annotationTypes[annotation.type];
            if (!config) return;

            const styles = {
                'background-color': annotation.type === 'highlight' ? annotation.color : 'transparent',
                'border-bottom': annotation.type === 'underline' ? `2px solid ${annotation.color}` : 'none',
                'border-left': annotation.type === 'mark' ? `4px solid ${annotation.color}` : 'none'
            };

            try {
                const callback = (e) => this.handleAnnotationClick.call(this, annotation);
                
                if (annotation.type === 'highlight') {
                    this.rendition.annotations.highlight(
                        annotation.cfiRange,
                        annotation,
                        callback,
                        config.className,
                        styles
                    );
                } else if (annotation.type === 'underline') {
                    this.rendition.annotations.underline(
                        annotation.cfiRange,
                        annotation,
                        callback,
                        config.className,
                        styles
                    );
                } else if (annotation.type === 'mark') {
                    this.rendition.annotations.mark(
                        annotation.cfiRange,
                        annotation,
                        callback
                    );
                }
            } catch (error) {
                console.error('📝 [注释系统] 恢复注释失败:', error, annotation);
            }
        });
        
        console.log(`📝 [注释系统] 已恢复 ${this.annotations.size} 个注释`);
    }

    /**
     * 更新选中文本显示
     * @param {string} selectedText 选中的文本
     */
    updateSelectedTextDisplay(selectedText) {
        const selectedTextElement = document.getElementById('selectedText');
        if (selectedTextElement) {
            selectedTextElement.textContent = selectedText;
        }
    }

    /**
     * 显示注释工具栏
     */
    showAnnotationToolbar() {
        // 先尝试找到预加载的工具栏
        let toolbar = document.getElementById('annotationToolbar');
        if (toolbar) {
            toolbar.style.display = 'flex';
            console.log('📝 [注释系统] 显示预加载的工具栏');
            return;
        }

        // 如果预加载的工具栏不存在，动态创建一个
        console.log('📝 [注释系统] 预加载工具栏不存在，动态创建');
        this.createAnnotationToolbar();
    }

    /**
     * 动态创建注释工具栏
     */
    createAnnotationToolbar() {
        // 移除已存在的工具栏
        this.hideAnnotationToolbar();

        try {
            // 获取选中的文本
            const selectedTextElement = document.getElementById('selectedText');
            const selectedText = selectedTextElement ? selectedTextElement.textContent : 
                                 (this.selectedRange ? '选中的文本' : '未知文本');

            // 创建工具栏容器
            const toolbar = document.createElement('div');
            toolbar.id = 'dynamicAnnotationToolbar';
            toolbar.style.cssText = `
                position: fixed;
                top: 60%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 1px solid #ddd;
                border-radius: 12px;
                padding: 0;
                font-size: 14px;
                z-index: 3001;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                display: flex;
                flex-direction: column;
                min-width: 280px;
            `;

            // 标题栏
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px 8px 16px;
                border-bottom: 1px solid #f0f0f0;
                background: #f8f9fa;
                border-radius: 12px 12px 0 0;
            `;

            const title = document.createElement('div');
            title.style.cssText = `
                font-size: 14px;
                font-weight: 500;
                color: #333;
            `;
            title.textContent = '📚 文本工具';

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('data-action', 'close-toolbar');
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s;
            `;

            header.appendChild(title);
            header.appendChild(closeBtn);
            toolbar.appendChild(header);

            // 内容区域
            const content = document.createElement('div');
            content.style.cssText = `
                padding: 12px 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            `;

            // 按钮容器
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            `;

            // 词典查询按钮
            const dictionaryBtn = document.createElement('button');
            dictionaryBtn.innerHTML = '📖 词典';
            dictionaryBtn.setAttribute('data-action', 'dictionary');
            dictionaryBtn.style.cssText = `
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
            `;
            buttonContainer.appendChild(dictionaryBtn);

            // 高亮按钮
            const highlightBtn = document.createElement('button');
            highlightBtn.innerHTML = '🟡 高亮';
            highlightBtn.setAttribute('data-action', 'highlight');
            highlightBtn.style.cssText = `
                background: #ffc107;
                color: #333;
                border: none;
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
            `;
            buttonContainer.appendChild(highlightBtn);

            // 下划线按钮
            const underlineBtn = document.createElement('button');
            underlineBtn.innerHTML = '📏 下划线';
            underlineBtn.setAttribute('data-action', 'underline');
            underlineBtn.style.cssText = `
                background: #28a745;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
            `;
            buttonContainer.appendChild(underlineBtn);

            // 笔记按钮
            const noteBtn = document.createElement('button');
            noteBtn.innerHTML = '📝 笔记';
            noteBtn.setAttribute('data-action', 'note');
            noteBtn.style.cssText = `
                background: #17a2b8;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 500;
            `;
            buttonContainer.appendChild(noteBtn);

            content.appendChild(buttonContainer);
            toolbar.appendChild(content);

            // 添加到页面
            document.body.appendChild(toolbar);
            console.log('📝 [注释系统] 动态注释工具栏已显示');
        } catch (error) {
            console.error('📝 [注释系统] 创建工具栏失败:', error);
        }
    }

    /**
     * 显示快捷注释工具提示
     * @param {Object} contents 内容对象
     */
    showQuickAnnotationTooltip(contents) {
        // 这个方法用于在选择文本时显示快捷工具提示
        // 暂时先记录日志，后续可以实现位置计算和显示
        console.log('📝 [注释系统] 准备显示快捷工具提示');
        
        // 触发自定义事件，让UI组件处理
        document.dispatchEvent(new CustomEvent('showQuickAnnotationTooltip', {
            detail: { contents, selectedRange: this.selectedRange }
        }));
    }

    /**
     * 隐藏注释工具栏
     */
    hideAnnotationToolbar() {
        // 隐藏预加载的工具栏
        const toolbar = document.getElementById('annotationToolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
        
        // 移除动态创建的工具栏
        const dynamicToolbar = document.getElementById('dynamicAnnotationToolbar');
        if (dynamicToolbar) {
            dynamicToolbar.remove();
            console.log('📝 [注释系统] 动态工具栏已移除');
        }
    }

    /**
     * 隐藏注释面板
     */
    hideAnnotationsPanel() {
        const panel = document.getElementById('annotationsPanel');
        if (panel) {
            panel.classList.remove('show');
            console.log('📝 [注释系统] 注释面板已隐藏');
        }
    }

    /**
     * 显示注释面板
     */
    showAnnotationsPanel() {
        const panel = document.getElementById('annotationsPanel');
        if (panel) {
            panel.classList.add('show');
            console.log('📝 [注释系统] 注释面板已显示');
        }
    }

    /**
     * 隐藏注释模态框
     */
    hideAnnotationModal() {
        const modal = document.getElementById('annotationModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('📝 [注释系统] 注释模态框已隐藏');
        }
    }

    /**
     * 显示注释模态框
     */
    showAnnotationModal() {
        const modal = document.getElementById('annotationModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('📝 [注释系统] 注释模态框已显示');
        }
    }

    /**
     * 过滤注释列表
     * @param {string} filterType 过滤类型
     */
    filterAnnotations(filterType) {
        console.log('📝 [注释系统] 过滤注释:', filterType);
        // 这里可以添加具体的过滤逻辑
    }

    /**
     * 删除当前选择
     */
    removeCurrentSelection() {
        console.log('📝 [注释系统] 删除当前选择');
        // 这里可以添加具体的删除逻辑
    }

    /**
     * 保存当前注释
     */
    saveCurrentAnnotation() {
        console.log('📝 [注释系统] 保存当前注释');
        // 这里可以添加具体的保存逻辑
    }

    /**
     * 选择颜色
     * @param {Element} colorBtn 颜色按钮
     */
    selectColor(colorBtn) {
        // 移除其他颜色按钮的选中状态
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // 添加当前按钮的选中状态
        colorBtn.classList.add('selected');
        
        console.log('📝 [注释系统] 选择颜色:', colorBtn.dataset.color);
    }

    /**
     * 显示注释详情
     * @param {Object} annotation 注释对象
     */
    showAnnotationDetails(annotation) {
        // 触发自定义事件，让UI组件处理
        document.dispatchEvent(new CustomEvent('showAnnotationDetails', {
            detail: annotation
        }));
    }

    /**
     * 显示消息
     * @param {string} message 消息内容
     */
    showMessage(message) {
        // 触发自定义事件，让UI组件处理
        document.dispatchEvent(new CustomEvent('showAnnotationMessage', {
            detail: { message }
        }));
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return 'annotation_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 保存注释到本地存储
     */
    saveAnnotationsToStorage() {
        const annotationsData = Array.from(this.annotations.entries());
        localStorage.setItem('epubAnnotations', JSON.stringify(annotationsData));
        console.log('📝 [注释系统] 注释已保存到本地存储');
    }

    /**
     * 从本地存储加载注释
     */
    loadAnnotationsFromStorage() {
        try {
            const saved = localStorage.getItem('epubAnnotations');
            if (saved) {
                const annotationsData = JSON.parse(saved);
                this.annotations = new Map(annotationsData);
                console.log(`📝 [注释系统] 从本地存储加载了 ${this.annotations.size} 个注释`);
            }
        } catch (error) {
            console.error('📝 [注释系统] 加载注释失败:', error);
            this.annotations = new Map();
        }
    }

    /**
     * 清除所有注释
     */
    clearAllAnnotations() {
        if (!confirm('确定要删除所有注释吗？此操作不可撤销。')) {
            return;
        }

        // 从rendition移除所有注释
        this.annotations.forEach(annotation => {
            try {
                this.rendition.annotations.remove(annotation.cfiRange, annotation.type);
            } catch (error) {
                console.error('📝 [注释系统] 移除注释失败:', error);
            }
        });

        // 清空本地存储
        this.annotations.clear();
        this.saveAnnotationsToStorage();
        
        console.log('📝 [注释系统] 所有注释已清除');
        this.showMessage('🗑️ 所有注释已清除');
    }

    /**
     * 导出注释数据
     * @returns {string} JSON格式的注释数据
     */
    exportAnnotations() {
        const annotationsArray = this.getAllAnnotations();
        return JSON.stringify(annotationsArray, null, 2);
    }

    /**
     * 导入注释数据
     * @param {string} jsonData JSON格式的注释数据
     */
    importAnnotations(jsonData) {
        try {
            const annotationsArray = JSON.parse(jsonData);
            
            annotationsArray.forEach(annotation => {
                if (annotation.id && annotation.cfiRange && annotation.type) {
                    this.annotations.set(annotation.id, annotation);
                }
            });
            
            this.saveAnnotationsToStorage();
            this.restoreAnnotations();
            
            console.log(`📝 [注释系统] 已导入 ${annotationsArray.length} 个注释`);
            this.showMessage(`📥 已导入 ${annotationsArray.length} 个注释`);
            
        } catch (error) {
            console.error('📝 [注释系统] 导入注释失败:', error);
            this.showMessage('导入失败: ' + error.message);
        }
    }
}

// 创建全局注释管理器实例
window.epubAnnotationManager = new EpubAnnotationManager();

// 绑定epub.js的选择事件（与词典系统的bindEpubSelectionEvents对应）
function bindAnnotationSelectionEvents() {
    try {
        if (!window.rendition) {
            console.error('📝 [注释系统] ❌ rendition不存在');
            return false;
        }

        console.log('📝 [注释系统] 🔍 开始绑定epub.js选择事件...');
        console.log('📝 [注释系统] 🔍 window.rendition:', window.rendition);
        console.log('📝 [注释系统] 🔍 rendition.on方法存在:', typeof window.rendition.on === 'function');

        // 监听epub.js的selected事件
        console.log('📝 [注释系统] 🔍 正在绑定selected事件监听器...');
        window.rendition.on('selected', function (cfiRange, contents) {
            console.log('📝 [注释系统] 🎯 ===== selected事件被触发了！ =====');
            console.log('📝 [注释系统] 🔍 cfiRange:', cfiRange);
            console.log('📝 [注释系统] 🔍 contents:', contents);
            console.log('📝 [注释系统] 🔍 contents.window:', contents?.window);

            try {
                // 调用注释管理器的处理方法
                if (window.epubAnnotationManager) {
                    window.epubAnnotationManager.handleTextSelection(cfiRange, contents);
                }
            } catch (error) {
                console.error('📝 [注释系统] ❌ 处理selected事件失败:', error);
                console.error('📝 [注释系统] ❌ 错误详情:', error.stack);
            }
        });
        console.log('📝 [注释系统] ✅ selected事件监听器绑定完成');

        // 监听页面渲染事件
        console.log('📝 [注释系统] 🔍 正在绑定rendered事件监听器...');
        window.rendition.on('rendered', function (section, view) {
            console.log('📝 [注释系统] 🔍 新页面渲染完成:', section.index, section.href);
        });
        console.log('📝 [注释系统] ✅ rendered事件监听器绑定完成');

        console.log('📝 [注释系统] ✅ 所有epub.js选择事件绑定完成');
        return true;

    } catch (error) {
        console.error('📝 [注释系统] ❌ 绑定选择事件失败:', error);
        console.error('📝 [注释系统] ❌ 错误详情:', error.stack);
        return false;
    }
}

// 手动绑定rendition（供外部调用，与词典系统保持一致）
function bindAnnotationRendition() {
    console.log('📝 [注释系统] 手动绑定rendition被调用');
    if (window.rendition) {
        console.log('📝 [注释系统] rendition存在，开始绑定epub选择事件');
        return bindAnnotationSelectionEvents();
    } else {
        console.warn('📝 [注释系统] ⚠️ rendition不存在，无法绑定');
        return false;
    }
}

// 创建注释系统的API接口，模仿词典系统的结构
window.AnnotationSystem = {
    setRendition: function(rendition) {
        if (window.epubAnnotationManager) {
            window.epubAnnotationManager.setRendition(rendition);
        }
    },
    bindRendition: bindAnnotationRendition,
    bindSelectionEvents: bindAnnotationSelectionEvents,
    // 其他API方法...
};

// 添加调试方法
window.debugAnnotationSystem = function() {
    console.log('📝 [调试] ==================注释系统状态==================');
    console.log('📝 [调试] epubAnnotationManager存在:', !!window.epubAnnotationManager);
    console.log('📝 [调试] AnnotationSystem存在:', !!window.AnnotationSystem);
    console.log('📝 [调试] window.rendition存在:', !!window.rendition);
    console.log('📝 [调试] manager.rendition已绑定:', !!(window.epubAnnotationManager && window.epubAnnotationManager.rendition));
    console.log('📝 [调试] CSS已加载:', !!document.getElementById('annotationsCSS'));
    console.log('📝 [调试] HTML已创建:', !!document.getElementById('annotationsPanel'));
    console.log('📝 [调试] 注释数量:', window.epubAnnotationManager ? window.epubAnnotationManager.annotations.size : 'N/A');
    console.log('📝 [调试] rendition.on方法存在:', !!(window.rendition && typeof window.rendition.on === 'function'));
    console.log('📝 [调试] rendition.annotations存在:', !!(window.rendition && window.rendition.annotations));
    
    // 测试手动绑定
    if (window.epubAnnotationManager && window.rendition) {
        console.log('📝 [调试] 尝试重新绑定...');
        bindAnnotationRendition();
    }
    console.log('📝 [调试] ==================调试结束==================');
};

console.log('📝 [注释系统] 模块已加载');
console.log('📝 [注释系统] AnnotationSystem API已创建');
console.log('📝 [注释系统] 可以使用 debugAnnotationSystem() 查看状态');