#!/usr/bin/env python3
"""
数据迁移脚本：从JSON迁移到SQLite
"""

import os
import shutil
from data_sqlite import migrate_from_json, get_sqlite_data_manager


def main():
    """主迁移函数"""
    print("=" * 60)
    print("📚 EPUB阅读器数据迁移工具")
    print("从JSON格式迁移到SQLite数据库")
    print("=" * 60)
    
    # 检查源文件
    json_data_file = 'books_data.json'
    json_annotations_file = 'annotations.json'
    sqlite_db_file = 'books_data.db'
    
    print("\n🔍 检查源文件...")
    
    if not os.path.exists(json_data_file):
        print(f"❌ 找不到书籍数据文件: {json_data_file}")
        return False
    else:
        print(f"✅ 找到书籍数据文件: {json_data_file}")
    
    if not os.path.exists(json_annotations_file):
        print(f"⚠️  找不到注释数据文件: {json_annotations_file}")
        print("   将跳过注释数据迁移")
    else:
        print(f"✅ 找到注释数据文件: {json_annotations_file}")
    
    # 检查目标文件
    if os.path.exists(sqlite_db_file):
        print(f"\n⚠️  SQLite数据库文件已存在: {sqlite_db_file}")
        response = input("是否要覆盖现有数据库？(y/N): ").strip().lower()
        if response != 'y':
            print("❌ 迁移已取消")
            return False
        
        # 备份现有数据库
        backup_file = f"{sqlite_db_file}.backup"
        shutil.copy2(sqlite_db_file, backup_file)
        print(f"📦 已备份现有数据库到: {backup_file}")
    
    # 执行迁移
    print("\n🚀 开始迁移数据...")
    success = migrate_from_json(json_data_file, json_annotations_file, sqlite_db_file)
    
    if success:
        print("\n✅ 迁移成功完成！")
        
        # 显示迁移后的统计信息
        sqlite_manager = get_sqlite_data_manager(sqlite_db_file)
        stats = sqlite_manager.get_stats()
        
        print("\n📊 迁移结果统计:")
        print(f"   📚 书籍数量: {stats['books_count']}")
        print(f"   📖 阅读进度: {stats['progress_count']}")
        print(f"   📝 注释数量: {stats['annotations_count']}")
        print(f"   📖 有注释的书籍: {stats['annotated_books_count']}")
        
        # 建议备份原文件
        print("\n💡 建议:")
        print("   1. 测试SQLite版本是否正常工作")
        print("   2. 确认无误后，可以备份或删除原JSON文件")
        print(f"   3. 新的SQLite数据库文件: {sqlite_db_file}")
        
        # 询问是否备份原文件
        print("\n📦 是否要备份原JSON文件？")
        response = input("备份原文件到backup目录？(Y/n): ").strip().lower()
        if response != 'n':
            backup_dir = 'backup'
            os.makedirs(backup_dir, exist_ok=True)
            
            # 备份JSON文件
            if os.path.exists(json_data_file):
                backup_path = os.path.join(backup_dir, f"{json_data_file}.migrated")
                shutil.copy2(json_data_file, backup_path)
                print(f"   ✅ 已备份: {json_data_file} -> {backup_path}")
            
            if os.path.exists(json_annotations_file):
                backup_path = os.path.join(backup_dir, f"{json_annotations_file}.migrated")
                shutil.copy2(json_annotations_file, backup_path)
                print(f"   ✅ 已备份: {json_annotations_file} -> {backup_path}")
        
        return True
    else:
        print("\n❌ 迁移失败！")
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)