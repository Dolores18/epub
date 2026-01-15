#!/usr/bin/env python3
"""
数据库模型定义
定义所有表结构和索引
"""

import sqlite3
from typing import Optional


class DatabaseSchema:
    """数据库模式管理"""
    
    # 当前数据库版本
    VERSION = 1
    
    @staticmethod
    def init_database(db_path: str) -> None:
        """
        初始化数据库，创建所有表和索引
        
        Args:
            db_path: 数据库文件路径
        """
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            
            # 创建版本表
            DatabaseSchema._create_version_table(cursor)
            
            # 检查当前版本
            current_version = DatabaseSchema._get_current_version(cursor)
            
            if current_version == 0:
                # 首次初始化
                print(f"📚 [DatabaseSchema] 初始化数据库，版本: {DatabaseSchema.VERSION}")
                DatabaseSchema._create_all_tables(cursor)
                DatabaseSchema._create_all_indexes(cursor)
                DatabaseSchema._set_version(cursor, DatabaseSchema.VERSION)
            elif current_version < DatabaseSchema.VERSION:
                # 需要迁移
                print(f"📚 [DatabaseSchema] 数据库版本升级: {current_version} -> {DatabaseSchema.VERSION}")
                DatabaseSchema._migrate(cursor, current_version, DatabaseSchema.VERSION)
            else:
                print(f"📚 [DatabaseSchema] 数据库已是最新版本: {current_version}")
            
            conn.commit()
    
    @staticmethod
    def _create_version_table(cursor: sqlite3.Cursor) -> None:
        """创建版本表"""
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schema_version (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                version INTEGER NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
    @staticmethod
    def _get_current_version(cursor: sqlite3.Cursor) -> int:
        """获取当前数据库版本"""
        cursor.execute('SELECT version FROM schema_version WHERE id = 1')
        row = cursor.fetchone()
        return row[0] if row else 0
    
    @staticmethod
    def _set_version(cursor: sqlite3.Cursor, version: int) -> None:
        """设置数据库版本"""
        cursor.execute('''
            INSERT OR REPLACE INTO schema_version (id, version, updated_at)
            VALUES (1, ?, CURRENT_TIMESTAMP)
        ''', (version,))
    
    @staticmethod
    def _create_all_tables(cursor: sqlite3.Cursor) -> None:
        """创建所有表"""
        # 创建书籍表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS books (
                book_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT,
                filename TEXT,
                file_path TEXT,
                added_date INTEGER,
                language TEXT,
                file_size INTEGER,
                publisher TEXT,
                description TEXT,
                identifier TEXT,
                cover_path TEXT,
                font_family TEXT,
                font_mode TEXT DEFAULT 'auto',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 创建阅读进度表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reading_progress (
                book_id TEXT PRIMARY KEY,
                cfi TEXT,
                percentage REAL DEFAULT 0.0,
                chapter_title TEXT,
                timestamp INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES books (book_id) ON DELETE CASCADE
            )
        ''')
        
        # 创建注释表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS annotations (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                type TEXT NOT NULL,
                cfi_range TEXT,
                text TEXT,
                color TEXT,
                class_name TEXT,
                note TEXT,
                source TEXT,
                chapter_title TEXT,
                chapter_index INTEGER,
                timestamp INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES books (book_id) ON DELETE CASCADE
            )
        ''')
        
        print("📚 [DatabaseSchema] 所有表创建完成")
    
    @staticmethod
    def _create_all_indexes(cursor: sqlite3.Cursor) -> None:
        """创建所有索引"""
        # 书籍表索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_books_title ON books (title)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_books_author ON books (author)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_books_language ON books (language)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_books_added_date ON books (added_date)')
        
        # 注释表索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_annotations_book_id ON annotations (book_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations (type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_annotations_timestamp ON annotations (timestamp)')
        
        print("📚 [DatabaseSchema] 所有索引创建完成")
    
    @staticmethod
    def _migrate(cursor: sqlite3.Cursor, from_version: int, to_version: int) -> None:
        """
        数据库迁移
        
        Args:
            cursor: 数据库游标
            from_version: 当前版本
            to_version: 目标版本
        """
        print(f"📚 [DatabaseSchema] 执行数据库迁移: v{from_version} -> v{to_version}")
        
        # 这里可以添加版本迁移逻辑
        # 例如：
        # if from_version == 1 and to_version == 2:
        #     DatabaseSchema._migrate_v1_to_v2(cursor)
        
        # 更新版本号
        DatabaseSchema._set_version(cursor, to_version)
        print(f"📚 [DatabaseSchema] 迁移完成")
    
    @staticmethod
    def _migrate_v1_to_v2(cursor: sqlite3.Cursor) -> None:
        """从版本1迁移到版本2的示例"""
        # 示例：添加新字段
        # cursor.execute('ALTER TABLE books ADD COLUMN new_field TEXT')
        pass


class BookModel:
    """书籍模型"""
    
    TABLE_NAME = 'books'
    
    @staticmethod
    def get_columns() -> list:
        """获取所有列名"""
        return [
            'book_id', 'title', 'author', 'filename', 'file_path',
            'added_date', 'language', 'file_size', 'publisher',
            'description', 'identifier', 'cover_path', 'font_family',
            'font_mode', 'created_at', 'updated_at'
        ]


class ReadingProgressModel:
    """阅读进度模型"""
    
    TABLE_NAME = 'reading_progress'
    
    @staticmethod
    def get_columns() -> list:
        """获取所有列名"""
        return [
            'book_id', 'cfi', 'percentage', 'chapter_title',
            'timestamp', 'created_at', 'updated_at'
        ]


class AnnotationModel:
    """注释模型"""
    
    TABLE_NAME = 'annotations'
    
    @staticmethod
    def get_columns() -> list:
        """获取所有列名"""
        return [
            'id', 'book_id', 'type', 'cfi_range', 'text',
            'color', 'class_name', 'note', 'source',
            'chapter_title', 'chapter_index', 'timestamp',
            'created_at', 'updated_at'
        ]
    
    @staticmethod
    def get_valid_types() -> list:
        """获取有效的注释类型"""
        return ['highlight', 'underline', 'note', 'mark']
