# 🏪 CRM LIFF - ระบบเก็บข้อมูลลูกค้าผ่าน LINE LIFF

> ระบบให้พนักงานเซลส์เก็บข้อมูลหน้าร้านลูกค้าผ่าน LINE LIFF เพื่อเชื่อมโยงเข้าสู่ระบบ Frappe CRM

## 🎯 ภาพรวมโปรเจกต์

ระบบ CRM LIFF ช่วยให้พนักงานเซลส์สามารถเก็บข้อมูลร้านค้าได้อย่างง่ายดายผ่าน LINE OA โดยใช้เทคโนโลยี LIFF (LINE Front-end Framework) ร่วมกับ Frappe Framework

### ✨ คุณสมบัติหลัก

- 🔐 **Auto Login** ผ่าน LINE UID
- 📍 **GPS Tracking** ตรวจจับตำแหน่งอัตโนมัติ  
- 📸 **Camera Integration** ถ่ายรูปหน้าร้านพร้อม preview
- 🏪 **Store Categorization** เลือกประเภทร้านค้าแบบ slider จาก master data
- 📱 **Mobile-First Design** เหมาะสำหรับการใช้งานในสนาม
- 🔄 **Real-time Sync** เชื่อมโยงข้อมูลเข้าระบบ Frappe ทันที

## 🏗️ สถาปัตยกรรมระบบ

```
LINE OA → LIFF App → Frappe API → CLIFF Customer Store Visit DocType
                              ↓
                    Dashboard & Reports
```

### Components

1. **LIFF Frontend** - เว็บแอปที่รันใน LINE Browser
2. **Frappe Backend** - API และระบบจัดการข้อมูล
3. **Dashboard** - หน้าจอวิเคราะห์และรายงานใน Frappe

## 📋 ฟีเจอร์หลัก

### สำหรับพนักงานเซลส์
- เก็บข้อมูลร้านค้าง่ายๆ ผ่าน LINE
- ไม่ต้องพิมพ์เยอะ ใช้การปัดเลือกและกล้องถ่ายรูป
- ตรวจจับตำแหน่งอัตโนมัติ
- เลือกประเภทร้านจาก master data ที่จัดการแบบ centralized

### สำหรับผู้จัดการ
- ดูข้อมูลการเยี่ยมร้านค้าแบบ real-time
- กรองข้อมูลตามวันที่, พนักงานเซลส์, ประเภทร้าน
- รายงานและกราฟวิเคราะห์
- Export ข้อมูลเป็น Excel
- จัดการ master data (ประเภทร้าน, พนักงานเซลส์)

## 🚀 การติดตั้งและใช้งาน

### Prerequisites
- Frappe Framework v14+
- LINE Developers Account
- SSL Certificate (สำหรับ LIFF)

### ขั้นตอนการติดตั้ง

1. **Clone Repository**
   ```bash
   bench get-app https://github.com/your-repo/crmliff
   bench install-app crmliff
   ```

2. **ตั้งค่า LINE LIFF**
   - สร้าง LIFF App ใน LINE Developers Console
   - กำหนด Endpoint URL ของระบบ Frappe
   - ได้ LIFF ID มาใส่ในการตั้งค่า

3. **Configuration**
   ```bash
   bench migrate
   bench build
   ```

## 📊 โครงสร้างข้อมูล

### DocType: CLIFF Store Type
- ชื่อประเภทร้าน (Store Type Name)
- รหัสประเภท (Store Type Code)
- คำอธิบาย (Description)
- ไอคอน (Icon) - สำหรับแสดงใน UI
- สี (Color) - สีประจำประเภท
- ลำดับการแสดงผล (Sort Order)
- สถานะใช้งาน

### DocType: CLIFF Sale Agent
- รหัสพนักงานเซลส์ (Agent Code)
- ชื่อพนักงานเซลส์ (Agent Name)
- LINE UID (สำหรับแมป)
- เบอร์โทรศัพท์
- เขตพื้นที่ (Territory)
- สถานะใช้งาน

### DocType: CLIFF Customer Store Visit
- ข้อมูลพนักงานเซลส์ (แมปจาก LINE UID)
- วันเวลาที่เยี่ยม
- ข้อมูลร้าน (ชื่อ, ประเภท, คำอธิบาย)
- ข้อมูลติดต่อ (ชื่อผู้ติดต่อ, เบอร์โทร)
- พิกัด GPS (Latitude, Longitude)
- รูปภาพร้าน (Child Table)

## 🔧 API Endpoints

### `/api/method/crmliff.store_type.get_active_types`
สำหรับดึงรายการประเภทร้านที่ใช้งานได้

**Response:**
```json
{
  "message": [
    {
      "name": "store-type-001",
      "store_type_name": "ร้านอาหาร",
      "icon": "🍽️",
      "color": "#FF6B6B"
    }
  ]
}
```

### `/api/method/crmliff.store_visit.submit_visit`
สำหรับบันทึกข้อมูลการเยี่ยมร้านจาก LIFF

**Request:**
```json
{
  "line_uid": "Uxxxxxxxxxxxxxx",
  "store_name": "ร้านแม่สมศรี",
  "store_type": "store-type-001",
  "location": {"lat": 13.7563, "lng": 100.5018},
  "images": [{"base64": "data:image/jpeg;base64,..."}]
}
```

## 📱 การใช้งาน

1. เปิด LINE OA
2. เข้าสู่ LIFF App (Auto login)
3. ยืนยันตัวตนด้วยรหัสพนักงานเซลส์ (ครั้งแรกเท่านั้น)
4. ถ่ายรูปหน้าร้าน
5. เลือกประเภทร้านค้าจาก slider (ดึงจาก master data)
6. กรอกข้อมูลเพิ่มเติม (ถ้าต้องการ)
7. กดบันทึก

## 📈 Dashboard และรายงาน

- รายการการเยี่ยมร้านทั้งหมด
- กรองตามพนักงานเซลส์, วันที่, ประเภทร้าน
- แสดงตำแหน่งบนแผนที่
- สถิติและกราฟวิเคราะห์ตามประเภทร้าน
- Export Excel
- จัดการ master data (Store Type, Sale Agent)

## 🔗 ลิงก์ที่เกี่ยวข้อง

- [📋 Todo List](todos.md) - รายการงานที่ต้องทำ
- [⭐ Feature Specification](feature.md) - รายละเอียดฟีเจอร์ครบถ้วน
- [📚 Frappe Documentation](https://frappeframework.com/docs)
- [🔧 LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/)

## 🤝 การมีส่วนร่วม

1. Fork repository นี้
2. สร้าง feature branch
3. Commit การเปลี่ยนแปลง
4. Push ไปยัง branch
5. สร้าง Pull Request

## 📄 License

MIT License - ดูรายละเอียดใน [license.txt](license.txt)

---

**หมายเหตุ**: โปรเจกต์นี้อยู่ในระหว่างการพัฒนา ติดตาม progress ได้ที่ [todos.md](todos.md)