#!/usr/bin/env python3
"""
SQLite数据管理器演示脚本
"""

import os
from data_sqlite import get_sqlite_data_manager

def demo_sqlite_operations():
    """演示SQLite数据管理器的基本操作"""
    print("🚀 SQLite数据管理器演示")
    print("=" * 50)
    
    # 获取数据管理器实例
    manager = get_sqlite_data_manager('books_data.db')
    
    # 获取统计信息
    stats = manager.get_stats()
    print(f"\n📊 数据库统计:")
    print(f"   📚 书籍总数: {stats['books_count']}")
    print(f"   📖 阅读进度: {stats['progress_count']}")
    print(f"   📝 注释总数: {stats['annotations_count']}")
    print(f"   📖 有注释的书籍: {stats['annotated_books_count']}")
    
    # 获取所有书籍
    books = manager.get_all_books()
    print(f"\n📚 书籍列表:")
    for book_id, book_info in list(books.items())[:3]:  # 只显示前3本
        print(f"   📖 {book_info['title']}")
        print(f"      作者: {book_info['author']}")
        print(f"      语言: {book_info['language']}")
        
        # 获取阅读进度
        progress = manager.get_progress(book_id)
        if progress:
            percentage = progress['percentage'] * 100
            print(f"      进度: {percentage:.1f}%")
        
        # 获取注释数量
        annotations = manager.get_book_annotations(book_id)
        if annotations:
            print(f"      注释: {len(annotations)}个")
        
        print()
    
    # 演示查询功能
    print(f"📝 注释示例:")
    for book_id, book_info in books.items():
        annotations = manager.get_book_annotations(book_id)
        if annotations:
            print(f"   📖 《{book_info['title']}》的注释:")
            for ann in annotations[:2]:  # 只显示前2个注释
                print(f"      • {ann['text'][:30]}...")
            if len(annotations) > 2:
                print(f"      ... 还有 {len(annotations) - 2} 个注释")
            break
    
    print(f"\n✅ 演示完成！")


def demo_performance_comparison():
    """演示性能对比"""
    print(f"\n⚡ 性能对比演示")
    print("=" * 30)
    
    import time
    import json
    
    # SQLite性能测试
    manager = get_sqlite_data_manager('books_data.db')
    
    start_time = time.time()
    sqlite_books = manager.get_all_books()
    sqlite_time = time.time() - start_time
    
    # JSON性能测试（如果文件存在）
    if os.path.exists('books_data.json'):
        start_time = time.time()
        with open('books_data.json', 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        json_books = json_data.get('books', {})
        json_time = time.time() - start_time
        
        print(f"📊 性能对比 (获取{len(sqlite_books)}本书籍):")
        print(f"   SQLite: {sqlite_time:.4f}秒")
        print(f"   JSON:   {json_time:.4f}秒")
        
        if json_time > 0:
            speedup = json_time / sqlite_time
            print(f"   SQLite比JSON快 {speedup:.1f}x")
    else:
        print(f"📊 SQLite性能:")
        print(f"   获取{len(sqlite_books)}本书籍: {sqlite_time:.4f}秒")


def demo_advanced_queries():
    """演示高级查询功能"""
    print(f"\n🔍 高级查询演示")
    print("=" * 30)
    
    manager = get_sqlite_data_manager('books_data.db')
    
    # 使用原生SQL查询
    with manager._get_connection() as conn:
        cursor = conn.cursor()
        
        # 查询日语书籍
        cursor.execute("SELECT title, author FROM books WHERE language = 'ja'")
        ja_books = cursor.fetchall()
        print(f"📚 日语书籍 ({len(ja_books)}本):")
        for book in ja_books[:3]:
            print(f"   • {book['title']} - {book['author']}")
        
        # 查询阅读进度最高的书籍
        cursor.execute("""
            SELECT b.title, r.percentage 
            FROM books b 
            JOIN reading_progress r ON b.book_id = r.book_id 
            ORDER BY r.percentage DESC 
            LIMIT 3
        """)
        top_progress = cursor.fetchall()
        print(f"\n📖 阅读进度最高的书籍:")
        for book in top_progress:
            print(f"   • {book['title']}: {book['percentage']*100:.1f}%")
        
        # 查询注释最多的书籍
        cursor.execute("""
            SELECT b.title, COUNT(a.id) as annotation_count
            FROM books b 
            LEFT JOIN annotations a ON b.book_id = a.book_id 
            GROUP BY b.book_id, b.title
            HAVING annotation_count > 0
            ORDER BY annotation_count DESC 
            LIMIT 3
        """)
        top_annotations = cursor.fetchall()
        print(f"\n📝 注释最多的书籍:")
        for book in top_annotations:
            print(f"   • {book['title']}: {book['annotation_count']}个注释")


if __name__ == "__main__":
    demo_sqlite_operations()
    demo_performance_comparison()
    demo_advanced_queries()