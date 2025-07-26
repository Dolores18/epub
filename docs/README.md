# EPUB Reader 文档目录

本文件夹包含EPUB阅读器项目的所有技术文档和说明。

## 📚 文档列表

### 🏗️ 项目结构
- **[PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md)** - 项目整体结构说明
  - 目录组织方式
  - 文件职责分工
  - 开发最佳实践

### 📖 核心功能文档

#### 分页与排版
- **[PAGINATION-SOLUTION.md](./PAGINATION-SOLUTION.md)** - 分页与行截断解决方案
  - epub.js分页模式配置
  - 行截断问题的技术原理
  - CSS辅助优化方案

#### 页边距控制
- **[MARGIN-CONTROL.md](./MARGIN-CONTROL.md)** - 页边距控制功能
  - 用户可调节的边距设置
  - 实时预览和保存功能
  - 响应式适配方案

#### 交互优化
- **[MENU-INTERACTION.md](./MENU-INTERACTION.md)** - 菜单交互优化
  - 点击空白区域关闭菜单
  - 智能区域识别
  - 用户体验改进

## 🎯 文档分类

### 按开发阶段分类
- **架构设计**: PROJECT-STRUCTURE.md
- **核心功能**: PAGINATION-SOLUTION.md, MARGIN-CONTROL.md
- **用户体验**: MENU-INTERACTION.md

### 按技术领域分类
- **前端架构**: PROJECT-STRUCTURE.md
- **CSS样式**: PAGINATION-SOLUTION.md, MARGIN-CONTROL.md
- **JavaScript交互**: MENU-INTERACTION.md
- **epub.js集成**: PAGINATION-SOLUTION.md

## 📋 快速导航

### 🔧 开发者指南
如果你是新加入的开发者，建议按以下顺序阅读：

1. **[PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md)** - 了解项目整体结构
2. **[PAGINATION-SOLUTION.md](./PAGINATION-SOLUTION.md)** - 理解核心分页逻辑
3. **[MARGIN-CONTROL.md](./MARGIN-CONTROL.md)** - 学习用户设置功能
4. **[MENU-INTERACTION.md](./MENU-INTERACTION.md)** - 掌握交互优化技巧

### 🐛 问题排查
遇到问题时的查找顺序：

- **分页显示问题** → PAGINATION-SOLUTION.md
- **页面布局问题** → MARGIN-CONTROL.md  
- **菜单操作问题** → MENU-INTERACTION.md
- **项目结构疑问** → PROJECT-STRUCTURE.md

### 🚀 功能扩展
想要添加新功能时的参考：

- **新增用户设置** → 参考 MARGIN-CONTROL.md
- **优化交互体验** → 参考 MENU-INTERACTION.md
- **集成第三方库** → 参考 PAGINATION-SOLUTION.md
- **重构代码结构** → 参考 PROJECT-STRUCTURE.md

## 📝 文档维护

### 更新原则
- 每个新功能都应该有对应的文档
- 重大修改需要更新相关文档
- 保持文档与代码的同步

### 文档格式
- 使用Markdown格式
- 包含代码示例和配置说明
- 提供问题解决方案
- 添加适当的图表和截图（如需要）

### 贡献指南
如果你要添加新文档：

1. 在docs文件夹中创建新的.md文件
2. 更新本README.md文件的索引
3. 确保文档结构清晰，内容完整
4. 提供实际的代码示例

---

## 🔗 相关链接

- **项目主页**: [../README-epub-reader.md](../README-epub-reader.md)
- **源代码**: [../epub-reader.html](../epub-reader.html)
- **样式文件**: [../assets/css/](../assets/css/)
- **脚本文件**: [../assets/js/](../assets/js/)

---

*最后更新: 2025年1月*