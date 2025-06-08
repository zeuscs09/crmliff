# 📋 Todo List - CRM LIFF Project

## 🎨 Phase 1: UI Mobile Prototype (Mock Data)

### 🏗️ LIFF Setup & Basic Structure
- [x] สร้าง LIFF app ใน LINE Developers Console *(mock setup)*
- [x] ตั้งค่า LIFF SDK พื้นฐาน
- [x] สร้างโครงสร้างโปรเจกต์ HTML/CSS/JS
- [ ] ทดสอบการเปิดใน LINE Browser

### 📱 UI/UX Development (Prototype)
- [x] **หน้า Login/Verification (Mock)**
  - [x] Mock LINE login process
  - [x] หน้ากรอกรหัสพนักงานเซลส์ (แสดง mock data)
  - [x] แสดงชื่อพนักงานเซลส์ (fake data)
- [x] **หน้าหลัก (Store Visit Form)**
  - [x] Header แสดงชื่อพนักงานเซลส์ (mock)
  - [x] Mock GPS location display
  - [x] Camera interface สำหรับถ่ายรูป
  - [x] Image preview functionality
  - [x] Slider เลือกประเภทร้าน (mock data จาก CLIFF Store Type)
  - [x] ฟอร์มกรอกข้อมูลเพิ่มเติม
  - [x] ปุ่มบันทึก (mock submission)

### 🎯 Core Mobile Functionality
- [x] ตรวจจับตำแหน่ง GPS (จริง)
- [x] จัดการการถ่ายรูปและ preview
- [x] Convert รูปเป็น base64
- [x] Mock API calls (แสดง loading และ success message)
- [x] Local storage สำหรับเก็บข้อมูลชั่วคราว

### 📱 Mobile UI/UX Optimization
- [x] Responsive design สำหรับมือถือ
- [x] Touch-friendly UI elements
- [x] Loading states และ animations
- [x] Error handling UI
- [x] Success/confirmation screens
- [x] Optimize สำหรับ LINE browser

### 🧪 UI Testing & Validation
- [ ] ทดสอบบนมือถือจริง (iOS/Android)
- [ ] ทดสอบใน LINE browser
- [ ] User experience testing
- [ ] UI responsiveness testing
- [ ] Camera functionality testing

---

## ✅ Phase 2: Backend Development (Frappe)

### 🏗️ DocType Creation
- [x] สร้าง DocType `CLIFF Store Type`
  - [x] กำหนด fields สำหรับ store_type_name, store_type_code, icon, color
  - [x] ตั้งค่า permissions และ validation
  - [x] เพิ่ม sort_order สำหรับจัดลำดับการแสดงผล
  - [x] สร้างข้อมูลตัวอย่าง (ร้านอาหาร, ร้านค้าปลีก, ร้านโชห่วย ฯลฯ)
- [x] สร้าง DocType `CLIFF Sale Agent`
  - [x] กำหนด fields สำหรับรหัสพนักงาน, ชื่อ, LINE UID, territory
  - [x] ตั้งค่า permissions และ validation
  - [x] เพิ่ม unique constraint สำหรับ line_uid และ agent_code
- [x] สร้าง DocType `CLIFF Customer Store Visit`
  - [x] กำหนด fields ตาม specification
  - [x] Link กับ CLIFF Sale Agent และ CLIFF Store Type
  - [x] ตั้งค่า permissions และ workflow
  - [x] เพิ่ม validation rules
- [x] สร้าง Sub DocType `CLIFF Store Visit Photo`
  - [x] กำหนด fields สำหรับ image และ caption
  - [x] ตั้งค่า parent-child relationship

### 🔐 Sale Agent Management & LINE UID Mapping
- [x] สร้าง custom field ใน CLIFF Sale Agent สำหรับ `line_uid`
- [x] สร้าง API สำหรับแมป LINE UID กับรหัสพนักงานเซลส์
- [x] ใส่ validation เพื่อป้องกัน duplicate LINE UID
- [ ] สร้างหน้าจอจัดการ Sale Agent

### 🏪 Store Type Management
- [ ] สร้างหน้าจอจัดการ CLIFF Store Type
- [ ] เพิ่มฟีเจอร์ drag & drop สำหรับจัดลำดับ
- [ ] ระบบ color picker สำหรับเลือกสี
- [ ] Icon selector สำหรับเลือกไอคอน

### 🔌 API Development
- [x] สร้าง API endpoint `/api/method/crmliff.api.liff_api.get_store_types`
  - [x] ส่งรายการ Store Type ที่ active
  - [x] จัดเรียงตาม sort_order
  - [x] รวม icon และ color information
