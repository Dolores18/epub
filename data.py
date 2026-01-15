#!/usr/bin/env python3
"""
数据管理服务层
统一的数据访问接口，使用SQLite作为数据后端
"""

from typing import Dict, Any, Optional, List
from data_sqlite import SQLiteDataManager

# 全局数据管理器实例
_data_manager = SQLiteDataManager()


def get_data_manager() -> SQLiteDataManager:
    """
    获取数据管理器实例
    
    返回SQLite数据管理器实例
    这是访问数据的推荐方式
    """
    return _data_manager


# ============================================================================
# 便捷函数 - 用于向后兼容旧代码
# ============================================================================

def save_books_data() -> bool:
    """保存书籍数据"""
    return _data_manager.save_data()


def load_books_data() -> None:
    """加载书籍数据"""
    _data_manager.reload_data()


def get_books_storage() -> Dict[str, Any]:
    """获取书籍存储"""
    return _data_manager.books


def get_book_files() -> Dict[str, str]:
    """获取书籍文件映射"""
    return _data_manager.book_files


def get_reading_progress() -> Dict[str, Any]:
    """获取阅读进度"""
    return _data_manager.reading_progress


# ============================================================================
# 注释相关便捷函数
# ============================================================================

def add_book_annotation(book_id: str, annotation_data: Dict[str, Any]) -> Optional[str]:
    """添加书籍注释"""
    return _data_manager.add_annotation(book_id, annotation_data)


def get_book_annotations_data(book_id: str, annotation_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """获取书籍注释数据"""
    return _data_manager.get_book_annotations(book_id, annotation_type)


def remove_book_annotation(book_id: str, annotation_id: str) -> bool:
    """删除书籍注释"""
    return _data_manager.remove_annotation(book_id, annotation_id)


def update_book_annotation(book_id: str, annotation_id: str, updates: Dict[str, Any]) -> bool:
    """更新书籍注释"""
    return _data_manager.update_annotation(book_id, annotation_id, updates)


def clear_book_annotations_data(book_id: str, annotation_type: Optional[str] = None) -> int:
    """清除书籍注释数据"""
    return _data_manager.clear_book_annotations(book_id, annotation_type)


def export_book_annotations_data(book_id: str) -> Optional[Dict[str, Any]]:
    """导出书籍注释数据"""
    return _data_manager.export_book_annotations(book_id)


def import_book_annotations_data(book_id: str, import_data: Dict[str, Any], merge: bool = True) -> bool:
    """导入书籍注释数据"""
    return _data_manager.import_book_annotations(book_id, import_data, merge)
