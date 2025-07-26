# EPUB阅读器页边距控制功能

## 功能概述

通过设置页边距来彻底解决行截断问题，提供更好的阅读体验。

## 功能特性

### 📏 边距控制
- **上边距**：控制页面顶部空白区域（0-100px）
- **下边距**：控制页面底部空白区域（0-100px）
- **左边距**：控制页面左侧空白区域（0-100px）
- **右边距**：控制页面右侧空白区域（0-100px）
- **行高**：控制文字行间距（1.2-2.5倍）

### 🎛️ 实时调节
- 滑块控制，实时预览效果
- 数值显示，精确控制
- 自动保存到本地存储
- 页面刷新后保持设置

### 🔧 技术实现

#### 1. HTML结构
```html
<div class="setting-item">
    <label for="topMargin">上边距：</label>
    <input type="range" id="topMargin" min="0" max="100" value="20" step="5">
    <span id="topMarginValue">20px</span>
</div>
```

#### 2. CSS样式优化
```css
/* 滑块样式 */
.setting-item input[type="range"] {
    -webkit-appearance: none;
    height: 6px;
    background: #ddd;
    border-radius: 3px;
}

.setting-item input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    background: #667eea;
    border-radius: 50%;
    cursor: pointer;
}
```

#### 3. JavaScript控制逻辑
```javascript
// 应用页边距样式
function applyMarginStyle(property, value, unit) {
    if (rendition) {
        const styles = {};
        styles[property] = value + unit;
        
        // 应用到epub.js的主题系统
        rendition.themes.override(styles);
    }
}
```

## 解决行截断的原理

### 🎯 核心思路
1. **增加上下边距**：确保文字不会紧贴页面边界
2. **控制内容区域**：通过padding控制实际文字显示区域
3. **epub.js主题系统**：利用内置的样式覆盖功能
4. **实时生效**：无需重新加载，即时看到效果

### 📊 边距设置建议

#### 最佳实践值：
- **上边距**：20-40px（避免顶部截断）
- **下边距**：20-40px（避免底部截断）
- **左边距**：30-50px（舒适的阅读边距）
- **右边距**：30-50px（平衡的视觉效果）
- **行高**：1.6-2.0（日文阅读推荐1.8）

#### 不同场景优化：
```javascript
// 紧凑模式（小屏幕）
const compactMargins = {
    top: 15, bottom: 15,
    left: 20, right: 20,
    lineHeight: 1.6
};

// 舒适模式（大屏幕）
const comfortMargins = {
    top: 30, bottom: 30,
    left: 40, right: 40,
    lineHeight: 1.8
};

// 宽松模式（护眼阅读）
const relaxedMargins = {
    top: 40, bottom: 40,
    left: 60, right: 60,
    lineHeight: 2.0
};
```

## 与epub.js的集成

### 🔗 主题系统
epub.js提供了强大的主题系统，支持CSS样式覆盖：

```javascript
// 基础主题设置
rendition.themes.default({
    'body': {
        'font-family': 'IPAexMincho, serif',
        'line-height': '1.8',
        'padding': '20px 30px'
    }
});

// 动态样式覆盖
rendition.themes.override({
    'padding-top': '25px',
    'padding-bottom': '25px'
});
```

### 📱 响应式适配
```javascript
// 根据屏幕尺寸自动调整
function getResponsiveMargins() {
    const width = window.innerWidth;
    
    if (width < 768) {
        // 移动设备
        return { top: 15, bottom: 15, left: 20, right: 20 };
    } else if (width < 1200) {
        // 平板设备
        return { top: 25, bottom: 25, left: 35, right: 35 };
    } else {
        // 桌面设备
        return { top: 30, bottom: 30, left: 40, right: 40 };
    }
}
```

## 用户体验优化

### 💾 设置持久化
- 自动保存到localStorage
- 页面刷新后恢复设置
- 支持导入/导出配置

### 🎨 预设模板
```javascript
const marginPresets = {
    default: { top: 20, bottom: 20, left: 30, right: 30, lineHeight: 1.8 },
    compact: { top: 10, bottom: 10, left: 15, right: 15, lineHeight: 1.6 },
    comfortable: { top: 35, bottom: 35, left: 45, right: 45, lineHeight: 2.0 },
    wide: { top: 25, bottom: 25, left: 60, right: 60, lineHeight: 1.8 }
};
```

### ⌨️ 快捷键支持
```javascript
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '=': // Ctrl/Cmd + =
                increaseMargins();
                break;
            case '-': // Ctrl/Cmd + -
                decreaseMargins();
                break;
            case '0': // Ctrl/Cmd + 0
                resetMargins();
                break;
        }
    }
});
```

## 优势对比

### ✅ 页边距方案优势
- **用户可控**：读者可以根据喜好调整
- **实时生效**：无需重新加载页面
- **兼容性好**：适用于各种EPUB格式
- **视觉舒适**：提供更好的阅读体验
- **灵活性高**：支持不同设备和场景

### 🆚 与其他方案对比
1. **vs 纯CSS分页**：更灵活，用户可调
2. **vs 固定分页**：适应性更强
3. **vs 滚动模式**：保持分页体验的同时解决截断

这种方案既保持了epub.js分页模式的优势，又通过用户可控的边距设置彻底解决了行截断问题，是最佳的用户体验解决方案。