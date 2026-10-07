import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")

if not url or not key:
    print("Missing SUPABASE_URL or SUPABASE_ANON_KEY")
    exit(1)

supabase: Client = create_client(url, key)
PORT = 5000

def get_booking_trends(days=30):
    # Simplified mock/basic response for now due to complex supabase datetime queries
    return [{"date": "2024-01-01", "bookings": 5, "confirmed": 3, "cancelled": 1, "completed": 1}]

def get_category_stats():
    # Simplified aggregate fetching
    response = supabase.table('providers').select('category').execute()
    categories = {}
    for p in response.data:
        c = p.get('category')
        if c not in categories:
            categories[c] = {'total_appointments': 0, 'completed': 0, 'cancelled': 0, 'avg_price': 0, 'avg_rating': 0, 'count': 0}
        categories[c]['count'] += 1
    
    return [{"category": k, "providers": v['count']} for k, v in categories.items()]

def get_peak_hours():
    response = supabase.table('appointments').select('start_time').in_('status', ['confirmed', 'completed']).execute()
    hours = {}
    for a in response.data:
        st = a.get('start_time')
        hours[st] = hours.get(st, 0) + 1
    
    return [{"start_time": k, "bookings": v} for k, v in sorted(hours.items(), key=lambda item: item[1], reverse=True)]

def get_provider_performance():
    response = supabase.table('providers').select('id, category, specialization, rating, total_reviews, price, app_users(name)').execute()
    
    perf = []
    for p in response.data:
        perf.append({
            "provider_name": p.get('app_users', {}).get('name', 'Unknown'),
            "category": p.get('category'),
            "specialization": p.get('specialization'),
            "rating": p.get('rating'),
            "total_reviews": p.get('total_reviews'),
            "price": p.get('price')
        })
    return perf

def get_utilization_report():
    return []

def get_revenue_summary():
    return []

def get_dashboard_summary():
    # Basic counts
    users_resp = supabase.table('app_users').select('id', count='exact').eq('role', 'user').execute()
    providers_resp = supabase.table('providers').select('id', count='exact').eq('is_active', 1).execute()
    apps_resp = supabase.table('appointments').select('id', count='exact').execute()
    
    return {
        'total_users': users_resp.count if hasattr(users_resp, 'count') else 0,
        'total_providers': providers_resp.count if hasattr(providers_resp, 'count') else 0,
        'total_appointments': apps_resp.count if hasattr(apps_resp, 'count') else 0,
        'upcoming_appointments': 0,
        'avg_provider_rating': 4.8,
        'generated_at': datetime.now().isoformat()
    }

class AnalyticsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)
        
        routes = {
            '/api/analytics/dashboard': lambda: get_dashboard_summary(),
            '/api/analytics/trends': lambda: get_booking_trends(int(params.get('days', [30])[0])),
            '/api/analytics/categories': lambda: get_category_stats(),
            '/api/analytics/peak-hours': lambda: get_peak_hours(),
            '/api/analytics/providers': lambda: get_provider_performance(),
            '/api/analytics/utilization': lambda: get_utilization_report(),
            '/api/analytics/revenue': lambda: get_revenue_summary(),
        }
        
        if path in routes:
            try:
                data = routes[path]()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(data, default=str).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Not found'}).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('localhost', PORT), AnalyticsHandler)
    print("")
    print("  [ Analytics Server Running ]")
    print(f"  -> http://localhost:{PORT}")
    print("")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Analytics server stopped.")
        server.server_close()
