## ระบบเก็บข้อมูลลูกค้าผ่าน LINE LIFF

### 🎯 วัตถุประสงค์

สร้างระบบให้พนักงานเซลส์สามารถเก็บข้อมูลหน้าร้านลูกค้าโดยใช้ LINE LIFF เพื่อลดขั้นตอนการกรอกข้อมูลให้น้อยที่สุด และเชื่อมโยงข้อมูลเข้าสู่ระบบหลังบ้าน (Frappe/Frappe)

---

## ✅ โครงสร้างระบบ

### 1. LIFF Application (Frontend)

* เปิดผ่าน LINE OA
* Auto login ด้วย LINE UID
* UI เน้นใช้งานง่าย คีย์น้อยที่สุด

### Flow การใช้งาน

1. Auto login ด้วย LINE
2. ตรวจสอบ LINE UID กับฐานข้อมูล:

   * ถ้า **แมปเจอ** → ไปหน้าเก็บข้อมูลร้าน
   * ถ้า **ไม่เจอ** → ไปหน้า "ยืนยันตัวตน (Verify)"

     * กรอก "รหัสพนักงานเซลส์"
     * ระบบแมป LINE UID กับรหัสนั้น และ redirect ไปหน้าเก็บข้อมูลร้าน
3. ตรวจจับ location อัตโนมัติ (Lat/Lng)
4. ถ่ายรูปหน้าร้าน (อย่างน้อย 1 รูป)
5. ปัดเลือกประเภทของร้าน (จาก CLIFF Store Type)
6. พิมพ์ข้อความเพิ่มเติม (ไม่บังคับ)
7. กรอก (ไม่บังคับ):

   * ชื่อร้าน
   * ชื่อผู้ติดต่อ
   * เบอร์โทร
8. กดบันทึก

### หน้าจอ UI (Mobile)

* สวัสดีคุณ \[ชื่อพนักงานเซลส์]
* พิกัด: (Auto location)
* ปุ่มถ่ายรูป (แสดง preview ทันที)
* ประเภทร้าน (Slider ปัดเลือกจาก CLIFF Store Type)
* ข้อความเพิ่มเติม (ช่อง input เล็ก)
* ช่องกรอกเพิ่มเติม (ไม่บังคับ):

  * ชื่อร้าน
  * ผู้ติดต่อ
  * เบอร์โทร
* ปุ่ม "บันทึกข้อมูล"

---

## 📦 โครงสร้างข้อมูล (Frappe Doctype)

### DocType: `CLIFF Store Type`

* `store_type_name` (Data) ← ชื่อประเภทร้าน
* `store_type_code` (Data) ← รหัสประเภท
* `description` (Small Text) ← คำอธิบาย
* `icon` (Data) ← ไอคอนสำหรับแสดงใน UI
* `color` (Data) ← สีประจำประเภท
* `is_active` (Check) ← สถานะใช้งาน
* `sort_order` (Int) ← ลำดับการแสดงผล

**ข้อมูลตัวอย่าง:**
- ร้านค้าปลีก
- ร้านอาหาร  
- ร้านโชห่วย
- ร้านเครื่องดื่ม
- ร้านสะดวกซื้อ
- ร้านยา
- อื่นๆ

### DocType: `CLIFF Customer Store Visit`

* `sale_agent` (Link: CLIFF Sale Agent) ← แมปจาก LINE UID
* `visit_datetime` (Datetime)
* `store_name` (Data) ← ไม่ required
* `store_type` (Link: CLIFF Store Type) ← เลือกจาก Master Data
* `store_description` (Small Text)
* `contact_name` (Data) ← ไม่ required
* `contact_phone` (Data) ← ไม่ required
* `location_lat` (Float)
* `location_lng` (Float)
* `photos` (Table: CLIFF Store Visit Photo)

### DocType: `CLIFF Sale Agent`

* `agent_code` (Data) ← รหัสพนักงานเซลส์
* `agent_name` (Data) ← ชื่อพนักงานเซลส์
* `line_uid` (Data) ← LINE UID สำหรับแมป
* `phone` (Data)
* `territory` (Link: Territory)
* `is_active` (Check)

### Sub Doctype: `CLIFF Store Visit Photo`

* `image` (Attach Image)
* `caption` (Data)

---

## 🔌 API สำหรับรับข้อมูลจาก LIFF

### Endpoint: `GET /api/method/crmliff.store_type.get_active_types`

#### Response ตัวอย่าง:
```json
{
  "message": [
    {
      "name": "store-type-001",
      "store_type_name": "ร้านอาหาร",
      "store_type_code": "FOOD",
      "icon": "🍽️",
      "color": "#FF6B6B"
    },
    {
      "name": "store-type-002", 
      "store_type_name": "ร้านค้าปลีก",
      "store_type_code": "RETAIL",
      "icon": "🏪",
      "color": "#4ECDC4"
    }
  ]
}
```

### Endpoint: `POST /api/method/crmliff.store_visit.submit_visit`

#### ตัวอย่าง Payload:

```json
{
  "line_uid": "Uxxxxxxxxxxxxxx",
  "store_name": "ร้านแม่สมศรี",
  "store_type": "store-type-001",
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

* Backend จะทำการ:

  * ตรวจสอบ `line_uid` และแมปกับ CLIFF Sale Agent

    * ถ้าไม่เจอ → ตอบกลับให้ redirect ไปหน้า "ยืนยันรหัสพนักงานเซลส์"
  * สร้าง CLIFF Customer Store Visit ใหม่
  * บันทึกภาพลงใน child table พร้อม caption

---

## 🖥️ Dashboard บนระบบหลังบ้าน (Frappe/Frappe)

* ดูข้อมูลร้านที่เข้าเก็บ
* กรองตามวันที่, พนักงานเซลส์, ประเภทร้าน
* Export Excel หรือแสดงบนแผนที่
* จัดการ CLIFF Store Type master data

---

## ✅ สรุปประโยชน์

* พนักงานเซลส์ทำงานง่ายขึ้น (ไม่ต้องพิมพ์เยอะ)
* ได้ข้อมูลครบพร้อมพิกัดและภาพประกอบ
* เชื่อมกับระบบหลังบ้านทันทีแบบ real-time
* ประเภทร้านจัดการแบบ centralized ผ่าน master data
