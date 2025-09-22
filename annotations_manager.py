#!/usr/bin/env python3
"""
注释数据管理模块
负责管理EPUB阅读器的高亮、下划线、笔记等注释数据
"""

import json
import os
import time
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone


class AnnotationManager:
    """注释数据管理器类 - 专门管理注释相关数据"""
    
    def __init__(self, data_file: str = 'annotations.json'):
        self.data_file = data_file
        self.annotations: Dict[str, List[Dict[str, Any]]] = {}  # bookId -> annotations[]
        self.version = "1.0"
        self._load_data()
    
    def _load_data(self) -> None:
        """从文件加载注释数据"""
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                self.version = data.get('version', '1.0')
                self.annotations = data.get('annotations', {})
                
                # 统计加载的注释数量
                total_annotations = sum(len(book_annotations) for book_annotations in self.annotations.values())
                print(f"📝 [AnnotationManager] 从 {self.data_file} 加载了 {len(self.annotations)} 本书的注释")
                print(f"📝 [AnnotationManager] 总共 {total_annotations} 个注释")
                
            else:
                print(f"📝 [AnnotationManager] 注释文件 {self.data_file} 不存在，使用空数据")
                self._initialize_empty_data()
                
        except Exception as e:
            print(f"❌ [AnnotationManager] 加载注释数据失败: {e}")
            self._initialize_empty_data()
    
    def _initialize_empty_data(self) -> None:
        """初始化空的注释数据"""
        self.annotations = {}
        self.version = "1.0"
    
    def save_data(self) -> bool:
        """保存注释数据到文件"""
        try:
            # 统计当前数据
            total_annotations = sum(len(book_annotations) for book_annotations in self.annotations.values())
            print(f"📝 [AnnotationManager] 准备保存 {len(self.annotations)} 本书的注释")
            print(f"📝 [AnnotationManager] 总共 {total_annotations} 个注释")
            
            data = {
                'version': self.version,
                'lastModified': datetime.now(timezone.utc).isoformat(),
                'annotations': self.annotations
            }
            
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"📝 [AnnotationManager] ✅ 注释数据已保存到 {self.data_file}")
            return True
            
        except Exception as e:
            print(f"❌ [AnnotationManager] 保存注释数据失败: {e}")
            return False
    
    def reload_data(self) -> None:
        """重新加载注释数据"""
        print("🔄 [AnnotationManager] 重新加载注释数据...")
        self._load_data()
    
    # 注释CRUD操作
    def add_annotation(self, book_id: str, annotation_data: Dict[str, Any]) -> str:
        """添加注释"""
        # 确保必需字段存在
        if 'id' not in annotation_data:
            annotation_data['id'] = self._generate_annotation_id()
        
        if 'bookId' not in annotation_data:
            annotation_data['bookId'] = book_id
            
        if 'timestamp' not in annotation_data:
            annotation_data['timestamp'] = datetime.now(timezone.utc).isoformat()
        
        # 验证必需字段
        required_fields = ['id', 'bookId', 'type', 'cfiRange']
        for field in required_fields:
            if field not in annotation_data:
                raise ValueError(f"注释数据缺少必需字段: {field}")
        
        # 添加到对应书籍的注释列表
        if book_id not in self.annotations:
            self.annotations[book_id] = []
        
        self.annotations[book_id].append(annotation_data)
        
        print(f"📝 [AnnotationManager] 添加注释: {book_id} -> {annotation_data['type']} ({annotation_data['id']})")
        return annotation_data['id']
    
    def get_annotation(self, book_id: str, annotation_id: str) -> Optional[Dict[str, Any]]:
        """获取指定注释"""
        book_annotations = self.annotations.get(book_id, [])
        for annotation in book_annotations:
            if annotation.get('id') == annotation_id:
                return annotation.copy()
        return None
    
    def update_annotation(self, book_id: str, annotation_id: str, updates: Dict[str, Any]) -> bool:
        """更新注释"""
        book_annotations = self.annotations.get(book_id, [])
        for i, annotation in enumerate(book_annotations):
            if annotation.get('id') == annotation_id:
                # 更新字段
                annotation.update(updates)
                annotation['lastModified'] = datetime.now(timezone.utc).isoformat()
                
                print(f"📝 [AnnotationManager] 更新注释: {book_id} -> {annotation_id}")
                return True
        
        print(f"⚠️ [AnnotationManager] 未找到要更新的注释: {book_id} -> {annotation_id}")
        return False
    
    def remove_annotation(self, book_id: str, annotation_id: str) -> bool:
        """删除注释"""
        book_annotations = self.annotations.get(book_id, [])
        for i, annotation in enumerate(book_annotations):
            if annotation.get('id') == annotation_id:
                removed_annotation = book_annotations.pop(i)
                print(f"📝 [AnnotationManager] 删除注释: {book_id} -> {annotation_id} ({removed_annotation.get('type', 'unknown')})")
                
                # 如果书籍没有注释了，可以选择保留空列表或删除键
                if not book_annotations:
                    # 保留空列表，便于后续添加
                    pass
                
                return True
        
        print(f"⚠️ [AnnotationManager] 未找到要删除的注释: {book_id} -> {annotation_id}")
        return False
    
    def get_book_annotations(self, book_id: str, annotation_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取指定书籍的注释"""
        book_annotations = self.annotations.get(book_id, [])
        
        if annotation_type:
            # 过滤指定类型的注释
            filtered_annotations = [ann for ann in book_annotations if ann.get('type') == annotation_type]
            return [ann.copy() for ann in filtered_annotations]
        
        return [ann.copy() for ann in book_annotations]
    
    def get_all_annotations(self) -> Dict[str, List[Dict[str, Any]]]:
        """获取所有注释数据"""
        return {book_id: [ann.copy() for ann in annotations] 
                for book_id, annotations in self.annotations.items()}
    
    def clear_book_annotations(self, book_id: str, annotation_type: Optional[str] = None) -> int:
        """清除指定书籍的注释"""
        if book_id not in self.annotations:
            return 0
        
        if annotation_type:
            # 只删除指定类型的注释
            original_count = len(self.annotations[book_id])
            self.annotations[book_id] = [
                ann for ann in self.annotations[book_id] 
                if ann.get('type') != annotation_type
            ]
            removed_count = original_count - len(self.annotations[book_id])
            print(f"📝 [AnnotationManager] 清除书籍 {book_id} 的 {annotation_type} 注释: {removed_count} 个")
            return removed_count
        else:
            # 删除所有注释
            removed_count = len(self.annotations[book_id])
            self.annotations[book_id] = []
            print(f"📝 [AnnotationManager] 清除书籍 {book_id} 的所有注释: {removed_count} 个")
            return removed_count
    
    def remove_book_data(self, book_id: str) -> bool:
        """完全移除指定书籍的注释数据"""
        if book_id in self.annotations:
            removed_count = len(self.annotations[book_id])
            del self.annotations[book_id]
            print(f"📝 [AnnotationManager] 移除书籍 {book_id} 的所有注释数据: {removed_count} 个")
            return True
        return False
    
    # 导入导出功能
    def export_book_annotations(self, book_id: str) -> Dict[str, Any]:
        """导出指定书籍的注释数据"""
        book_annotations = self.get_book_annotations(book_id)
        return {
            'version': self.version,
            'bookId': book_id,
            'exportedAt': datetime.now(timezone.utc).isoformat(),
            'annotationsCount': len(book_annotations),
            'annotations': book_annotations
        }
    
    def import_book_annotations(self, book_id: str, import_data: Dict[str, Any], 
                              merge: bool = True) -> bool:
        """导入注释数据到指定书籍"""
        try:
            imported_annotations = import_data.get('annotations', [])
            
            if not merge:
                # 覆盖模式：清除现有注释
                self.annotations[book_id] = []
            
            # 导入注释
            imported_count = 0
            for annotation in imported_annotations:
                # 确保注释有有效的ID
                if 'id' not in annotation:
                    annotation['id'] = self._generate_annotation_id()
                
                # 更新bookId
                annotation['bookId'] = book_id
                
                # 添加导入时间戳
                annotation['importedAt'] = datetime.now(timezone.utc).isoformat()
                
                if book_id not in self.annotations:
                    self.annotations[book_id] = []
                
                self.annotations[book_id].append(annotation)
                imported_count += 1
            
            print(f"📝 [AnnotationManager] 导入书籍 {book_id} 的注释: {imported_count} 个")
            return True
            
        except Exception as e:
            print(f"❌ [AnnotationManager] 导入注释失败: {e}")
            return False
    
    # 工具方法
    def _generate_annotation_id(self) -> str:
        """生成唯一的注释ID"""
        timestamp = int(time.time() * 1000)  # 毫秒时间戳
        unique_id = str(uuid.uuid4())[:8]    # 短UUID
        return f"annotation_{timestamp}_{unique_id}"
    
    def get_stats(self) -> Dict[str, Any]:
        """获取注释统计信息"""
        total_annotations = 0
        type_counts = {}
        book_counts = {}
        
        for book_id, book_annotations in self.annotations.items():
            book_count = len(book_annotations)
            book_counts[book_id] = book_count
            total_annotations += book_count
            
            # 统计类型
            for annotation in book_annotations:
                annotation_type = annotation.get('type', 'unknown')
                type_counts[annotation_type] = type_counts.get(annotation_type, 0) + 1
        
        return {
            'totalAnnotations': total_annotations,
            'booksWithAnnotations': len(self.annotations),
            'typeDistribution': type_counts,
            'bookDistribution': book_counts,
            'version': self.version
        }
    
    def validate_data(self) -> List[str]:
        """验证数据完整性，返回问题列表"""
        issues = []
        
        for book_id, book_annotations in self.annotations.items():
            if not isinstance(book_annotations, list):
                issues.append(f"书籍 {book_id} 的注释数据不是列表类型")
                continue
            
            for i, annotation in enumerate(book_annotations):
                # 检查必需字段
                required_fields = ['id', 'type', 'cfiRange']
                for field in required_fields:
                    if field not in annotation:
                        issues.append(f"书籍 {book_id} 的注释 {i} 缺少字段: {field}")
                
                # 检查类型有效性
                valid_types = ['highlight', 'underline', 'note', 'mark']
                if annotation.get('type') not in valid_types:
                    issues.append(f"书籍 {book_id} 的注释 {i} 类型无效: {annotation.get('type')}")
        
        return issues
    
    def __str__(self) -> str:
        """字符串表示"""
        stats = self.get_stats()
        return f"AnnotationManager(books={stats['booksWithAnnotations']}, annotations={stats['totalAnnotations']})"


# 全局注释管理器实例
annotation_manager = AnnotationManager()


def get_annotation_manager() -> AnnotationManager:
    """获取全局注释管理器实例"""
    return annotation_manager


# 便捷函数
def save_annotations_data() -> bool:
    """保存注释数据"""
    return annotation_manager.save_data()


def load_annotations_data() -> None:
    """加载注释数据"""
    annotation_manager.reload_data()


def get_book_annotations(book_id: str, annotation_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """获取书籍注释"""
    return annotation_manager.get_book_annotations(book_id, annotation_type)


def add_annotation(book_id: str, annotation_data: Dict[str, Any]) -> str:
    """添加注释"""
    return annotation_manager.add_annotation(book_id, annotation_data)


def remove_annotation(book_id: str, annotation_id: str) -> bool:
    """删除注释"""
    return annotation_manager.remove_annotation(book_id, annotation_id)


def get_annotations_stats() -> Dict[str, Any]:
    """获取注释统计"""
    return annotation_manager.get_stats()


if __name__ == "__main__":
    # 测试代码
    print("📝 测试注释管理器...")
    
    # 测试添加注释
    test_annotation = {
        'type': 'highlight',
        'cfiRange': 'epubcfi(/6/4[chapter01]!/4/2/8,/1:25,/1:45)',
        'color': 'yellow',
        'text': '测试高亮文本',
        'note': '这是一个测试注释'
    }
    
    annotation_id = add_annotation('test_book_001', test_annotation)
    print(f"📝 添加的注释ID: {annotation_id}")
    
    # 测试获取注释
    annotations = get_book_annotations('test_book_001')
    print(f"📝 获取到的注释: {len(annotations)} 个")
    
    # 测试统计
    stats = get_annotations_stats()
    print(f"📝 注释统计: {stats}")
    
    # 测试保存
    save_result = save_annotations_data()
    print(f"📝 保存结果: {save_result}")
