# EPUB阅读器分页与行截断解决方案

## 问题描述

在电子书阅读器中，左右翻页时经常遇到**行截断问题**：
- 页面底部出现被截断的文字行
- 用户看到半行文字，影响阅读体验
- 需要确保每页显示完整的文字行

## 标准解决方案

### 1. 使用epub.js的分页模式

**之前的问题配置：**
```javascript
rendition = book.renderTo('viewer', {
    flow: 'scrolled',        // ❌ 滚动模式，需要手动处理分页
    manager: 'continuous'    // ❌ 连续管理器，不处理行截断
});
```

**正确的配置：**
```javascript
rendition = book.renderTo('viewer', {
    flow: 'paginated',       // ✅ 分页模式，自动处理行截断
    manager: 'default'       // ✅ 默认管理器，内置分页逻辑
});
```

### 2. CSS优化

```css
/* 确保文本不会被截断 */
#viewer * {
    page-break-inside: avoid;  /* 避免元素内部分页 */
    break-inside: avoid;       /* CSS3标准 */
    orphans: 2;               /* 避免孤行（页面底部单独一行） */
    widows: 2;                /* 避免寡行（页面顶部单独一行） */
}

#viewer {
    overflow: hidden;         /* 防止内容溢出 */
}
```

### 3. JavaScript翻页逻辑

**之前的手动分页：**
```javascript
// ❌ 手动计算页面高度和滚动位置
function nextPage() {
    currentPage++;
    const offset = currentPage * pageHeight;
    rendition.scrollTo(offset);
}
```

**标准的epub.js翻页：**
```javascript
// ✅ 使用epub.js内置翻页，自动处理行截断
function nextPage() {
    rendition.next();  // 自动计算最佳分页位置
}

function prevPage() {
    rendition.prev();  // 自动处理行截断问题
}
```

## 技术原理

### epub.js分页模式的优势

1. **自动行截断检测**
   - 计算每行的高度和位置
   - 确保页面边界不会切断文字行
   - 动态调整页面内容高度

2. **智能分页算法**
   - 考虑段落完整性
   - 避免孤行和寡行
   - 处理图片和特殊元素

3. **响应式适配**
   - 根据容器大小自动调整
   - 支持不同屏幕尺寸
   - 字体大小变化时重新计算

### CSS辅助优化

1. **page-break-inside: avoid**
   - 防止段落被分页切断
   - 确保完整的语义单元

2. **orphans/widows控制**
   - orphans: 页面底部最少行数
   - widows: 页面顶部最少行数
   - 提升阅读连贯性

## 实现效果

### ✅ 解决后的效果
- 每页显示完整的文字行
- 页面边界不会切断文字
- 翻页体验流畅自然
- 支持不同字体大小
- 响应式适配各种屏幕

### ❌ 之前的问题
- 页面底部经常出现半行文字
- 需要手动计算页面高度
- 字体变化时分页错乱
- 不同屏幕尺寸适配困难

## 最佳实践建议

### 1. 优先使用标准库功能
- epub.js已经解决了大部分分页问题
- 避免重复造轮子
- 利用成熟的算法和优化

### 2. CSS辅助优化
- 使用标准的分页CSS属性
- 设置合理的行高和间距
- 考虑不同语言的排版需求

### 3. 用户体验优化
- 提供平滑的翻页动画
- 支持键盘和触摸操作
- 保存阅读进度和位置

### 4. 测试覆盖
- 测试不同字体大小
- 测试不同屏幕尺寸
- 测试各种EPUB格式

## 扩展功能

### 1. 高级分页选项
```javascript
rendition = book.renderTo('viewer', {
    flow: 'paginated',
    width: '100%',
    height: '100%',
    spread: 'none',           // 单页显示
    minSpreadWidth: 800,      // 最小双页宽度
    snap: true               // 对齐到页面边界
});
```

### 2. 自定义分页样式
```css
/* 页面间距 */
.epub-container {
    column-gap: 2rem;
    column-fill: auto;
}

/* 分页指示器 */
.page-indicator {
    position: fixed;
    bottom: 20px;
    right: 20px;
}
```

这种标准化的解决方案确保了良好的阅读体验，同时保持了代码的可维护性和扩展性。