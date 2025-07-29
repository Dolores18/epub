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

# 全局书籍存储
BOOKS_STORAGE = {}
TEMP_FILES = {}

def generate_book_id(file_content, filename):
    """基于文件内容生成唯一的bookId"""
    content_hash = hashlib.md5(file_content).hexdigest()
    name_hash = hashlib.md5(filename.encode('utf-8')).hexdigest()
    return f"book_{content_hash[:8]}_{name_hash[:8]}"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
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
        
        # 处理API路由 /api/book/<bookId> - 获取特定书籍的文件
        if path.startswith('/api/book/'):
            book_id = path[10:]  # 移除 '/api/book/' 前缀
            if book_id in BOOKS_STORAGE:
                book_info = BOOKS_STORAGE[book_id]
                temp_path = TEMP_FILES.get(book_id)
                
                if temp_path and os.path.exists(temp_path):
                    print(f"📚 提供书籍文件: {book_id}")
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/epub+zip')
                    self.send_header('Content-Disposition', f'inline; filename="{book_info["filename"]}"')
                    self.end_headers()
                    
                    with open(temp_path, 'rb') as f:
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
            if book_id in BOOKS_STORAGE:
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
                
                # 解析文件数据
                files = self.parse_multipart(post_data, boundary)
                
                if not files:
                    self.send_error(400, "No files uploaded")
                    return
                
                uploaded_books = []
                
                for file_data in files:
                    filename = file_data['filename']
                    content = file_data['content']
                    
                    if not filename.lower().endswith('.epub'):
                        continue
                    
                    # 生成bookId
                    book_id = generate_book_id(content, filename)
                    
                    # 保存到临时文件
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.epub')
                    temp_file.write(content)
                    temp_file.close()
                    
                    # 存储书籍信息
                    BOOKS_STORAGE[book_id] = {
                        'title': filename.replace('.epub', ''),
                        'author': '未知作者',
                        'filename': filename,
                        'addedDate': str(int(time.time() * 1000)),
                        'language': 'unknown',
                        'fileSize': len(content)
                    }
                    
                    TEMP_FILES[book_id] = temp_file.name
                    
                    uploaded_books.append({
                        'id': book_id,
                        'title': BOOKS_STORAGE[book_id]['title'],
                        'filename': filename
                    })
                    
                    print(f"📚 上传成功: {filename} -> {book_id}")
                
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
        
        # 其他POST请求
        self.send_error(404, "Not Found")
    
    def parse_multipart(self, data, boundary):
        """解析multipart/form-data"""
        files = []
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
            for line in headers.split('\r\n'):
                if line.startswith('Content-Disposition:'):
                    if 'filename=' in line:
                        filename = line.split('filename=')[1].strip('"')
                        break
            
            if filename:
                files.append({
                    'filename': filename,
                    'content': content
                })
        
        return files
    
    def end_headers(self):
        # 添加 CORS 头部，允许跨域访问
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

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
    # 清理临时文件
    for temp_path in TEMP_FILES.values():
        try:
            os.unlink(temp_path)
        except:
            pass
    sys.exit(0)

def main():
    # 注册信号处理器
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # 固定使用8080端口
    port = 8080
    
    try:
        # 创建服务器并设置端口重用
        class ReusableTCPServer(socketserver.TCPServer):
            allow_reuse_address = True  # 关键：允许端口重用
            
        with ReusableTCPServer(("", port), MyHTTPRequestHandler) as httpd:
            print(f"🚀 HTTP 服务器已启动")
            print(f"� 请请在浏览器中访问: http://localhost:{port}/")
            print(f"� 阅务读器页面: http://localhost:{port}/epub-reader.html")
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
