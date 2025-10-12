# SQLite数据迁移指南

## 概述

本项目已经升级为使用SQLite数据库存储，替代原来的JSON文件格式：
- **旧格式**：数据存储在 `books_data.json` 和 `annotations.json` 文件中
- **新格式**：数据存储在 `books_data.db` SQLite数据库文件中

## 迁移步骤

### 1. 执行迁移

运行迁移脚本：

```bash
python migrate_to_sqlite.py
```

这个脚本会：
- 检查现有的JSON文件
- 创建SQLite数据库
- 迁移所有书籍、进度和注释数据
- 提供迁移统计信息
- 可选择备份原JSON文件

### 2. 验证迁移结果

运行测试脚本验证迁移是否成功：

```bash
python test_migration.py
```

这个脚本会：
- 对比JSON和SQLite中的数据
- 验证数据完整性
- 测试基本操作
- 提供性能测试

### 3. 启动应用

迁移完成后，正常启动应用：

```bash
python start-server.py
```

应用会自动使用SQLite数据库。

## 数据库结构

### books 表
- `book_id` (TEXT PRIMARY KEY): 书籍唯一标识
- `title` (TEXT): 书名
- `author` (TEXT): 作者
- `filename` (TEXT): 文件名
- `file_path` (TEXT): 文件路径
- `added_date` (INTEGER): 添加日期
- `language` (TEXT): 语言
- `file_size` (INTEGER): 文件大小
- `publisher` (TEXT): 出版商
- `description` (TEXT): 描述
- `identifier` (TEXT): 标识符
- `cover_path` (TEXT): 封面路径
- `font_family` (TEXT): 字体
- `font_mode` (TEXT): 字体模式
- `created_at` (TIMESTAMP): 创建时间
- `updated_at` (TIMESTAMP): 更新时间

### reading_progress 表
- `book_id` (TEXT PRIMARY KEY): 书籍ID (外键)
- `cfi` (TEXT): CFI位置
- `percentage` (REAL): 阅读百分比
- `chapter_title` (TEXT): 章节标题
- `timestamp` (INTEGER): 时间戳
- `created_at` (TIMESTAMP): 创建时间
- `updated_at` (TIMESTAMP): 更新时间

### annotations 表
- `id` (TEXT PRIMARY KEY): 注释唯一标识
- `book_id` (TEXT): 书籍ID (外键)
- `type` (TEXT): 注释类型
- `cfi_range` (TEXT): CFI范围
- `text` (TEXT): 注释文本
- `color` (TEXT): 颜色
- `class_name` (TEXT): CSS类名
- `note` (TEXT): 笔记
- `source` (TEXT): 来源
- `chapter_title` (TEXT): 章节标题
- `chapter_index` (INTEGER): 章节索引
- `timestamp` (INTEGER): 时间戳
- `created_at` (TIMESTAMP): 创建时间
- `updated_at` (TIMESTAMP): 更新时间

## 优势

### SQLite相比JSON的优势：
1. **性能更好**：索引支持，查询更快
2. **数据完整性**：外键约束，事务支持
3. **并发安全**：多进程访问安全
4. **存储效率**：二进制格式，占用空间更小
5. **查询能力**：支持复杂SQL查询
6. **备份简单**：单个文件包含所有数据

## 回退到JSON（如果需要）

如果需要临时回退到JSON格式，可以修改 `data.py` 文件中的 `USE_SQLITE = False`，但建议继续使用SQLite以获得更好的性能。

## 注意事项

1. **备份重要**：迁移前请确保备份原数据文件
2. **测试验证**：迁移后请运行测试脚本验证数据完整性
3. **环境变量**：记得设置 `DATA_BACKEND=sqlite` 来使用新后端
4. **文件权限**：确保SQLite数据库文件有适当的读写权限

## 故障排除

### 迁移失败
- 检查原JSON文件是否存在且格式正确
- 确保有足够的磁盘空间
- 检查文件权限

### 数据不匹配
- 运行 `test_migration.py` 查看详细对比
- 检查JSON文件是否在迁移过程中被修改

### 性能问题
- SQLite数据库文件可能需要VACUUM操作
- 检查是否有足够的内存和磁盘空间

## 技术支持

如果遇到问题，请检查：
1. Python版本兼容性
2. SQLite3模块是否可用
3. 文件权限设置
4. 磁盘空间是否充足