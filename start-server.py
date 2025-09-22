#!/usr/bin/env python3
"""
简单的 HTTP 服务器，用于本地测试 EPUB 阅读器
使用方法: python3 start-server.py
然后在浏览器中访问: http://localhost:PORT
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import socket
import signal
import urllib.parse
from urllib.parse import urlparse, parse_qs
import json
import hashlib
import tempfile
import time
from io import BytesIO

# 默认端口，如果被占用会自动尝试其他端口
DEFAULT_PORTS = [8080, 8000, 8888, 9000, 3000, 5000]

# 导入数据管理器
from data import get_data_manager, save_books_data, load_books_data

# 全局数据管理器
data_manager = get_data_manager()

# 为了兼容现有代码，保留全局变量引用
BOOKS_STORAGE = data_manager.books
BOOK_FILES = data_manager.book_files
READING_PROGRESS = data_manager.reading_progress
BOOKS_DATA_FILE = 'books_data.json'
BOOKS_DIR = 'books'  # 书籍存储目录
COVERS_DIR = 'books/covers'  # 封面存储目录

def generate_book_id(file_content, filename):
    """基于文件内容生成唯一的bookId"""
    content_hash = hashlib.md5(file_content).hexdigest()
    name_hash = hashlib.md5(filename.encode('utf-8')).hexdigest()
    return f"book_{content_hash[:8]}_{name_hash[:8]}"

def ensure_books_directory():
    """确保书籍存储目录存在"""
    if not os.path.exists(BOOKS_DIR):
        os.makedirs(BOOKS_DIR)
        print(f"📁 创建书籍存储目录: {BOOKS_DIR}")
    
    if not os.path.exists(COVERS_DIR):
        os.makedirs(COVERS_DIR)
        print(f"📁 创建封面存储目录: {COVERS_DIR}")

def save_books_data():
    """保存书籍数据到文件"""
    try:
        books_data = {
            'books': BOOKS_STORAGE,
            'book_files': BOOK_FILES,  # 改为永久文件路径
            'reading_progress': READING_PROGRESS,  # 包含阅读进度
            'saved_at': time.time()
        }
        
        with open(BOOKS_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(books_data, f, ensure_ascii=False, indent=2)
        
        print(f"📚 书籍数据已保存到 {BOOKS_DATA_FILE}")
    except Exception as e:
        print(f"❌ 保存书籍数据失败: {e}")

def load_books_data():
    """从文件加载书籍数据"""
    global BOOKS_STORAGE, BOOK_FILES, READING_PROGRESS
    
    try:
        # 确保书籍目录存在
        ensure_books_directory()
        
        if os.path.exists(BOOKS_DATA_FILE):
            with open(BOOKS_DATA_FILE, 'r', encoding='utf-8') as f:
                books_data = json.load(f)
            
            BOOKS_STORAGE = books_data.get('books', {})
            saved_book_files = books_data.get('book_files', {})
            READING_PROGRESS = books_data.get('reading_progress', {})  # 加载阅读进度
            
            # 兼容旧格式：如果没有book_files但有temp_files，清空数据
            if not saved_book_files and books_data.get('temp_files'):
                print("⚠️  检测到旧格式数据，清空无效数据")
                BOOKS_STORAGE = {}
                saved_book_files = {}
            
            # 验证书籍文件是否还存在
            valid_book_files = {}
            for book_id, book_path in saved_book_files.items():
                if os.path.exists(book_path):
                    valid_book_files[book_id] = book_path
                else:
                    print(f"⚠️  书籍文件不存在，移除书籍: {book_id} ({book_path})")
                    if book_id in BOOKS_STORAGE:
                        del BOOKS_STORAGE[book_id]
            
            BOOK_FILES = valid_book_files
            
            print(f"📚 从 {BOOKS_DATA_FILE} 加载了 {len(BOOKS_STORAGE)} 本书籍")
            print(f"📖 加载了 {len(READING_PROGRESS)} 个阅读进度记录")
        else:
            print(f"📚 数据文件 {BOOKS_DATA_FILE} 不存在，使用空数据")
            
    except Exception as e:
        print(f"❌ 加载书籍数据失败: {e}")
        BOOKS_STORAGE = {}
        BOOK_FILES = {}

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def version_string(self):
        """Return server version string."""
        return f"HTTP/1.1 Server"
    def do_GET(self):
        # 解析URL路径
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        print(f"📍 GET请求路径: {path}")
        
        # 处理根路径，返回书架页面
        if path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            
            try:
                with open('index.html', 'r', encoding='utf-8') as f:
                    content = f.read()
                self.wfile.write(content.encode('utf-8'))
            except FileNotFoundError:
                self.send_error(404, "index.html not found")
            return
        
        # 处理API路由 /api/cover/<bookId> - 获取书籍封面
        if path.startswith('/api/cover/'):
            book_id = path[11:]  # 移除 '/api/cover/' 前缀
            book_info = data_manager.get_book(book_id)
            if book_info:
                cover_path = book_info.get('coverPath')
                
                if cover_path and os.path.exists(cover_path):
                    print(f"📸 提供封面: {book_id}")
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'image/jpeg')
                    self.send_header('Cache-Control', 'public, max-age=86400')  # 缓存1天
                    self.end_headers()
                    
                    with open(cover_path, 'rb') as f:
                        self.wfile.write(f.read())
                    return
                else:
                    self.send_error(404, f"Cover not found: {book_id}")
                    return
            else:
                self.send_error(404, f"Book not found: {book_id}")
                return
        
        # 处理API路由 /api/books - 获取所有书籍列表
        if path == '/api/books':
            books = data_manager.get_all_books()
            print(f"📚 [API] 获取书籍列表，共 {len(books)} 本书")
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            
            # 构建书籍列表响应
            books_list = []
            for book_id, book_info in books.items():
                # 检查是否有封面
                has_cover = book_info.get('coverPath') and os.path.exists(book_info.get('coverPath', ''))
                
                books_list.append({
                    'id': book_id,
                    'title': book_info['title'],
                    'author': book_info['author'],
                    'filename': book_info['filename'],
                    'language': book_info['language'],
                    'fileSize': book_info['fileSize'],
                    'addedDate': book_info['addedDate'],
                    'publisher': book_info.get('publisher', '未知出版商'),
                    'description': book_info.get('description', ''),
                    'identifier': book_info.get('identifier', ''),
                    'hasCover': has_cover,
                    'coverUrl': f'/api/cover/{book_id}' if has_cover else None,
                    'fontFamily': book_info.get('fontFamily'),
                    'fontMode': book_info.get('fontMode', 'auto')
                })
            
            response = {
                'success': True,
                'books': books_list,
                'count': len(books_list)
            }
            
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            return
        
        # 处理API路由 /api/book-font/<bookId> - 获取书籍字体设置
        if path.startswith('/api/book-font/'):
            book_id = path[15:]  # 移除 '/api/book-font/' 前缀 (15个字符)
            print(f"🔤 [API] 获取字体设置请求: '{book_id}'")
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            
            # 使用数据管理器获取字体设置
            font_data = data_manager.get_book_font(book_id)
            
            if font_data:
                response = {
                    'success': True,
                    'bookId': book_id,
                    'fontFamily': font_data['fontFamily'],
                    'fontMode': font_data['fontMode']
                }
                print(f"🔤 [API] 返回字体设置: {font_data}")
            else:
                response = {
                    'success': False,
                    'bookId': book_id,
                    'message': 'Book not found or no font settings'
                }
                print(f"🔤 [API] 书籍不存在或无字体设置: '{book_id}'")
            
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            return

        # 处理API路由 /api/progress/<bookId> - 获取阅读进度
        if path.startswith('/api/progress/'):
            book_id = path[14:]  # 移除 '/api/progress/' 前缀 (14个字符)
            print(f"📖 [API] 获取阅读进度请求: '{book_id}'")
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            
            # 使用数据管理器获取进度数据
            progress_data = data_manager.get_progress(book_id)
            
            response = {
                'success': True,
                'bookId': book_id,
                'progress': progress_data
            }
            
            print(f"📖 [API] 返回进度数据: {response}")
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            return
        
        # 处理API路由 /api/book/<bookId> - 获取特定书籍的文件
        if path.startswith('/api/book/'):
            book_id = path[10:]  # 移除 '/api/book/' 前缀
            book_info = data_manager.get_book(book_id)
            if book_info:
                book_path = data_manager.get_book_file_path(book_id)
                
                if book_path and os.path.exists(book_path):
                    print(f"📚 提供书籍文件: {book_id}")
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/epub+zip')
                    # 对文件名进行URL编码以支持中文字符
                    encoded_filename = urllib.parse.quote(book_info["filename"])
                    self.send_header('Content-Disposition', f'inline; filename*=UTF-8\'\'{encoded_filename}')
                    self.end_headers()
                    
                    with open(book_path, 'rb') as f:
                        self.wfile.write(f.read())
                    return
                else:
                    self.send_error(404, f"Book file not found: {book_id}")
                    return
            else:
                self.send_error(404, f"Book not found: {book_id}")
                return
        
        # 处理书籍路由 /book/<bookId>
        if path.startswith('/book/'):
            book_id = path[6:]  # 移除 '/book/' 前缀
            if data_manager.get_book(book_id):
                print(f"📚 书籍路由: {book_id}")
                
                # 重定向到阅读器页面，带上bookId参数
                self.send_response(302)
                self.send_header('Location', f'/epub-reader.html?bookId={urllib.parse.quote(book_id)}')
                self.end_headers()
                return
            else:
                self.send_error(404, f"Book not found: {book_id}")
                return
        
        # 其他请求使用默认处理
        super().do_GET()
    
    def do_HEAD(self):
        """处理HEAD请求 - 用于验证资源是否存在"""
        # 解析URL路径
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        print(f"📍 HEAD请求路径: {path}")
        
        # 处理API路由 /api/book/<bookId> - 检查特定书籍是否存在
        if path.startswith('/api/book/'):
            book_id = path[10:]  # 移除 '/api/book/' 前缀
            book_info = data_manager.get_book(book_id)
            if book_info:
                book_path = data_manager.get_book_file_path(book_id)
                
                if book_path and os.path.exists(book_path):
                    print(f"📚 书籍存在验证成功: {book_id}")
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/epub+zip')
                    # 对文件名进行URL编码以支持中文字符
                    encoded_filename = urllib.parse.quote(book_info["filename"])
                    self.send_header('Content-Disposition', f'inline; filename*=UTF-8\'\'{encoded_filename}')
                    self.end_headers()
                    return
                else:
                    print(f"❌ 书籍文件不存在: {book_id}")
                    self.send_error(404, f"Book file not found: {book_id}")
                    return
            else:
                print(f"❌ 书籍ID不存在: {book_id}")
                self.send_error(404, f"Book not found: {book_id}")
                return
        
        # 其他HEAD请求使用默认处理
        super().do_HEAD()

    def do_POST(self):
        # 解析URL路径
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        print(f"📍 POST请求路径: {path}")
        
        # 处理文件上传 /api/upload
        if path == '/api/upload':
            try:
                # 解析multipart/form-data
                content_type = self.headers.get('Content-Type', '')
                if not content_type.startswith('multipart/form-data'):
                    self.send_error(400, "Content-Type must be multipart/form-data")
                    return
                
                # 获取boundary
                boundary = content_type.split('boundary=')[1]
                
                # 读取POST数据
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                
                # 解析文件数据和元数据
                parsed_data = self.parse_multipart(post_data, boundary)
                
                if not parsed_data:
                    self.send_error(400, "No data uploaded")
                    return
                
                # 分离文件、元数据和封面
                files = []
                metadata_map = {}
                covers_map = {}
                
                for item in parsed_data:
                    if item['type'] == 'file':
                        if item['filename'].lower().endswith('.epub'):
                            files.append(item)
                        elif item['name'].startswith('cover_'):
                            # 封面文件
                            index = item['name'].split('_')[1]
                            covers_map[index] = item
                    elif item['type'] == 'field' and item['name'].startswith('metadata_'):
                        # 解析元数据字段
                        index = item['name'].split('_')[1]
                        try:
                            metadata_map[index] = json.loads(item['content'].decode('utf-8'))
                        except:
                            print(f"❌ 解析元数据失败: {item['name']}")
                
                if not files:
                    self.send_error(400, "No EPUB files uploaded")
                    return
                
                uploaded_books = []
                
                for file_index, file_data in enumerate(files):
                    filename = file_data['filename']
                    content = file_data['content']
                    
                    # 生成bookId
                    book_id = generate_book_id(content, filename)
                    
                    # 确保书籍目录存在
                    ensure_books_directory()
                    
                    # 保存到永久文件（使用bookId作为文件名）
                    book_file_path = os.path.join(BOOKS_DIR, f"{book_id}.epub")
                    with open(book_file_path, 'wb') as f:
                        f.write(content)
                    
                    # 处理封面
                    cover_path = None
                    cover_data = covers_map.get(str(file_index))
                    if cover_data:
                        try:
                            cover_path = os.path.join(COVERS_DIR, f"{book_id}.jpg")
                            with open(cover_path, 'wb') as f:
                                f.write(cover_data['content'])
                            print(f"📸 封面保存成功: {cover_path}")
                        except Exception as e:
                            print(f"❌ 封面保存失败: {e}")
                            cover_path = None
                    
                    # 获取对应的元数据
                    metadata = metadata_map.get(str(file_index), {})
                    
                    # 使用前端解析的元数据，如果没有则使用默认值
                    title = metadata.get('title', filename.replace('.epub', ''))
                    author = metadata.get('creator', metadata.get('author', '未知作者'))
                    language = metadata.get('language', 'unknown')
                    
                    print(f"📚 处理书籍: {title} by {author} ({language})")
                    
                    # 使用数据管理器存储书籍信息
                    book_info = {
                        'title': title,
                        'author': author,
                        'filename': filename,
                        'addedDate': str(int(time.time() * 1000)),
                        'language': language,
                        'fileSize': len(content),
                        'publisher': metadata.get('publisher', '未知出版商'),
                        'description': metadata.get('description', ''),
                        'identifier': metadata.get('identifier', ''),
                        'coverPath': cover_path  # 添加封面路径
                    }
                    
                    data_manager.add_book(book_id, book_info, book_file_path)
                    
                    uploaded_books.append({
                        'id': book_id,
                        'title': book_info['title'],
                        'filename': filename
                    })
                    
                    print(f"📚 上传成功: {filename} -> {book_id}")
                    file_index += 1
                
                # 保存数据到文件
                data_manager.save_data()
                
                # 返回成功响应
                self.send_response(200)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.end_headers()
                
                response = {
                    'success': True,
                    'books': uploaded_books,
                    'message': f'成功上传 {len(uploaded_books)} 本书籍'
                }
                
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
            except Exception as e:
                print(f"❌ 文件上传失败: {e}")
                self.send_error(500, f"Upload failed: {str(e)}")
            
            return
        
        # 处理阅读进度保存 /api/progress
        if path == '/api/progress':
            try:
                # 读取JSON数据
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                
                # 解析JSON
                progress_data = json.loads(post_data.decode('utf-8'))
                
                book_id = progress_data.get('bookId')
                progress_info = progress_data.get('progress')
                
                if not book_id or not progress_info:
                    self.send_error(400, "Missing bookId or progress data")
                    return
                
                print(f"📖 [API] 保存阅读进度: {book_id}")
                print(f"📖 [API] 进度数据: CFI={progress_info.get('cfi', 'N/A')}, 百分比={progress_info.get('percentage', 0)*100:.1f}%")
                
                # 使用数据管理器保存进度
                progress_data = {
                    'cfi': progress_info.get('cfi'),
                    'percentage': progress_info.get('percentage', 0),
                    'chapterTitle': progress_info.get('chapterTitle', '未知章节'),
                    'timestamp': int(time.time() * 1000)  # 使用毫秒时间戳
                }
                
                data_manager.set_progress(book_id, progress_data)
                
                # 保存到文件
                data_manager.save_data()
                
                print(f"✅ [API] 阅读进度已保存到 {BOOKS_DATA_FILE}")
                
                # 返回成功响应
                self.send_response(200)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.end_headers()
                
                response = {
                    'success': True,
                    'message': '阅读进度保存成功',
                    'bookId': book_id,
                    'timestamp': progress_data['timestamp']
                }
                
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
            except Exception as e:
                print(f"❌ 保存阅读进度失败: {e}")
                self.send_error(500, f"Save progress failed: {str(e)}")
            
            return
        
        # 处理封面上传 /api/upload-cover
        if path == '/api/upload-cover':
            try:
                # 解析multipart/form-data
                content_type = self.headers.get('Content-Type', '')
                if not content_type.startswith('multipart/form-data'):
                    self.send_error(400, "Content-Type must be multipart/form-data")
                    return
                
                # 获取boundary
                boundary = content_type.split('boundary=')[1]
                
                # 读取POST数据
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                
                # 解析数据
                parsed_data = self.parse_multipart(post_data, boundary)
                
                book_id = None
                cover_data = None
                
                for item in parsed_data:
                    if item['type'] == 'field' and item['name'] == 'bookId':
                        book_id = item['content'].decode('utf-8')
                    elif item['type'] == 'file' and item['name'] == 'cover':
                        cover_data = item
                
                if not book_id or not cover_data:
                    self.send_error(400, "Missing bookId or cover data")
                    return
                
                book_info = data_manager.get_book(book_id)
                if not book_info:
                    self.send_error(404, f"Book not found: {book_id}")
                    return
                
                # 确保封面目录存在
                ensure_books_directory()
                
                # 保存封面
                cover_path = os.path.join(COVERS_DIR, f"{book_id}.jpg")
                with open(cover_path, 'wb') as f:
                    f.write(cover_data['content'])
                
                # 更新书籍信息
                book_info['coverPath'] = cover_path
                data_manager.add_book(book_id, book_info, data_manager.get_book_file_path(book_id))
                
                # 保存数据
                data_manager.save_data()
                
                print(f"📸 封面补充成功: {book_id}")
                
                # 返回成功响应
                self.send_response(200)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.end_headers()
                
                response = {
                    'success': True,
                    'message': '封面上传成功',
                    'coverUrl': f'/api/cover/{book_id}'
                }
                
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
            except Exception as e:
                print(f"❌ 封面上传失败: {e}")
                self.send_error(500, f"Cover upload failed: {str(e)}")
            
            return
        
        # 处理字体设置请求 /api/book-font
        if path == '/api/book-font':
            try:
                # 读取JSON数据
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                
                # 解析JSON
                request_data = json.loads(post_data.decode('utf-8'))
                book_id = request_data.get('bookId')
                font_family = request_data.get('fontFamily')
                font_mode = request_data.get('fontMode', 'auto')
                
                if not book_id:
                    self.send_error(400, "Missing bookId")
                    return
                
                # 检查书籍是否存在
                book_info = data_manager.get_book(book_id)
                if not book_info:
                    self.send_error(404, f"Book not found: {book_id}")
                    return
                
                print(f"🔤 [API] 设置书籍字体: {book_id}")
                print(f"🔤 [API] 字体: {font_family}, 模式: {font_mode}")
                
                # 使用数据管理器设置字体
                success = data_manager.set_book_font(book_id, font_family, font_mode)
                
                if success:
                    # 保存更新后的数据
                    data_manager.save_data()
                    
                    print(f"✅ [API] 字体设置成功: {book_id}")
                    
                    # 返回成功响应
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json; charset=utf-8')
                    self.end_headers()
                    
                    response = {
                        'success': True,
                        'message': f'书籍 "{book_info.get("title", book_id)}" 字体设置成功',
                        'bookId': book_id,
                        'fontFamily': font_family,
                        'fontMode': font_mode
                    }
                    
                    self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                else:
                    self.send_error(500, "Failed to set font")
                    
            except Exception as e:
                print(f"❌ [API] 设置字体失败: {e}")
                self.send_error(500, f"Set font failed: {str(e)}")
            
            return

        # 处理删除书籍请求 /api/delete-book
        if path == '/api/delete-book':
            try:
                # 读取JSON数据
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                
                # 解析JSON
                request_data = json.loads(post_data.decode('utf-8'))
                book_id = request_data.get('bookId')
                
                if not book_id:
                    self.send_error(400, "Missing bookId")
                    return
                
                # 检查书籍是否存在
                book_info = data_manager.get_book(book_id)
                if not book_info:
                    self.send_error(404, f"Book not found: {book_id}")
                    return
                
                print(f"🗑️ [API] 删除书籍请求: {book_id} - {book_info.get('title', 'Unknown')}")
                
                # 使用数据管理器删除书籍（包括实际文件）
                success = data_manager.remove_book(book_id)
                
                if success:
                    # 保存更新后的数据
                    data_manager.save_data()
                    
                    print(f"✅ [API] 书籍删除成功: {book_id}")
                    
                    # 返回成功响应
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json; charset=utf-8')
                    self.end_headers()
                    
                    response = {
                        'success': True,
                        'message': f'书籍 "{book_info.get("title", book_id)}" 删除成功',
                        'bookId': book_id
                    }
                    
                    self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                else:
                    self.send_error(500, "Failed to delete book")
                    
            except Exception as e:
                print(f"❌ [API] 删除书籍失败: {e}")
                self.send_error(500, f"Delete failed: {str(e)}")
            
            return
        
        # 其他POST请求
        self.send_error(404, "Not Found")
    
    def do_DELETE(self):
        """处理DELETE请求 - 删除书籍"""
        # 解析URL路径
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        print(f"📍 DELETE请求路径: {path}")
        
        # 处理API路由 /api/book/<bookId> - 删除特定书籍
        if path.startswith('/api/book/'):
            book_id = path[10:]  # 移除 '/api/book/' 前缀
            
            if not book_id:
                self.send_error(400, "Missing book ID")
                return
            
            try:
                # 检查书籍是否存在
                book_info = data_manager.get_book(book_id)
                if not book_info:
                    self.send_error(404, f"Book not found: {book_id}")
                    return
                
                print(f"🗑️ [API] 删除书籍请求: {book_id} - {book_info.get('title', 'Unknown')}")
                
                # 使用数据管理器删除书籍（包括实际文件）
                success = data_manager.remove_book(book_id)
                
                if success:
                    # 保存更新后的数据
                    data_manager.save_data()
                    
                    print(f"✅ [API] 书籍删除成功: {book_id}")
                    
                    # 返回成功响应
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json; charset=utf-8')
                    self.end_headers()
                    
                    response = {
                        'success': True,
                        'message': f'书籍 "{book_info.get("title", book_id)}" 删除成功',
                        'bookId': book_id
                    }
                    
                    self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                else:
                    self.send_error(500, "Failed to delete book")
                    
            except Exception as e:
                print(f"❌ [API] 删除书籍失败: {e}")
                self.send_error(500, f"Delete failed: {str(e)}")
            
            return
        
        # 处理API路由 /api/books/cleanup - 清理无效书籍
        if path == '/api/books/cleanup':
            try:
                print("🧹 [API] 清理无效书籍请求")
                
                # 验证并清理无效书籍
                data_manager.validate_book_files()
                data_manager.save_data()
                
                # 返回成功响应
                self.send_response(200)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.end_headers()
                
                response = {
                    'success': True,
                    'message': '无效书籍清理完成',
                    'remainingBooks': len(data_manager.get_all_books())
                }
                
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
            except Exception as e:
                print(f"❌ [API] 清理失败: {e}")
                self.send_error(500, f"Cleanup failed: {str(e)}")
            
            return
        
        # 其他DELETE请求
        self.send_error(404, "Not Found")
    
    def parse_multipart(self, data, boundary):
        """解析multipart/form-data，支持文件和字段"""
        items = []
        boundary_bytes = ('--' + boundary).encode()
        
        parts = data.split(boundary_bytes)
        
        for part in parts[1:-1]:  # 跳过第一个和最后一个空部分
            if not part.strip():
                continue
                
            # 分离头部和内容
            header_end = part.find(b'\r\n\r\n')
            if header_end == -1:
                continue
                
            headers = part[:header_end].decode('utf-8')
            content = part[header_end + 4:]
            
            # 移除结尾的\r\n
            if content.endswith(b'\r\n'):
                content = content[:-2]
            
            # 解析Content-Disposition头
            filename = None
            field_name = None
            
            for line in headers.split('\r\n'):
                if line.startswith('Content-Disposition:'):
                    # 解析name字段
                    if 'name=' in line:
                        name_part = line.split('name=')[1]
                        if name_part.startswith('"'):
                            field_name = name_part.split('"')[1]
                        else:
                            field_name = name_part.split(';')[0].strip()
                    
                    # 解析filename字段
                    if 'filename=' in line:
                        filename_part = line.split('filename=')[1]
                        if filename_part.startswith('"'):
                            filename = filename_part.split('"')[1]
                        else:
                            filename = filename_part.strip()
                    break
            
            if filename:
                # 这是一个文件
                items.append({
                    'type': 'file',
                    'name': field_name,
                    'filename': filename,
                    'content': content
                })
            elif field_name:
                # 这是一个普通字段
                items.append({
                    'type': 'field',
                    'name': field_name,
                    'content': content
                })
        
        return items
    
    def end_headers(self):
        # 添加 CORS 头部，允许跨域访问
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        """处理OPTIONS请求 - 用于CORS预检"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

