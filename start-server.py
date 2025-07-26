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

# 默认端口，如果被占用会自动尝试其他端口
DEFAULT_PORTS = [8080, 8000, 8888, 9000, 3000, 5000]

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
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
    sys.exit(0)

def main():
    # 注册信号处理器
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # 查找可用端口
    port = find_free_port(8080)
    if not port:
        print("❌ 无法找到可用端口")
        sys.exit(1)
    
    try:
        # 创建服务器并设置端口重用
        class ReusableTCPServer(socketserver.TCPServer):
            allow_reuse_address = True  # 关键：允许端口重用
            
        with ReusableTCPServer(("", port), MyHTTPRequestHandler) as httpd:
            print(f"🚀 HTTP 服务器已启动")
            print(f"📖 请在浏览器中访问: http://localhost:{port}/epub-reader.html")
            print(f"📁 服务目录: {os.getcwd()}")
            print(f"⏹️  按 Ctrl+C 停止服务器")
            print("-" * 50)
            
            # 自动打开浏览器
            try:
                webbrowser.open(f'http://localhost:{port}/epub-reader.html')
                print("✅ 已自动打开浏览器")
            except:
                print("⚠️  无法自动打开浏览器，请手动访问上述地址")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 服务器已停止")
    except OSError as e:
        print(f"❌ 启动服务器失败: {e}")
        print("💡 提示：如果端口被占用，请等待几分钟后重试，或者重启终端")
        sys.exit(1)

if __name__ == "__main__":
    main()
