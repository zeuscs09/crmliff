# CRM LIFF Backend Documentation

## 📋 Overview

Backend สำหรับ CRM LIFF Application ที่พัฒนาด้วย Frappe Framework เพื่อรองรับการเก็บข้อมูลลูกค้าผ่าน LINE LIFF

## 🏗️ Architecture

### DocTypes

#### 1. CLIFF Store Type
- **Purpose**: จัดการประเภทร้านค้า
- **Fields**:
  - `store_type_name` (Data) - ชื่อประเภทร้าน
  - `store_type_code` (Data) - รหัสประเภท (Primary Key)
  - `description` (Small Text) - คำอธิบาย
  - `icon` (Data) - ไอคอน emoji
  - `color` (Color) - สีประจำประเภท
  - `is_active` (Check) - สถานะใช้งาน
  - `sort_order` (Int) - ลำดับการแสดงผล

#### 2. CLIFF Sale Agent
- **Purpose**: จัดการข้อมูลพนักงานเซลส์
- **Fields**:
  - `agent_code` (Data) - รหัสพนักงาน (Primary Key)
  - `agent_name` (Data) - ชื่อพนักงาน
  - `line_uid` (Data) - LINE UID สำหรับแมป
  - `phone` (Phone) - เบอร์โทรศัพท์
  - `territory` (Link) - เขตพื้นที่รับผิดชอบ
  - `is_active` (Check) - สถานะใช้งาน

#### 3. CLIFF Customer Store Visit
- **Purpose**: บันทึกการเข้าเยี่ยมลูกค้า
- **Fields**:
  - `naming_series` (Select) - รหัสอัตโนมัติ
  - `sale_agent` (Link) - พนักงานเซลส์
  - `visit_datetime` (Datetime) - วันเวลาเข้าเยี่ยม
  - `store_type` (Link) - ประเภทร้าน
  - `store_name` (Data) - ชื่อร้าน (ไม่บังคับ)
  - `store_description` (Small Text) - รายละเอียดร้าน
  - `contact_name` (Data) - ชื่อผู้ติดต่อ (ไม่บังคับ)
  - `contact_phone` (Phone) - เบอร์ผู้ติดต่อ (ไม่บังคับ)
  - `location_lat` (Float) - ละติจูด
  - `location_lng` (Float) - ลองจิจูด
  - `photos` (Table) - รูปภาพ

#### 4. CLIFF Store Visit Photo (Sub DocType)
- **Purpose**: เก็บรูปภาพการเข้าเยี่ยม
- **Fields**:
  - `image` (Attach Image) - ไฟล์รูปภาพ
  - `caption` (Data) - คำอธิบายรูป

## 🔌 API Endpoints

### Base URL
```
https://your-site.com/api/method/crmliff.api.liff_api
```

### 1. Health Check
```http
GET /health_check
```
**Response:**
```json
{
  "success": true,
  "message": "CRM LIFF API is working",
  "timestamp": "2024-01-15 10:00:00"
}
```

### 2. Get Store Types
```http
GET /get_store_types
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "FOOD",
      "store_type_name": "ร้านอาหาร",
      "store_type_code": "FOOD",
      "icon": "🍽️",
      "color": "#FF6B6B",
      "description": "ร้านอาหาร ร้านข้าว ร้านก๋วยเตี๋ยว"
    }
  ],
  "message": "Store types retrieved successfully"
}
```

### 3. Verify Agent
```http
POST /verify_agent
Content-Type: application/json

{
  "agent_code": "S001"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "name": "S001",
    "agent_name": "สมชาย ใจดี",
    "territory": "",
    "line_uid": ""
  },
  "message": "Agent verified successfully"
}
```

### 4. Link LINE Account
```http
POST /link_line_account
Content-Type: application/json

{
  "agent_code": "S001",
  "line_uid": "Uxxxxxxxxxxxxxx"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "agent_code": "S001",
    "agent_name": "สมชาย ใจดี",
    "territory": ""
  },
  "message": "LINE account linked successfully"
}
```

### 5. Get Agent Info
```http
GET /get_agent_info?line_uid=Uxxxxxxxxxxxxxx
```
**Response:**
```json
{
  "success": true,
  "data": {
    "name": "S001",
    "agent_code": "S001",
    "agent_name": "สมชาย ใจดี",
    "territory": ""
  },
  "message": "Agent info retrieved successfully"
}
```

