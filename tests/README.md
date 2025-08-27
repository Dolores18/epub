# 测试文件夹

这个文件夹包含了EPUB阅读器项目的各种测试文件。

## 文件说明

### 多语言词典测试
- **test-multilang-dict.html** - 多语言词典功能测试页面
  - 测试语言检测功能
  - 测试API端点选择逻辑
  - 测试多语言界面文本

### 词典功能测试
- **test-dictionary.html** - 词典功能测试页面
- **test-selection.html** - 文本选择功能测试
- **test-drag.html** - 拖拽功能测试

### 主题测试
- **theme-test.html** - 主题功能测试页面
  - 测试各种主题切换
  - 主题样式预览

## 使用方法

1. 启动开发服务器：
   ```bash
   python3 start-server.py
   ```

2. 在浏览器中访问测试文件：
   ```
   http://localhost:8000/tests/test-multilang-dict.html
   http://localhost:8000/tests/theme-test.html
   等等...
   ```

## 注意事项

- 所有测试文件都已经更新了相对路径，可以正常访问主项目的资源
- 测试文件是独立的，不会影响主项目的功能
- 建议在开发过程中使用这些测试文件来验证功能