- [x] สร้าง API endpoint `/api/method/crmliff.api.liff_api.submit_store_visit`
  - [x] รับและตรวจสอบ LINE UID กับ CLIFF Sale Agent
  - [x] บันทึกข้อมูลใน CLIFF Customer Store Visit
  - [x] จัดการการอัปโหลดรูปภาพ
  - [x] ส่ง response กลับ
- [x] สร้าง API endpoint สำหรับยืนยันรหัสพนักงานเซลส์
- [x] เพิ่ม error handling และ logging

### 🛡️ Security & Validation
- [x] ตั้งค่า CORS สำหรับ LIFF domain (documented)
- [ ] เพิ่ม rate limiting
- [x] ตรวจสอบ authentication token
- [x] Validate ข้อมูล input ทั้งหมด

---

## 🔗 Phase 3: Frontend-Backend Integration

### 🔌 API Integration
- [ ] เปลี่ยนจาก mock data เป็น real API calls
- [ ] ใส่ LINE login จริง
- [ ] เชื่อมต่อกับ Frappe API endpoints
- [ ] ดึงข้อมูล Store Types จาก API
- [ ] Handle authentication และ authorization
- [ ] จัดการ error responses จาก API

### ✅ Integration Testing
- [ ] ทดสอบการส่งข้อมูลไป backend
- [ ] ทดสอบการอัปโหลดรูปภาพ
- [ ] ทดสอบ LINE UID mapping
- [ ] ทดสอบการดึง Store Types
- [ ] ทดสอบ error scenarios

---

## 🖥️ Phase 4: Backend Dashboard

### 📊 Dashboard Views
- [ ] หน้าแสดงรายการ CLIFF Customer Store Visit
- [ ] กรองข้อมูลตาม (วันที่, พนักงานเซลส์, ประเภทร้าน)
- [ ] แสดงรูปภาพใน gallery view
- [ ] Map view แสดงตำแหน่งร้านค้า

### 📈 Reports & Analytics
- [ ] รายงานสรุปการเข้าเยี่ยมร้านค้าตาม Sale Agent
- [ ] กราฟแสดงสถิติตามประเภทร้าน (จาก CLIFF Store Type)
- [ ] รายงานตาม territory และ store type
- [ ] Export ข้อมูลเป็น Excel

### 🏪 Master Data Management
- [ ] หน้าจัดการ CLIFF Store Type
- [ ] หน้าจัดการ CLIFF Sale Agent
- [ ] ระบบ bulk import สำหรับ master data

---

## 🧪 Phase 5: Testing & Deployment

### ✅ Comprehensive Testing
- [ ] Unit test สำหรับ API endpoints
- [ ] Integration test ระหว่าง LIFF และ Backend
- [ ] User acceptance testing กับพนักงานเซลส์จริง
- [ ] Performance testing
- [ ] Security testing

### 🚀 Deployment
- [ ] Deploy LIFF app
- [ ] Deploy Frappe customizations
- [ ] Setup production environment
- [ ] Configure SSL และ security settings

### 📖 Documentation
- [ ] เขียน user manual สำหรับพนักงานเซลส์
- [ ] Technical documentation สำหรับ admin
- [ ] API documentation
- [ ] Master data setup guide

---

## 🔄 Phase 6: Maintenance & Enhancement

### 🐛 Bug Fixes & Optimization
- [ ] Monitor error logs
- [ ] Performance optimization
- [ ] Security updates

### ✨ Future Enhancements
- [ ] Push notifications
- [ ] Offline capability
- [ ] Advanced analytics
- [ ] Integration กับระบบ CRM อื่นๆ

---

## 📝 Notes

- **เริ่มจาก UI Prototype** - ทำ mockup ให้ใช้งานได้ก่อน ✅
- **Test UX จริง** - ให้พนักงานเซลส์ทดลองใช้ UI ก่อน
- **ใช้ Mock Data** - ไม่ต้องรอ backend เสร็จก่อน ✅
- **Master Data First** - ตั้งค่า Store Type และ Sale Agent ก่อนใช้งานจริง
- อัปเดต todos.md นี้เมื่อทำงานเสร็จแต่ละรายการ
- บันทึกปัญหาและแนวทางแก้ไขใน CURSOR_MEMORY.md

---

**เริ่มต้นที่**: Phase 1 - UI Mobile Prototype ✅ **Progress: 100%**  
**ปัจจุบัน**: Phase 2 - Backend Development ✅ **Progress: 85%**  
**Priority สูงสุด**: Frontend-Backend Integration  
**Focus**: เชื่อมต่อ LIFF กับ Frappe API และทดสอบ end-to-end 