### 6. Submit Store Visit
```http
POST /submit_store_visit
Content-Type: application/json

{
  "line_uid": "Uxxxxxxxxxxxxxx",
  "store_name": "ร้านแม่สมศรี",
  "store_type": "FOOD",
  "store_description": "อยู่ริมถนน ใกล้เซเว่น",
  "contact_name": "คุณสมศรี",
  "contact_phone": "0891234567",
  "location": {
    "lat": 13.7563,
    "lng": 100.5018
  },
  "images": [
    {
      "base64": "data:image/jpeg;base64,...",
      "caption": "หน้าร้าน"
    }
  ]
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Store visit recorded successfully",
    "visit_id": "CSV-2024-01-0001",
    "agent_name": "สมชาย ใจดี"
  },
  "message": "Store visit submitted successfully"
}
```

### 7. Get Visits Summary
```http
GET /get_visits_summary?agent_code=S001&from_date=2024-01-01&to_date=2024-01-31
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "CSV-2024-01-0001",
      "visit_datetime": "2024-01-15 10:30:00",
      "store_name": "ร้านแม่สมศรี",
      "store_type": "FOOD",
      "sale_agent": "S001",
      "location_lat": 13.7563,
      "location_lng": 100.5018
    }
  ],
  "message": "Visits summary retrieved successfully"
}
```

## 🛡️ Security

### CORS Settings
- API endpoints มี `allow_guest=True` สำหรับ LIFF access
- ต้องตั้งค่า CORS ใน site_config.json:
```json
{
  "cors": {
    "allow_origin": ["https://liff.line.me"],
    "allow_credentials": true
  }
}
```

### Rate Limiting
- ควรตั้งค่า rate limiting สำหรับ API endpoints
- ใช้ Frappe's built-in rate limiting

## 📊 Sample Data

### Store Types (8 ประเภท)
1. ร้านอาหาร (FOOD) 🍽️
2. ร้านค้าปลีก (RETAIL) 🏪
3. ร้านโชห่วย (GROCERY) 🛒
4. ร้านเครื่องดื่ม (BEVERAGE) ☕
5. ร้านสะดวกซื้อ (CONVENIENCE) 🏬
6. ร้านยา (PHARMACY) 💊
7. ร้านเสริมสวย (BEAUTY) 💄
8. อื่นๆ (OTHER) 🏢

### Sale Agents (5 คน)
- S001: สมชาย ใจดี
- S002: สมหญิง รักงาน
- S003: สมศักดิ์ ขยันขัน
- S004: สมใจ มุ่งมั่น
- S005: สมปอง ทำงาน

## 🚀 Installation

1. Install app:
```bash
bench get-app https://github.com/your-repo/crmliff
bench --site your-site install-app crmliff
```

2. Setup initial data:
```bash
bench --site your-site migrate
```

3. Create sample data (if needed):
```bash
bench --site your-site execute crmliff.crmliff.install.after_install
```

## 🔧 Development

### Adding New Store Types
```python
# In Frappe console
store_type = frappe.new_doc("CLIFF Store Type")
store_type.store_type_name = "ร้านใหม่"
store_type.store_type_code = "NEW"
store_type.icon = "🆕"
store_type.color = "#FF0000"
store_type.sort_order = 10
store_type.is_active = 1
store_type.insert()
```

### Adding New Sale Agents
```python
# In Frappe console
agent = frappe.new_doc("CLIFF Sale Agent")
agent.agent_code = "S006"
agent.agent_name = "สมใหม่ ทำงาน"
agent.phone = "086-789-0123"
agent.is_active = 1
agent.insert()
```

## 📝 Error Handling

### Common Error Responses
```json
{
  "success": false,
  "error": "Error message",
  "message": "User-friendly message"
}
```

### Error Codes
- `400`: Bad Request - ข้อมูลไม่ถูกต้อง
- `404`: Not Found - ไม่พบข้อมูล
- `500`: Internal Server Error - ข้อผิดพลาดระบบ

## 🧪 Testing

### API Testing with curl
```bash
# Health check
curl -X GET "https://your-site.com/api/method/crmliff.api.liff_api.health_check"

# Get store types
curl -X GET "https://your-site.com/api/method/crmliff.api.liff_api.get_store_types"

# Verify agent
curl -X POST "https://your-site.com/api/method/crmliff.api.liff_api.verify_agent" \
  -H "Content-Type: application/json" \
  -d '{"agent_code": "S001"}'
```

## 📈 Monitoring

### Log Files
- Error logs: `logs/error.log`
- Access logs: `logs/access.log`
- Custom logs: `frappe.log_error()`

### Performance Monitoring
- Monitor API response times
- Track database query performance
- Monitor file upload sizes

## 🔄 Backup & Maintenance

### Database Backup
```bash
bench --site your-site backup
```

### File Cleanup
```bash
# Clean old uploaded files
bench --site your-site execute frappe.utils.file_manager.cleanup_old_files
```

---

**Last Updated**: 2024-01-15  
**Version**: 1.0.0 