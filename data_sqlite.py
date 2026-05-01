#!/usr/bin/env python3
"""
SQLite数据管理模块
负责管理书籍数据、文件路径和阅读进度的加载、保存和操作
"""

import sqlite3
import json
import os
import time
from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime

from models import DatabaseSchema, BookModel, ReadingProgressModel, AnnotationModel


class SQLiteDataManager:
    """SQLite数据管理器类 - 统一管理所有应用数据"""
    
    def __init__(self, db_file: str = 'books_data.db'):
        self.db_file = db_file
        self._init_database()
        print(f"📚 [SQLiteDataManager] 初始化完成，数据库文件: {self.db_file}")
    
    def _init_database(self) -> None:
        """初始化数据库"""
        DatabaseSchema.init_database(self.db_file)
    
    def _get_connection(self) -> sqlite3.Connection:
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row  # 使结果可以通过列名访问
        return conn
    
    # 书籍管理方法
    def add_book(self, book_id: str, book_info: Dict[str, Any], file_path: str) -> None:
        """添加书籍"""
        # 确保书籍信息包含字体设置字段（如果没有则设置默认值）
        if 'fontFamily' not in book_info:
            book_info['fontFamily'] = None
        if 'fontMode' not in book_info:
            book_info['fontMode'] = 'auto'
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO books (
                    book_id, title, author, filename, file_path, added_date,
                    language, file_size, publisher, description, identifier,
                    cover_path, font_family, font_mode, font_size, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                book_id,
                book_info.get('title', ''),
                book_info.get('author', ''),
                book_info.get('filename', ''),
                file_path,
                book_info.get('addedDate', int(time.time() * 1000)),
                book_info.get('language', ''),
                book_info.get('fileSize', 0),
                book_info.get('publisher', ''),
                book_info.get('description', ''),
                book_info.get('identifier', ''),
                book_info.get('coverPath', ''),
                book_info.get('fontFamily'),
                book_info.get('fontMode', 'auto'),
                book_info.get('fontSize')
            ))
            conn.commit()
        
        print(f"📚 [SQLiteDataManager] 添加书籍: {book_id}")
    
    def remove_book(self, book_id: str) -> bool:
        """移除书籍（包括实际文件和相关数据）"""
        removed = False
        
        # 获取要删除的书籍信息
        book_info = self.get_book(book_id)
        if not book_info:
            print(f"❌ [SQLiteDataManager] 书籍不存在: {book_id}")
            return False
        
        # 删除EPUB文件
        file_path = book_info.get('file_path')
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"🗑️ [SQLiteDataManager] 删除书籍文件: {file_path}")
                removed = True
            except Exception as e:
                print(f"❌ [SQLiteDataManager] 删除书籍文件失败: {e}")
        
        # 删除封面文件
        cover_path = book_info.get('cover_path')
        if cover_path and os.path.exists(cover_path):
            try:
                os.remove(cover_path)
                print(f"🗑️ [SQLiteDataManager] 删除封面文件: {cover_path}")
            except Exception as e:
                print(f"❌ [SQLiteDataManager] 删除封面文件失败: {e}")
        
        # 删除可能的解压目录
        if file_path:
            base_name = os.path.splitext(os.path.basename(file_path))[0]
            extracted_dir = os.path.join(os.path.dirname(file_path), f"{base_name}_extracted")
            if os.path.exists(extracted_dir) and os.path.isdir(extracted_dir):
                try:
                    import shutil
                    shutil.rmtree(extracted_dir)
                    print(f"🗑️ [SQLiteDataManager] 删除解压目录: {extracted_dir}")
                except Exception as e:
                    print(f"❌ [SQLiteDataManager] 删除解压目录失败: {e}")
        
        # 删除数据库记录（包括关联的进度和注释）
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM books WHERE book_id = ?', (book_id,))
            conn.commit()
            removed = True
        
        if removed:
            print(f"📚 [SQLiteDataManager] 完全移除书籍: {book_id}")
        return removed
    
    def get_book(self, book_id: str) -> Optional[Dict[str, Any]]:
        """获取书籍信息"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM books WHERE book_id = ?', (book_id,))
            row = cursor.fetchone()
            
            if row:
                return {
                    'title': row['title'],
                    'author': row['author'],
                    'filename': row['filename'],
                    'addedDate': str(row['added_date']),
                    'language': row['language'],
                    'fileSize': row['file_size'],
                    'publisher': row['publisher'],
                    'description': row['description'],
                    'identifier': row['identifier'],
                    'coverPath': row['cover_path'],
                    'fontFamily': row['font_family'],
                    'fontMode': row['font_mode'],
                    'fontSize': row['font_size'],
                    'file_path': row['file_path']
                }
            return None
    
    def get_book_file_path(self, book_id: str) -> Optional[str]:
        """获取书籍文件路径"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT file_path FROM books WHERE book_id = ?', (book_id,))
            row = cursor.fetchone()
            return row['file_path'] if row else None
    
    def get_all_books(self) -> Dict[str, Any]:
        """获取所有书籍"""
        books = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM books')
            rows = cursor.fetchall()
            
            for row in rows:
                book_id = row['book_id']
                books[book_id] = {
                    'title': row['title'],
                    'author': row['author'],
                    'filename': row['filename'],
                    'addedDate': str(row['added_date']),
                    'language': row['language'],
                    'fileSize': row['file_size'],
                    'publisher': row['publisher'],
                    'description': row['description'],
                    'identifier': row['identifier'],
                    'coverPath': row['cover_path'],
                    'fontFamily': row['font_family'],
                    'fontMode': row['font_mode'],
                    'fontSize': row['font_size']
                }
        
        return books
    
    def get_book_files(self) -> Dict[str, str]:
        """获取书籍文件映射"""
        book_files = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT book_id, file_path FROM books')
            rows = cursor.fetchall()
            
            for row in rows:
                book_files[row['book_id']] = row['file_path']
        
        return book_files
    
    # 字体设置管理方法
    _NOT_PROVIDED = object()  # 哨兵值，区分"未传"和"传了None"
    
    def set_book_font(self, book_id: str, font_family=_NOT_PROVIDED, font_mode=_NOT_PROVIDED, font_size=_NOT_PROVIDED) -> bool:
        """设置书籍字体（部分更新：只更新传入的字段，不覆盖未传的字段）"""
        updates = []
        params = []
        
        if font_family is not self._NOT_PROVIDED:
            updates.append('font_family = ?')
            params.append(font_family)
        if font_mode is not self._NOT_PROVIDED:
            updates.append('font_mode = ?')
            params.append(font_mode)
        if font_size is not self._NOT_PROVIDED:
            updates.append('font_size = ?')
            params.append(font_size)
        
        if not updates:
            return False
        
        updates.append('updated_at = CURRENT_TIMESTAMP')
        params.append(book_id)
        
        sql = f"UPDATE books SET {', '.join(updates)} WHERE book_id = ?"
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            
            if cursor.rowcount > 0:
                conn.commit()
                print(f"🔤 [SQLiteDataManager] 更新书籍字体设置: {book_id}")
                print(f"🔤 [SQLiteDataManager] 字体: {font_family if font_family is not self._NOT_PROVIDED else '(未变)'}, "
                      f"模式: {font_mode if font_mode is not self._NOT_PROVIDED else '(未变)'}, "
                      f"大小: {font_size if font_size is not self._NOT_PROVIDED else '(未变)'}")
                return True
            else:
                print(f"❌ [SQLiteDataManager] 书籍不存在: {book_id}")
                return False
    
    def get_book_font(self, book_id: str) -> Optional[Dict[str, Any]]:
        """获取书籍字体设置（包括字体族和字体大小）"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT font_family, font_mode, font_size FROM books WHERE book_id = ?', (book_id,))
            row = cursor.fetchone()
            
            if row:
                return {
                    'fontFamily': row['font_family'],
                    'fontMode': row['font_mode'] or 'auto',
                    'fontSize': row['font_size']
                }
            return None
    
    # 阅读进度管理方法
    def get_progress(self, book_id: str) -> Optional[Dict[str, Any]]:
        """获取阅读进度"""
        print(f"📖 [SQLiteDataManager] get_progress被调用，查找: '{book_id}'")
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM reading_progress WHERE book_id = ?', (book_id,))
            row = cursor.fetchone()
            
            if row:
                progress = {
                    'cfi': row['cfi'],
                    'percentage': row['percentage'],
                    'chapterTitle': row['chapter_title'],
                    'timestamp': row['timestamp']
                }
                print(f"📖 [SQLiteDataManager] ✅ 找到进度: {book_id} -> {progress['percentage']*100:.1f}%")
                return progress
            else:
                print(f"📖 [SQLiteDataManager] ❌ 没有找到进度: '{book_id}'")
                return None
    
    def set_progress(self, book_id: str, progress_data: Dict[str, Any]) -> None:
        """设置阅读进度"""
        print(f"📖 [SQLiteDataManager] set_progress被调用，设置: '{book_id}'")
        print(f"📖 [SQLiteDataManager] 进度数据: {progress_data}")
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO reading_progress (
                    book_id, cfi, percentage, chapter_title, timestamp, updated_at
                ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                book_id,
                progress_data.get('cfi', ''),
                progress_data.get('percentage', 0.0),
                progress_data.get('chapterTitle', ''),
                progress_data.get('timestamp', int(time.time() * 1000))
            ))
            conn.commit()
        
        percentage = progress_data.get('percentage', 0) * 100
        print(f"📖 [SQLiteDataManager] ✅ 设置进度: '{book_id}' -> {percentage:.1f}%")
    
    def remove_progress(self, book_id: str) -> bool:
        """移除阅读进度"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM reading_progress WHERE book_id = ?', (book_id,))
            
            if cursor.rowcount > 0:
                conn.commit()
                print(f"📖 [SQLiteDataManager] 移除进度: {book_id}")
                return True
            return False
    
    def get_all_progress(self) -> Dict[str, Any]:
        """获取所有阅读进度"""
        progress = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM reading_progress')
            rows = cursor.fetchall()
            
            for row in rows:
                book_id = row['book_id']
                progress[book_id] = {
                    'cfi': row['cfi'],
                    'percentage': row['percentage'],
                    'chapterTitle': row['chapter_title'],
                    'timestamp': row['timestamp']
                }
        
        return progress
    
    # 注释管理方法
    def add_annotation(self, book_id: str, annotation_data: Dict[str, Any]) -> Optional[str]:
        """添加注释"""
        annotation_id = annotation_data.get('id') or f"annotation_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO annotations (
                    id, book_id, type, cfi_range, text, color, class_name,
                    note, source, chapter_title, chapter_index, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                annotation_id,
                book_id,
                annotation_data.get('type', 'highlight'),
                annotation_data.get('cfiRange', ''),
                annotation_data.get('text', ''),
                annotation_data.get('color', ''),
                annotation_data.get('className', ''),
                annotation_data.get('note', ''),
                annotation_data.get('source', ''),
                annotation_data.get('chapterTitle'),
                annotation_data.get('chapterIndex'),
                annotation_data.get('timestamp', int(time.time() * 1000))
            ))
            conn.commit()
        
        print(f"📝 [SQLiteDataManager] 添加注释: {annotation_id}")
        return annotation_id
    
    def get_book_annotations(self, book_id: str, annotation_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取书籍注释"""
        annotations = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            if annotation_type:
                cursor.execute('SELECT * FROM annotations WHERE book_id = ? AND type = ?', (book_id, annotation_type))
            else:
                cursor.execute('SELECT * FROM annotations WHERE book_id = ?', (book_id,))
            
            rows = cursor.fetchall()
            
            for row in rows:
                annotations.append({
                    'id': row['id'],
                    'bookId': row['book_id'],
                    'type': row['type'],
                    'cfiRange': row['cfi_range'],
                    'text': row['text'],
                    'color': row['color'],
                    'className': row['class_name'],
                    'note': row['note'],
                    'source': row['source'],
                    'chapterTitle': row['chapter_title'],
                    'chapterIndex': row['chapter_index'],
                    'timestamp': row['timestamp']
                })
        
        return annotations
    
    def remove_annotation(self, book_id: str, annotation_id: str) -> bool:
        """删除注释"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM annotations WHERE book_id = ? AND id = ?', (book_id, annotation_id))
            
            if cursor.rowcount > 0:
                conn.commit()
                print(f"📝 [SQLiteDataManager] 删除注释: {annotation_id}")
                return True
            return False
    
    def update_annotation(self, book_id: str, annotation_id: str, updates: Dict[str, Any]) -> bool:
        """更新注释"""
        if not updates:
            return False
        
        # 构建更新语句
        set_clauses = []
        values = []
        
        for key, value in updates.items():
            if key == 'cfiRange':
                set_clauses.append('cfi_range = ?')
            elif key == 'className':
                set_clauses.append('class_name = ?')
            elif key == 'chapterTitle':
                set_clauses.append('chapter_title = ?')
            elif key == 'chapterIndex':
                set_clauses.append('chapter_index = ?')
            elif key in ['type', 'text', 'color', 'note', 'source', 'timestamp']:
                set_clauses.append(f'{key} = ?')
            else:
                continue
            values.append(value)
        
        if not set_clauses:
            return False
        
        set_clauses.append('updated_at = CURRENT_TIMESTAMP')
        values.extend([book_id, annotation_id])
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f'''
                UPDATE annotations 
                SET {', '.join(set_clauses)}
                WHERE book_id = ? AND id = ?
            ''', values)
            
            if cursor.rowcount > 0:
                conn.commit()
                print(f"📝 [SQLiteDataManager] 更新注释: {annotation_id}")
                return True
            return False
    
    def clear_book_annotations(self, book_id: str, annotation_type: Optional[str] = None) -> int:
        """清除书籍注释"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            if annotation_type:
                cursor.execute('DELETE FROM annotations WHERE book_id = ? AND type = ?', (book_id, annotation_type))
            else:
                cursor.execute('DELETE FROM annotations WHERE book_id = ?', (book_id,))
            
            count = cursor.rowcount
            if count > 0:
                conn.commit()
                print(f"📝 [SQLiteDataManager] 清除注释: {book_id}, 数量: {count}")
            
            return count
    
    def export_book_annotations(self, book_id: str) -> Optional[Dict[str, Any]]:
        """导出书籍注释"""
        annotations = self.get_book_annotations(book_id)
        if annotations:
            return {
                'version': '1.0',
                'bookId': book_id,
                'exportedAt': datetime.now().isoformat(),
                'annotations': annotations
            }
        return None
    
    def import_book_annotations(self, book_id: str, import_data: Dict[str, Any], merge: bool = True) -> bool:
        """导入书籍注释"""
        try:
            annotations = import_data.get('annotations', [])
            if not annotations:
                return False
            
            if not merge:
                # 清除现有注释
                self.clear_book_annotations(book_id)
            
            # 导入注释
            for annotation in annotations:
                annotation['bookId'] = book_id  # 确保book_id正确
                self.add_annotation(book_id, annotation)
            
            print(f"📝 [SQLiteDataManager] 导入注释: {book_id}, 数量: {len(annotations)}")
            return True
        except Exception as e:
            print(f"❌ [SQLiteDataManager] 导入注释失败: {e}")
            return False
    
    # 文件验证方法
    def validate_book_files(self) -> None:
        """验证书籍文件是否存在，移除无效的书籍"""
        invalid_books = []
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT book_id, file_path FROM books')
            rows = cursor.fetchall()
            
            for row in rows:
                book_id = row['book_id']
                file_path = row['file_path']
                
                if not os.path.exists(file_path):
                    print(f"⚠️  [SQLiteDataManager] 书籍文件不存在: {book_id} ({file_path})")
                    invalid_books.append(book_id)
        
        # 移除无效的书籍
        for book_id in invalid_books:
            self.remove_book(book_id)
        
        if invalid_books:
            print(f"📚 [SQLiteDataManager] 清理了 {len(invalid_books)} 个无效书籍")
    
    # 统计方法
    def get_stats(self) -> Dict[str, int]:
        """获取数据统计"""
        stats = {}
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 书籍统计
            cursor.execute('SELECT COUNT(*) FROM books')
            stats['books_count'] = cursor.fetchone()[0]
            
            # 进度统计
            cursor.execute('SELECT COUNT(*) FROM reading_progress')
            stats['progress_count'] = cursor.fetchone()[0]
            
            # 注释统计
            cursor.execute('SELECT COUNT(*) FROM annotations')
            stats['annotations_count'] = cursor.fetchone()[0]
            
            # 有注释的书籍数量
            cursor.execute('SELECT COUNT(DISTINCT book_id) FROM annotations')
            stats['annotated_books_count'] = cursor.fetchone()[0]
            
            stats['files_count'] = stats['books_count']  # 兼容性
        
        return stats
    
    def save_data(self) -> bool:
        """保存数据（SQLite自动保存，此方法用于兼容性）"""
        print(f"📚 [SQLiteDataManager] save_data被调用（SQLite自动保存）")
        return True
    
    def reload_data(self) -> None:
        """重新加载数据（SQLite实时读取，此方法用于兼容性）"""
        print("🔄 [SQLiteDataManager] reload_data被调用（SQLite实时读取）")
    
    def __str__(self) -> str:
        """字符串表示"""
        stats = self.get_stats()
        return f"SQLiteDataManager(books={stats['books_count']}, progress={stats['progress_count']}, annotations={stats['annotations_count']})"
    
    # 兼容性属性，用于向后兼容原有代码
    @property
    def books(self) -> Dict[str, Any]:
        """兼容性属性：获取所有书籍"""
        return self.get_all_books()
    
    @property
    def book_files(self) -> Dict[str, str]:
        """兼容性属性：获取书籍文件映射"""
        return self.get_book_files()
    
    @property
    def reading_progress(self) -> Dict[str, Any]:
        """兼容性属性：获取所有阅读进度"""
        return self.get_all_progress()


# 迁移函数
def migrate_from_json(json_data_file: str = 'books_data.json', 
                     json_annotations_file: str = 'annotations.json',
                     sqlite_db_file: str = 'books_data.db') -> bool:
    """从JSON文件迁移数据到SQLite"""
    print("🔄 [Migration] 开始从JSON迁移到SQLite...")
    
    # 创建SQLite数据管理器
    sqlite_manager = SQLiteDataManager(sqlite_db_file)
    
    try:
        # 迁移书籍数据
        if os.path.exists(json_data_file):
            with open(json_data_file, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
            
            books = json_data.get('books', {})
            book_files = json_data.get('book_files', {})
            reading_progress = json_data.get('reading_progress', {})
            
            print(f"📚 [Migration] 迁移 {len(books)} 本书籍...")
            
            # 迁移书籍信息
            for book_id, book_info in books.items():
                file_path = book_files.get(book_id, '')
                sqlite_manager.add_book(book_id, book_info, file_path)
            
            # 迁移阅读进度
            print(f"📖 [Migration] 迁移 {len(reading_progress)} 个阅读进度...")
            for book_id, progress_data in reading_progress.items():
                sqlite_manager.set_progress(book_id, progress_data)
        
        # 迁移注释数据
        if os.path.exists(json_annotations_file):
            with open(json_annotations_file, 'r', encoding='utf-8') as f:
                annotations_data = json.load(f)
            
            annotations = annotations_data.get('annotations', {})
            total_annotations = sum(len(book_annotations) for book_annotations in annotations.values())
            print(f"📝 [Migration] 迁移 {total_annotations} 个注释...")
            
            for book_id, book_annotations in annotations.items():
                for annotation in book_annotations:
                    sqlite_manager.add_annotation(book_id, annotation)
        
        print("✅ [Migration] 迁移完成！")
        
        # 显示统计信息
        stats = sqlite_manager.get_stats()
        print(f"📊 [Migration] 迁移结果: {stats}")
        
        return True
        
    except Exception as e:
        print(f"❌ [Migration] 迁移失败: {e}")
        return False


# 全局数据管理器实例
sqlite_data_manager = None


def get_sqlite_data_manager(db_file: str = 'books_data.db') -> SQLiteDataManager:
    """获取全局SQLite数据管理器实例"""
    global sqlite_data_manager
    if sqlite_data_manager is None:
        sqlite_data_manager = SQLiteDataManager(db_file)
    return sqlite_data_manager


# 便捷函数，用于向后兼容
def save_books_data() -> bool:
    """保存书籍数据"""
    return get_sqlite_data_manager().save_data()


def load_books_data() -> None:
    """加载书籍数据"""
    get_sqlite_data_manager().reload_data()


def get_books_storage() -> Dict[str, Any]:
    """获取书籍存储"""
    return get_sqlite_data_manager().get_all_books()


def get_book_files() -> Dict[str, str]:
    """获取书籍文件映射"""
    return get_sqlite_data_manager().get_book_files()


def get_reading_progress() -> Dict[str, Any]:
    """获取阅读进度"""
    return get_sqlite_data_manager().get_all_progress()


# 注释相关便捷函数
def add_book_annotation(book_id: str, annotation_data: Dict[str, Any]) -> Optional[str]:
    """添加书籍注释"""
    return get_sqlite_data_manager().add_annotation(book_id, annotation_data)


def get_book_annotations_data(book_id: str, annotation_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """获取书籍注释数据"""
    return get_sqlite_data_manager().get_book_annotations(book_id, annotation_type)


def remove_book_annotation(book_id: str, annotation_id: str) -> bool:
    """删除书籍注释"""
    return get_sqlite_data_manager().remove_annotation(book_id, annotation_id)


def update_book_annotation(book_id: str, annotation_id: str, updates: Dict[str, Any]) -> bool:
    """更新书籍注释"""
    return get_sqlite_data_manager().update_annotation(book_id, annotation_id, updates)


def clear_book_annotations_data(book_id: str, annotation_type: Optional[str] = None) -> int:
    """清除书籍注释数据"""
    return get_sqlite_data_manager().clear_book_annotations(book_id, annotation_type)


def export_book_annotations_data(book_id: str) -> Optional[Dict[str, Any]]:
    """导出书籍注释数据"""
    return get_sqlite_data_manager().export_book_annotations(book_id)


def import_book_annotations_data(book_id: str, import_data: Dict[str, Any], merge: bool = True) -> bool:
    """导入书籍注释数据"""
    return get_sqlite_data_manager().import_book_annotations(book_id, import_data, merge)


if __name__ == "__main__":
    # 如果直接运行此脚本，执行迁移
    print("🚀 开始数据迁移...")
    success = migrate_from_json()
    if success:
        print("🎉 数据迁移成功完成！")
    else:
        print("💥 数据迁移失败！")