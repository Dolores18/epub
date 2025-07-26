# EPUB Reader 项目结构

## 项目概述
这是一个基于 Web 的 EPUB 电子书阅读器，支持日文字体显示和多种阅读功能。

## 目录结构

```
epub-reader/
├── epub-reader.html              # 主入口文件（拆分后的简洁版本）
├── epub-reader-original.html     # 原始单文件版本（备份）
├── start-server.py              # 本地HTTP服务器启动脚本
├── noruwei.epub                 # 示例EPUB文件
├── README-epub-reader.md        # 项目说明文档
├── PROJECT-STRUCTURE.md         # 本文件
├── assets/                      # 静态资源目录
│   ├── css/                     # 样式文件
│   │   └── epub-reader.css      # 主样式文件
│   ├── js/                      # JavaScript文件
│   │   ├── epub-reader.js       # 主业务逻辑
│   │   ├── jszip.min.js         # JSZip库（处理ZIP格式）
│   │   └── epub.min.js          # epub.js库（EPUB解析）
│   └── fonts/                   # 字体文件
│       ├── ipaexm.ttf           # IPA明朝体
│       ├── ipaexg.ttf           # IPA哥特体
│       ├── ipam.ttf             # IPA明朝体（标准）
│       └── ipamp.ttf            # IPA明朝体P
└── noruwei/                     # EPUB解压后的内容（开发用）
```

## 文件说明

### 核心文件

1. **epub-reader.html** - 主入口文件
   - 只包含HTML结构
   - 引用外部CSS和JS文件
   - 保持代码整洁和可维护性

2. **assets/css/epub-reader.css** - 样式文件
   - 包含所有UI样式
   - 日文字体定义
   - 响应式设计
   - 主题和布局

3. **assets/js/epub-reader.js** - 主业务逻辑
   - EPUB文件加载和解析
   - 阅读器功能实现
   - 事件处理
   - 用户交互逻辑

### 依赖库

4. **assets/js/jszip.min.js** - JSZip库
   - 处理EPUB文件的ZIP格式解压
   - 必需的第三方依赖

5. **assets/js/epub.min.js** - epub.js库
   - EPUB格式解析和渲染
   - 核心阅读器引擎

### 字体资源

6. **assets/fonts/** - 字体文件目录
   - 支持日文显示的IPA字体
   - 提供多种字体选择

## 开发优势

### 拆分前（单文件）
- ❌ 代码混杂，难以维护
- ❌ 样式和逻辑耦合
- ❌ 不利于团队协作
- ❌ 缓存效率低

### 拆分后（多文件）
- ✅ 结构清晰，职责分离
- ✅ 便于维护和调试
- ✅ 支持团队协作开发
- ✅ 浏览器缓存友好
- ✅ 代码复用性强

## 最佳实践

1. **文件组织**
   - HTML：只包含结构，不包含样式和脚本
   - CSS：统一管理样式，支持主题切换
   - JS：模块化组织，功能明确

2. **资源管理**
   - 静态资源统一放在 `assets/` 目录
   - 按类型分类：`css/`、`js/`、`fonts/`
   - 第三方库和自定义代码分离

3. **路径规范**
   - 使用相对路径引用资源
   - 保持路径结构的一致性
   - 便于部署和迁移

## 使用方法

1. 启动本地服务器：
   ```bash
   python3 start-server.py
   ```

2. 访问：http://localhost:8000/epub-reader.html

3. 上传EPUB文件或使用默认的示例文件

## 扩展建议

1. **CSS模块化**：可以进一步拆分CSS为多个主题文件
2. **JS模块化**：使用ES6模块或构建工具进一步组织代码
3. **配置文件**：添加配置文件管理应用设置
4. **构建流程**：引入构建工具优化资源加载