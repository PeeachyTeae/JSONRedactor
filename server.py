#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Простой HTTP сервер для локального тестирования веб-приложения
"""

import http.server
import socketserver
import webbrowser
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Добавляем заголовки для CORS (если нужно)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    # Переходим в директорию скрипта
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = MyHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 50)
        print("JSON Redactor - Web Server")
        print("=" * 50)
        print(f"\nСервер запущен на: {url}")
        print("\nНажмите Ctrl+C для остановки")
        print("=" * 50)
        
        # Автоматически открываем браузер
        try:
            webbrowser.open(url)
        except:
            pass
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nСервер остановлен.")

if __name__ == "__main__":
    main()

