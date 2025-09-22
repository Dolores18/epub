#!/usr/bin/env python3
"""
数据管理模块
负责管理书籍数据、文件路径和阅读进度的加载、保存和操作
"""

import json
import os
import time
from typing import Dict, Any, Optional


class DataManager:
    """数据管理器类 - 统一管理所有应用数据"""
    
    def __init__(self, data_file: str = 'books_data.json'):
        self.data_file = data_file
        self.books: Dict[str, Any] = {}
        self.book_files: Dict[str, str] = {}
        self.reading_progress: Dict[str, Any] = {}
        self._load_data()
    
    def _load_data(self) -> None:
        """从文件加载所有数据"""
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                self.books = data.get('books', {})
                self.book_files = data.get('book_files', {})
                self.reading_progress = data.get('reading_progress', {})
                
                print(f"📚 [DataManager] 从 {self.data_file} 加载了 {len(self.books)} 本书籍")
                print(f"📖 [DataManager] 加载了 {len(self.reading_progress)} 个阅读进度记录")
                
                # 打印加载的进度数据用于调试
                for book_id, progress in self.reading_progress.items():
                    percentage = progress.get('percentage', 0) * 100
                    print(f"📖 [DataManager] 进度记录: {book_id} -> {percentage:.1f}%")
            else:
                print(f"📚 [DataManager] 数据文件 {self.data_file} 不存在，使用空数据")
        except Exception as e:
            print(f"❌ [DataManager] 加载数据失败: {e}")
            self._reset_data()
    
    def _reset_data(self) -> None:
        """重置所有数据为空"""
        self.books = {}
        self.book_files = {}
        self.reading_progress = {}
    
    def save_data(self) -> bool:
        """保存所有数据到文件"""
        print(f"📚 [DataManager] save_data被调用")
        print(f"📚 [DataManager] 准备保存 {len(self.reading_progress)} 个进度记录")
        
        try:
            data = {
                'books': self.books,
                'book_files': self.book_files,
                'reading_progress': self.reading_progress,
                'saved_at': time.time()
            }
            
            print(f"📚 [DataManager] 保存的进度数据: {self.reading_progress}")
            
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"📚 [DataManager] ✅ 数据已保存到 {self.data_file}")
            return True
        except Exception as e:
            print(f"❌ [DataManager] 保存数据失败: {e}")
            return False
    
    def reload_data(self) -> None:
        """重新加载数据"""
        print("🔄 [DataManager] 重新加载数据...")
        self._load_data()
    
    # 书籍管理方法
    def add_book(self, book_id: str, book_info: Dict[str, Any], file_path: str) -> None:
        """添加书籍"""
        self.books[book_id] = book_info
        self.book_files[book_id] = file_path
        print(f"📚 [DataManager] 添加书籍: {book_id}")
    
    def remove_book(self, book_id: str) -> bool:
        """移除书籍（包括实际文件）"""
        removed = False
        
        # 获取要删除的文件路径
        book_info = self.books.get(book_id)
        book_file_path = self.book_files.get(book_id)
        
        # 删除EPUB文件
        if book_file_path and os.path.exists(book_file_path):
            try:
                os.remove(book_file_path)
                print(f"🗑️ [DataManager] 删除书籍文件: {book_file_path}")
                removed = True
            except Exception as e:
                print(f"❌ [DataManager] 删除书籍文件失败: {e}")
        
        # 删除封面文件
        if book_info and book_info.get('coverPath'):
            cover_path = book_info['coverPath']
            if os.path.exists(cover_path):
                try:
                    os.remove(cover_path)
                    print(f"🗑️ [DataManager] 删除封面文件: {cover_path}")
                except Exception as e:
                    print(f"❌ [DataManager] 删除封面文件失败: {e}")
        
        # 删除可能的解压目录
        if book_file_path:
            # 检查是否存在对应的解压目录 (book_xxx_extracted)
            base_name = os.path.splitext(os.path.basename(book_file_path))[0]
            extracted_dir = os.path.join(os.path.dirname(book_file_path), f"{base_name}_extracted")
            if os.path.exists(extracted_dir) and os.path.isdir(extracted_dir):
                try:
                    import shutil
                    shutil.rmtree(extracted_dir)
                    print(f"🗑️ [DataManager] 删除解压目录: {extracted_dir}")
                except Exception as e:
                    print(f"❌ [DataManager] 删除解压目录失败: {e}")
        
        # 删除JSON记录
        if book_id in self.books:
            del self.books[book_id]
            removed = True
        if book_id in self.book_files:
            del self.book_files[book_id]
            removed = True
        if book_id in self.reading_progress:
            del self.reading_progress[book_id]
            removed = True
        
        if removed:
            print(f"📚 [DataManager] 完全移除书籍: {book_id}")
        return removed
    
    def get_book(self, book_id: str) -> Optional[Dict[str, Any]]:
        """获取书籍信息"""
        return self.books.get(book_id)
    
    def get_book_file_path(self, book_id: str) -> Optional[str]:
        """获取书籍文件路径"""
        return self.book_files.get(book_id)
    
    def get_all_books(self) -> Dict[str, Any]:
        """获取所有书籍"""
        return self.books.copy()
    
    # 阅读进度管理方法
    def get_progress(self, book_id: str) -> Optional[Dict[str, Any]]:
        """获取阅读进度"""
        print(f"📖 [DataManager] get_progress被调用，查找: '{book_id}'")
        print(f"📖 [DataManager] 当前所有进度键: {list(self.reading_progress.keys())}")
        
        progress = self.reading_progress.get(book_id)
        if progress:
            print(f"📖 [DataManager] ✅ 找到进度: {book_id} -> {progress.get('percentage', 0)*100:.1f}%")
        else:
            print(f"📖 [DataManager] ❌ 没有找到进度: '{book_id}'")
            # 检查是否有相似的键
            for key in self.reading_progress.keys():
                if book_id in key or key in book_id:
                    print(f"📖 [DataManager] 🔍 发现相似键: '{key}'")
        return progress
    
    def set_progress(self, book_id: str, progress_data: Dict[str, Any]) -> None:
        """设置阅读进度"""
        print(f"📖 [DataManager] set_progress被调用，设置: '{book_id}'")
        print(f"📖 [DataManager] 进度数据: {progress_data}")
        
        self.reading_progress[book_id] = progress_data
        percentage = progress_data.get('percentage', 0) * 100
        print(f"📖 [DataManager] ✅ 设置进度: '{book_id}' -> {percentage:.1f}%")
        print(f"📖 [DataManager] 当前所有进度键: {list(self.reading_progress.keys())}")
    
    def remove_progress(self, book_id: str) -> bool:
        """移除阅读进度"""
        if book_id in self.reading_progress:
            del self.reading_progress[book_id]
            print(f"📖 [DataManager] 移除进度: {book_id}")
            return True
        return False
    
    def get_all_progress(self) -> Dict[str, Any]:
        """获取所有阅读进度"""
        return self.reading_progress.copy()
    
    # 文件验证方法
    def validate_book_files(self) -> None:
        """验证书籍文件是否存在，移除无效的书籍"""
        invalid_books = []
        
        for book_id, book_path in self.book_files.items():
            if not os.path.exists(book_path):
                print(f"⚠️  [DataManager] 书籍文件不存在: {book_id} ({book_path})")
                invalid_books.append(book_id)
        
        # 移除无效的书籍
        for book_id in invalid_books:
            self.remove_book(book_id)
        
        if invalid_books:
            print(f"📚 [DataManager] 清理了 {len(invalid_books)} 个无效书籍")
    
    # 统计方法
    def get_stats(self) -> Dict[str, int]:
        """获取数据统计"""
        return {
            'books_count': len(self.books),
            'progress_count': len(self.reading_progress),
            'files_count': len(self.book_files)
        }
    
    def __str__(self) -> str:
        """字符串表示"""
        stats = self.get_stats()
        return f"DataManager(books={stats['books_count']}, progress={stats['progress_count']}, files={stats['files_count']})"


# 全局数据管理器实例
data_manager = DataManager()


def get_data_manager() -> DataManager:
    """获取全局数据管理器实例"""
    return data_manager


# 便捷函数，用于向后兼容
def save_books_data() -> bool:
    """保存书籍数据"""
    return data_manager.save_data()


def load_books_data() -> None:
    """加载书籍数据"""
    data_manager.reload_data()


def get_books_storage() -> Dict[str, Any]:
    """获取书籍存储"""
    return data_manager.books


def get_book_files() -> Dict[str, str]:
    """获取书籍文件映射"""
    return data_manager.book_files


def get_reading_progress() -> Dict[str, Any]:
    """获取阅读进度"""
    return data_manager.reading_progress