#!/usr/bin/env python3
"""
测试数据迁移结果
"""

import os
import json
from data_sqlite import get_sqlite_data_manager


def test_migration():
    """测试迁移结果"""
    print("🧪 测试SQLite数据迁移结果...")
    
    # 检查文件
    if not os.path.exists('books_data.db'):
        print("❌ SQLite数据库文件不存在")
        return False
    
    if not os.path.exists('books_data.json'):
        print("❌ 原JSON文件不存在，无法对比")
        return False
    
    # 加载原JSON数据
    with open('books_data.json', 'r', encoding='utf-8') as f:
        json_data = json.load(f)
    
    json_books = json_data.get('books', {})
    json_progress = json_data.get('reading_progress', {})
    
    # 加载SQLite数据
    sqlite_manager = get_sqlite_data_manager('books_data.db')
    sqlite_books = sqlite_manager.get_all_books()
    sqlite_progress = sqlite_manager.get_all_progress()
    
    print(f"\n📊 数据对比:")
    print(f"   JSON书籍数量: {len(json_books)}")
    print(f"   SQLite书籍数量: {len(sqlite_books)}")
    print(f"   JSON进度数量: {len(json_progress)}")
    print(f"   SQLite进度数量: {len(sqlite_progress)}")
    
    # 检查书籍数据
    print(f"\n📚 检查书籍数据...")
    books_match = True
    for book_id, json_book in json_books.items():
        sqlite_book = sqlite_books.get(book_id)
        if not sqlite_book:
            print(f"   ❌ 书籍缺失: {book_id}")
            books_match = False
            continue
        
        # 检查关键字段
        for key in ['title', 'author', 'language']:
            if json_book.get(key) != sqlite_book.get(key):
                print(f"   ❌ 书籍字段不匹配 {book_id}.{key}: {json_book.get(key)} != {sqlite_book.get(key)}")
                books_match = False
    
    if books_match:
        print("   ✅ 所有书籍数据匹配")
    
    # 检查进度数据
    print(f"\n📖 检查进度数据...")
    progress_match = True
    for book_id, json_prog in json_progress.items():
        sqlite_prog = sqlite_progress.get(book_id)
        if not sqlite_prog:
            print(f"   ❌ 进度缺失: {book_id}")
            progress_match = False
            continue
        
        # 检查百分比（允许小的浮点误差）
        json_pct = json_prog.get('percentage', 0)
        sqlite_pct = sqlite_prog.get('percentage', 0)
        if abs(json_pct - sqlite_pct) > 0.0001:
            print(f"   ❌ 进度不匹配 {book_id}: {json_pct} != {sqlite_pct}")
            progress_match = False
    
    if progress_match:
        print("   ✅ 所有进度数据匹配")
    
    # 检查注释数据
    if os.path.exists('annotations.json'):
        print(f"\n📝 检查注释数据...")
        with open('annotations.json', 'r', encoding='utf-8') as f:
            json_annotations = json.load(f)
        
        json_ann_data = json_annotations.get('annotations', {})
        total_json_annotations = sum(len(book_anns) for book_anns in json_ann_data.values())
        
        total_sqlite_annotations = 0
        annotations_match = True
        
        for book_id, json_book_anns in json_ann_data.items():
            sqlite_book_anns = sqlite_manager.get_book_annotations(book_id)
            total_sqlite_annotations += len(sqlite_book_anns)
            
            if len(json_book_anns) != len(sqlite_book_anns):
                print(f"   ❌ 注释数量不匹配 {book_id}: {len(json_book_anns)} != {len(sqlite_book_anns)}")
                annotations_match = False
        
        print(f"   JSON注释总数: {total_json_annotations}")
        print(f"   SQLite注释总数: {total_sqlite_annotations}")
        
        if annotations_match and total_json_annotations == total_sqlite_annotations:
            print("   ✅ 所有注释数据匹配")
        else:
            print("   ❌ 注释数据不完全匹配")
    
    # 测试基本操作
    print(f"\n🔧 测试基本操作...")
    
    # 测试获取书籍
    first_book_id = list(sqlite_books.keys())[0] if sqlite_books else None
    if first_book_id:
        book = sqlite_manager.get_book(first_book_id)
        if book:
            print(f"   ✅ 获取书籍成功: {book.get('title', 'Unknown')}")
        else:
            print(f"   ❌ 获取书籍失败: {first_book_id}")
    
    # 测试获取进度
    if first_book_id and first_book_id in sqlite_progress:
        progress = sqlite_manager.get_progress(first_book_id)
        if progress:
            print(f"   ✅ 获取进度成功: {progress.get('percentage', 0)*100:.1f}%")
        else:
            print(f"   ❌ 获取进度失败: {first_book_id}")
    
    print(f"\n🎉 迁移测试完成！")
    return books_match and progress_match


def test_performance():
    """测试性能对比"""
    print(f"\n⚡ 性能测试...")
    
    import time
    
    sqlite_manager = get_sqlite_data_manager('books_data.db')
    
    # 测试获取所有书籍的时间
    start_time = time.time()
    books = sqlite_manager.get_all_books()
    sqlite_time = time.time() - start_time
    
    print(f"   SQLite获取{len(books)}本书籍耗时: {sqlite_time:.4f}秒")
    
    # 测试获取所有进度的时间
    start_time = time.time()
    progress = sqlite_manager.get_all_progress()
    progress_time = time.time() - start_time
    
    print(f"   SQLite获取{len(progress)}个进度耗时: {progress_time:.4f}秒")


if __name__ == "__main__":
    success = test_migration()
    test_performance()
    
    if success:
        print("\n✅ 所有测试通过！SQLite迁移成功。")
    else:
        print("\n❌ 部分测试失败，请检查迁移结果。")