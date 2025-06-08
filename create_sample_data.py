#!/usr/bin/env python3

import requests
import json

# API base URL
BASE_URL = "http://crmliff.localhost"

# Sample Store Types data
store_types = [
    {
        "store_type_name": "ร้านอาหาร",
        "store_type_code": "FOOD",
        "description": "ร้านอาหาร ร้านข้าว ร้านก๋วยเตี๋ยว",
        "icon": "🍽️",
        "color": "#FF6B6B",
        "is_active": 1,
        "sort_order": 1
    },
    {
        "store_type_name": "ร้านค้าปลีก",
        "store_type_code": "RETAIL",
        "description": "ร้านขายของชำ ร้านค้าทั่วไป",
        "icon": "🏪",
        "color": "#4ECDC4",
        "is_active": 1,
        "sort_order": 2
    },
    {
        "store_type_name": "ร้านโชห่วย",
        "store_type_code": "GROCERY",
        "description": "ร้านขายของใช้ในครัวเรือน",
        "icon": "🛒",
        "color": "#45B7D1",
        "is_active": 1,
        "sort_order": 3
    },
    {
        "store_type_name": "ร้านเครื่องดื่ม",
        "store_type_code": "BEVERAGE",
        "description": "ร้านกาแฟ ร้านชา ร้านน้าผลไม้",
        "icon": "☕",
        "color": "#F39C12",
        "is_active": 1,
        "sort_order": 4
    },
    {
        "store_type_name": "ร้านสะดวกซื้อ",
        "store_type_code": "CONVENIENCE",
        "description": "เซเว่น ครอบครัวมาร์ท",
        "icon": "🏬",
        "color": "#9B59B6",
        "is_active": 1,
        "sort_order": 5
    },
    {
        "store_type_name": "ร้านยา",
        "store_type_code": "PHARMACY",
        "description": "ร้านขายยา ร้านขายเวชภัณฑ์",
        "icon": "💊",
        "color": "#E74C3C",
        "is_active": 1,
        "sort_order": 6
    }
]

def create_store_types():
    """Create sample store types using API"""
    print("🏪 Creating sample Store Types...")
    
    for store_type in store_types:
        try:
            response = requests.post(
                f"{BASE_URL}/api/resource/CLIFF Store Type",
                headers={"Content-Type": "application/json"},
                json=store_type
            )
            
            if response.status_code == 200:
                print(f"✅ Created: {store_type['store_type_name']}")
            else:
                print(f"❌ Failed to create: {store_type['store_type_name']}")
                print(f"   Status: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating {store_type['store_type_name']}: {e}")

def test_apis():
    """Test all LIFF APIs"""
    print("\n🧪 Testing APIs...")
    
    # Test 1: Health Check
    print("\n1. Testing Health Check API...")
    try:
        response = requests.get(f"{BASE_URL}/api/method/crmliff.api.liff_api.health_check")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Get Store Types
    print("\n2. Testing Get Store Types API...")
    try:
        response = requests.get(f"{BASE_URL}/api/method/crmliff.api.liff_api.get_store_types")
        print(f"   Status: {response.status_code}")
        result = response.json()
        print(f"   Found {len(result.get('message', {}).get('data', []))} store types")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 3: Verify Agents
    print("\n3. Testing Verify Agent API...")
    for agent_code in ["S001", "T001"]:
        try:
            response = requests.post(
                f"{BASE_URL}/api/method/crmliff.api.liff_api.verify_agent",
                data={"agent_code": agent_code}
            )
            print(f"   Agent {agent_code}: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                agent_name = result.get('message', {}).get('data', {}).get('agent_name', 'Unknown')
                print(f"   Agent Name: {agent_name}")
        except Exception as e:
            print(f"   Error: {e}")
    
    # Test 4: Save Visit Data (with valid store type)
    print("\n4. Testing Save Visit Data API...")
    try:
        visit_data = {
            "agent_code": "S001",
            "visit_type": "New Store",
            "location_lat": 13.7563,
            "location_lng": 100.5018,
            "address": "123 Test Street, Bangkok",
            "store_type": "FOOD",  # Use valid store type code
            "store_name": "ร้านทดสอบ API",
            "store_description": "ร้านทดสอบสำหรับ API testing",
            "contact_name": "คุณทดสอบ",
            "contact_phone": "0812345678",
            "photos": [
                {
                    "image": "/files/test-image.jpg",
                    "caption": "รูปหน้าร้าน"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/method/crmliff.api.liff_api.save_visit_data",
            headers={"Content-Type": "application/json"},
            json=visit_data
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    print("🚀 CRM LIFF API Testing Script")
    print("=" * 50)
    
    # Create sample data first
    create_store_types()
    
    # Test all APIs
    test_apis()
    
    print("\n✅ Testing completed!") 