def find_free_port(start_port=8080):
    """查找可用端口"""
    for port in range(start_port, start_port + 100):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return None

def signal_handler(signum, frame):
    """处理信号，确保优雅关闭"""
    print("\n👋 正在关闭服务器...")
    # 保存数据（确保数据不丢失）
    data_manager.save_data()
    print("📚 数据已保存")
    sys.exit(0)

def main():
    # 注册信号处理器
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # 加载保存的书籍数据
    print("🔄 启动时加载数据...")
    data_manager.validate_book_files()  # 验证文件完整性
    print(f"📊 数据统计: {data_manager}")
    
    # 更新全局变量引用（确保最新数据）
    global BOOKS_STORAGE, BOOK_FILES, READING_PROGRESS
    BOOKS_STORAGE = data_manager.books
    BOOK_FILES = data_manager.book_files
    READING_PROGRESS = data_manager.reading_progress
    
    # 固定使用8080端口
    port = 8088
    
    try:
        # 创建服务器并设置端口重用
        class ReusableTCPServer(socketserver.TCPServer):
            allow_reuse_address = True  # 关键：允许端口重用
            
        with ReusableTCPServer(("0.0.0.0", port), MyHTTPRequestHandler) as httpd:
            # 获取本机IP地址
            try:
                # 创建一个临时socket来获取本机IP
                temp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                temp_socket.connect(("8.8.8.8", 80))
                local_ip = temp_socket.getsockname()[0]
                temp_socket.close()
            except:
                # 如果获取失败，使用hostname方式
                hostname = socket.gethostname()
                local_ip = socket.gethostbyname(hostname)
            
            print(f"🚀 HTTP 服务器已启动")
            print(f"🌐 本地访问: http://localhost:{port}/")
            print(f"🌐 局域网访问: http://{local_ip}:{port}/")
            print(f"📚 阅读器页面: http://localhost:{port}/epub-reader.html")
            print(f"📱 移动设备访问: http://{local_ip}:{port}/")
            print(f"📁 服务目录: {os.getcwd()}")
            print(f"⏹️  按 Ctrl+C 停止服务器")
            print("-" * 50)
            
            # 自动打开浏览器（打开书架首页）
            try:
                webbrowser.open(f'http://localhost:{port}/')
                print("✅ 已自动打开浏览器（书架页面）")
            except:
                print("⚠️  无法自动打开浏览器，请手动访问上述地址")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ 端口 {port} 已被占用")
            print("💡 解决方案：")
            print(f"   1. 查找占用进程: lsof -i:{port}")
            print(f"   2. 终止进程: kill -9 <PID>")
            print("   3. 或等待几分钟后重试")
        else:
            print(f"❌ 启动服务器失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
