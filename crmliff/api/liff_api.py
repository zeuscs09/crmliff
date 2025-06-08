# Copyright (c) 2024, Bangbow and contributors
# For license information, please see license.txt

"""
Main API endpoints for LIFF Application
รวม API endpoints ทั้งหมดสำหรับ CRM LIFF app
"""

import frappe
import json
from frappe import _
from crmliff.crmliff.doctype.cliff_store_type.cliff_store_type import get_active_store_types
from crmliff.crmliff.doctype.cliff_sale_agent.cliff_sale_agent import (
    verify_agent_code, 
    map_line_uid, 
    get_agent_by_line_uid
)
from crmliff.crmliff.doctype.cliff_customer_store_visit.cliff_customer_store_visit import (
    submit_visit,
    get_visit_summary
)


@frappe.whitelist(allow_guest=True)
def get_store_types():
    """
    API: GET /api/method/crmliff.api.liff_api.get_store_types
    ส่งรายการ Store Type ที่ active สำหรับ LIFF UI
    """
    try:
        store_types = get_active_store_types()
        return {
            "success": True,
            "data": store_types,
            "message": "Store types retrieved successfully"
        }
    except Exception as e:
        frappe.log_error(f"Error getting store types: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to get store types"
        }


@frappe.whitelist(allow_guest=True)
def verify_agent(agent_code):
    """
    API: POST /api/method/crmliff.api.liff_api.verify_agent
    ตรวจสอบรหัสพนักงานเซลส์
    """
    try:
        if not agent_code:
            frappe.throw("Agent code is required")
        
        agent = verify_agent_code(agent_code)
        return {
            "success": True,
            "data": agent,
            "message": "Agent verified successfully"
        }
    except Exception as e:
        frappe.log_error(f"Error verifying agent: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Agent verification failed"
        }


@frappe.whitelist(allow_guest=True)
def link_line_account(agent_code, line_uid):
    """
    API: POST /api/method/crmliff.api.liff_api.link_line_account
    แมป LINE UID กับรหัสพนักงานเซลส์
    """
    try:
        if not agent_code or not line_uid:
            frappe.throw("Both agent_code and line_uid are required")
        
        result = map_line_uid(agent_code, line_uid)
        return {
            "success": True,
            "data": result,
            "message": "LINE account linked successfully"
        }
    except Exception as e:
        frappe.log_error(f"Error linking LINE account: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to link LINE account"
        }


@frappe.whitelist(allow_guest=True)
def get_agent_info(line_uid):
    """
    API: GET /api/method/crmliff.api.liff_api.get_agent_info
    ดึงข้อมูลพนักงานเซลส์จาก LINE UID
    """
    try:
        if not line_uid:
            frappe.throw("LINE UID is required")
        
        agent = get_agent_by_line_uid(line_uid)
        if not agent:
            return {
                "success": False,
                "message": "LINE UID not found. Please register first.",
                "requires_registration": True
            }
        
        return {
            "success": True,
            "data": agent,
            "message": "Agent info retrieved successfully"
        }
    except Exception as e:
        frappe.log_error(f"Error getting agent info: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to get agent info"
        }


@frappe.whitelist(allow_guest=True)
def submit_store_visit(**kwargs):
    """
    API: POST /api/method/crmliff.api.liff_api.submit_store_visit
    บันทึกข้อมูลการเข้าเยี่ยมลูกค้า
    
    Expected payload:
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
    """
    try:
        # รับข้อมูลทั้งหมดจาก kwargs
        data = kwargs
        
        # ตรวจสอบข้อมูลจำเป็น
        required_fields = ['line_uid', 'store_type', 'location', 'images']
        for field in required_fields:
            if field not in data or not data[field]:
                frappe.throw(f"Field '{field}' is required")
        
        # ตรวจสอบ location format
        location = data['location']
        if not isinstance(location, dict) or 'lat' not in location or 'lng' not in location:
            frappe.throw("Invalid location format. Expected: {lat: float, lng: float}")
        
        # ตรวจสอบ images format
        images = data['images']
        if not isinstance(images, list) or len(images) == 0:
            frappe.throw("At least one image is required")
        
        # เรียก function submit_visit
        result = submit_visit(data)
        
        return {
            "success": True,
            "data": result,
            "message": "Store visit submitted successfully"
        }
        
    except Exception as e:
        frappe.log_error(f"Error submitting store visit: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to submit store visit"
        }


@frappe.whitelist(allow_guest=True, methods=["POST"])
def create_store():
    """
    API: POST /api/method/crmliff.api.liff_api.create_store
    สร้างร้านใหม่พร้อมข้อมูลครบถ้วน
    """
    try:
        # Get request data and headers
        request_data = frappe.request.get_data()
        headers = dict(frappe.request.headers)
        source_ip = frappe.request.remote_addr
        
        # Parse JSON data
        try:
            data = json.loads(request_data)
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Invalid JSON format",
                "message": "ข้อมูล JSON ไม่ถูกต้อง"
            }
        
        agent_code = data.get('agent_code')
        
        # Verify agent
        agent = frappe.get_doc("CLIFF Sale Agent", agent_code)
        if not agent:
            return {"success": False, "error": "ไม่พบข้อมูลพนักงานเซลส์"}
        
        # Create new store
        store_doc = frappe.new_doc("CLIFF Store")
        store_doc.store_name = data.get('store_name')
        store_doc.store_type = data.get('store_type')
        store_doc.created_by_agent = agent_code
        store_doc.store_description = data.get('store_description')
        store_doc.contact_name = data.get('contact_name')
        store_doc.contact_phone = data.get('contact_phone')
        store_doc.location_lat = data.get('location_lat')
        store_doc.location_lng = data.get('location_lng')
        store_doc.address = data.get('address')
        store_doc.status = 'Active'
        
        # Handle cover image
        if data.get('cover_image'):
            store_doc.cover_image = data.get('cover_image')
        
        store_doc.insert(ignore_permissions=True)
        
        # Create visit record
        visit = frappe.new_doc("CLIFF Customer Store Visit")
        visit.sale_agent = agent_code
        visit.visit_type = "New Store"
        visit.visit_datetime = frappe.utils.now()
        visit.store_name = store_doc.name
        visit.remark = data.get('remark', '')  # Add remark field
        visit.location_lat = store_doc.location_lat
        visit.location_lng = store_doc.location_lng
        
        # Handle photos
        photos_data = data.get('photos', [])
        for photo_data in photos_data:
            photo_row = visit.append('photos', {})
            photo_row.image = photo_data.get('image')
            photo_row.caption = photo_data.get('caption', '')
        
        visit.insert(ignore_permissions=True)
        
        return {
            "success": True,
            "data": {
                "visit_id": visit.name,
                "store_id": store_doc.name
            },
            "message": "สร้างร้านสำเร็จ"
        }
        
    except Exception as e:
        frappe.log_error(f"Error saving visit data: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
        }


@frappe.whitelist(allow_guest=True, methods=["POST"])
def checkin_store():
    """
    API: POST /api/method/crmliff.api.liff_api.checkin_store
    เช็คอินร้านที่มีอยู่แล้ว (แค่ location + photos)
    """
    try:
        # Get request data
        request_data = frappe.request.get_data()
        
        # Parse JSON data
        try:
            data = json.loads(request_data)
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Invalid JSON format",
                "message": "ข้อมูล JSON ไม่ถูกต้อง"
            }
        
        agent_code = data.get('agent_code')
        store_id = data.get('store_id')
        
        # Verify agent
        agent = frappe.get_doc("CLIFF Sale Agent", agent_code)
        if not agent:
            return {"success": False, "error": "ไม่พบข้อมูลพนักงานเซลส์"}
        
        # Verify store exists
        store_doc = frappe.get_doc("CLIFF Store", store_id)
        if not store_doc:
            return {"success": False, "error": "ไม่พบข้อมูลร้านค้า"}
        
        # Update store visit count
        store_doc.update_visit_count()
        
        # Create visit record
        visit = frappe.new_doc("CLIFF Customer Store Visit")
        visit.sale_agent = agent_code
        visit.visit_type = "Check-in"
        visit.visit_datetime = frappe.utils.now()
        visit.store_name = store_doc.name
        visit.remark = data.get('remark', '')
       
        visit.location_lat = data.get('location_lat')
        visit.location_lng = data.get('location_lng')
        
        # Handle photos (required for check-in)
        photos_data = data.get('photos', [])
        if not photos_data:
            return {"success": False, "error": "กรุณาถ่ายรูปอย่างน้อย 1 รูป"}
        
        for photo_data in photos_data:
            photo_row = visit.append('photos', {})
            image_data = photo_data.get('image')
            
            # Check if image_data is base64 (starts with 'data:image') or already a URL
            if image_data and image_data.startswith('data:image/'):
                # Convert base64 to file
                try:
                    import base64
                    format_and_data = image_data.split(',', 1)
                    if len(format_and_data) == 2:
                        image_format = format_and_data[0].split(';')[0].split('/')[1]
                        image_content = format_and_data[1]
                        
                        # Create file
                        filename = f"checkin_{store_id}_{frappe.generate_hash(length=8)}.{image_format}"
                        
                        file_doc = frappe.get_doc({
                            "doctype": "File",
                            "file_name": filename,
                            "content": base64.b64decode(image_content),
                            "is_private": 0
                        })
                        file_doc.save()
                        photo_row.image = file_doc.file_url
                    else:
                        photo_row.image = image_data
                except Exception as file_error:
                    frappe.log_error(f"Error processing base64 image: {str(file_error)}")
                    photo_row.image = image_data  # Fallback to original data
            else:
                # Assume it's already a URL
                photo_row.image = image_data
            
            photo_row.caption = photo_data.get('caption', '')
        
        visit.insert(ignore_permissions=True)
        
        return {
            "success": True,
            "data": {
                "visit_id": visit.name,
                "store_id": store_doc.name,
                "store_name": store_doc.store_name
            },
            "message": "เช็คอินสำเร็จ"
        }
        
    except Exception as e:
        frappe.log_error(f"Error checking in store: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "เกิดข้อผิดพลาดในการเช็คอิน"
        }


@frappe.whitelist(allow_guest=True, methods=["GET", "POST"])
def get_agent_stores(agent_code):
    """
    API: GET /api/method/crmliff.api.liff_api.get_agent_stores
    ดึงรายการร้านที่สร้างโดยพนักงานเซลส์คนนั้นๆ
    """
    try:
        # Verify agent exists
        agent = frappe.get_doc("CLIFF Sale Agent", agent_code)
        if not agent:
            return {"success": False, "error": "ไม่พบข้อมูลพนักงานเซลส์"}
        
        # Get stores created by this agent
        stores = frappe.get_all(
            "CLIFF Store",
            filters={"created_by_agent": agent_code, "status": "Active"},
            fields=[
                "name", "store_name", "store_type", "store_description",
                "contact_name", "contact_phone", "location_lat", "location_lng",
                "address", "first_visit_date", "last_visit_date", "total_visits",
                "status", "cover_image", "creation", "modified"
            ]
        )
        
        # Get store type names
        for store in stores:
            if store.store_type:
                store_type_doc = frappe.get_doc("CLIFF Store Type", store.store_type)
                store["store_type_name"] = store_type_doc.store_type_name
                store["store_type_icon"] = store_type_doc.icon
                store["store_type_color"] = store_type_doc.color
            else:
                store["store_type_name"] = "ไม่ระบุ"
                store["store_type_icon"] = "🏪"
                store["store_type_color"] = "#666666"
        
        return {
            "success": True,
            "data": {
                "stores": stores,
                "agent": {
                    "name": agent.name,
                    "agent_name": agent.agent_name
                }
            },
            "message": "ดึงข้อมูลร้านค้าสำเร็จ"
        }
        
    except frappe.DoesNotExistError:
        return {"success": False, "error": "ไม่พบข้อมูลพนักงานเซลส์"}
    except Exception as e:
        frappe.log_error(f"Error getting agent stores: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า"
        }


@frappe.whitelist(allow_guest=True)
def get_visits_summary(agent_code=None, from_date=None, to_date=None):
    """
    API: GET /api/method/crmliff.api.liff_api.get_visits_summary
    ดึงสรุปการเข้าเยี่ยมลูกค้า สำหรับ dashboard
    """
    try:
        visits = get_visit_summary(agent_code, from_date, to_date)
        return {
            "success": True,
            "data": visits,
            "message": "Visits summary retrieved successfully"
        }
    except Exception as e:
        frappe.log_error(f"Error getting visits summary: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to get visits summary"
        }


@frappe.whitelist(allow_guest=True)
def get_store_detail(store_id):
    """
    API: GET /api/method/crmliff.api.liff_api.get_store_detail
    ดึงรายละเอียดร้านค้าตาม ID
    """
    try:
        # Get store data with related information
        store = frappe.get_doc("CLIFF Store", store_id)
        
        if not store:
            return {"success": False, "error": "ไม่พบข้อมูลร้านค้า"}
        
        # Get store type information
        store_type_info = {}
        if store.store_type:
            store_type_doc = frappe.get_doc("CLIFF Store Type", store.store_type)
            store_type_info = {
                "store_type_name": store_type_doc.store_type_name,
                "store_type_icon": store_type_doc.icon,
                "store_type_color": store_type_doc.color
            }
        
        store_data = {
            "name": store.name,
            "store_name": store.store_name,
            "store_type": store.store_type,
            "store_description": store.store_description,
            "contact_name": store.contact_name,
            "contact_phone": store.contact_phone,
            "location_lat": store.location_lat,
            "location_lng": store.location_lng,
            "address": store.address,
            "status": store.status,
            "cover_image": store.cover_image,
            "created_by_agent": store.created_by_agent,
            "first_visit_date": store.first_visit_date,
            "last_visit_date": store.last_visit_date,
            "total_visits": store.total_visits,
            "creation": store.creation,
            "modified": store.modified,
            **store_type_info
        }
        
        return {
            "success": True,
            "data": store_data,
            "message": "ดึงข้อมูลร้านค้าสำเร็จ"
        }
        
    except frappe.DoesNotExistError:
        return {"success": False, "error": "ไม่พบข้อมูลร้านค้า"}
    except Exception as e:
        frappe.log_error(f"Error getting store detail: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า"
        }


@frappe.whitelist(allow_guest=True)
def get_store_checkin_history(store_id):
    """
    API: GET /api/method/crmliff.api.liff_api.get_store_checkin_history
    ดึงประวัติการเช็คอินของร้านค้า
    """
    try:
        # Get all visits for this store
        visits = frappe.get_all(
            "CLIFF Customer Store Visit",
            filters={"store_name": store_id},
            fields=[
                "name", "visit_type", "visit_datetime", 
                "location_lat", "location_lng", "sale_agent", "remark"
            ],
            order_by="visit_datetime desc"
        )
        
        # Get photos for each visit
        for visit in visits:
            photos = frappe.get_all(
                "CLIFF Store Visit Photo",
                filters={"parent": visit.name},
                fields=["image", "caption"]
            )
            visit["photos"] = photos
        
        return {
            "success": True,
            "data": visits,
            "message": "ดึงประวัติการเช็คอินสำเร็จ"
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting store checkin history: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "เกิดข้อผิดพลาดในการดึงประวัติการเช็คอิน"
        }


@frappe.whitelist(allow_guest=True, methods=["POST"])
def update_store():
    """
    API: POST /api/method/crmliff.api.liff_api.update_store
    อัพเดทข้อมูลร้านค้า
    """
    try:
        # Get request data
        request_data = frappe.request.get_data()
        
        # Parse JSON data
        try:
            data = json.loads(request_data)
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Invalid JSON format",
                "message": "ข้อมูล JSON ไม่ถูกต้อง"
            }
        
        store_id = data.get('store_id')
        if not store_id:
            return {"success": False, "error": "ไม่พบรหัสร้านค้า"}
        
        # Get store document
        store_doc = frappe.get_doc("CLIFF Store", store_id)
        if not store_doc:
            return {"success": False, "error": "ไม่พบข้อมูลร้านค้า"}
        
        # Update store fields
        if data.get('store_name'):
            store_doc.store_name = data.get('store_name')
        
        if data.get('store_type'):
            store_doc.store_type = data.get('store_type')
        
        if 'contact_name' in data:
            store_doc.contact_name = data.get('contact_name')
        
        if 'contact_phone' in data:
            store_doc.contact_phone = data.get('contact_phone')
        
        if 'store_description' in data:
            store_doc.store_description = data.get('store_description')
        
        # Save changes
        store_doc.save(ignore_permissions=True)
        
        return {
            "success": True,
            "data": {
                "store_id": store_doc.name,
                "store_name": store_doc.store_name
            },
            "message": "อัพเดทข้อมูลร้านสำเร็จ"
        }
        
    except frappe.DoesNotExistError:
        return {"success": False, "error": "ไม่พบข้อมูลร้านค้า"}
    except Exception as e:
        frappe.log_error(f"Error updating store: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "เกิดข้อผิดพลาดในการอัพเดทข้อมูลร้าน"
        }


@frappe.whitelist(allow_guest=True)
def health_check():
    """
    API: GET /api/method/crmliff.api.liff_api.health_check
    ตรวจสอบสถานะ API
    """
    return {
        "success": True,
        "message": "CRM LIFF API is working",
        "timestamp": frappe.utils.now()
    }


@frappe.whitelist(allow_guest=True, methods=["POST"])
def upload_photo():
    """
    API: POST /api/method/crmliff.api.liff_api.upload_photo
    Custom photo upload for LIFF with production support and bypass permission checks
    """
    try:
        # Log request info for debugging
        user_agent = frappe.request.headers.get('User-Agent', 'Unknown')
        is_liff = 'LIFF' in user_agent or 'LINE' in user_agent
        
        frappe.logger().info(f"LIFF Upload - User Agent: {user_agent}, Is LIFF: {is_liff}")
        
        # Get uploaded file
        files = frappe.request.files
        if not files or 'file' not in files:
            frappe.throw("No file uploaded")
        
        file = files['file']
        
        # Validate file
        if not file.filename:
            frappe.throw("Invalid file")
        
        # Read file content
        file_content = file.read()
        file_size = len(file_content)
        
        frappe.logger().info(f"LIFF Upload - File: {file.filename}, Size: {file_size} bytes")
        
        # Size limit check (3MB)
        if file_size > 3 * 1024 * 1024:
            frappe.throw("File too large. Maximum size is 3MB.")
        
        # Create unique filename to avoid conflicts
        import uuid
        import os
        file_ext = os.path.splitext(file.filename)[1] if '.' in file.filename else '.jpg'
        unique_filename = f"liff_upload_{uuid.uuid4().hex[:8]}{file_ext}"
        
        # Use frappe.utils.file_manager for proper handling with ignore_permissions
        from frappe.utils.file_manager import save_file
        
        # Save file using file_manager 
        file_doc = save_file(
            fname=unique_filename,
            content=file_content,
            dt="CLIFF Store",
            dn="temp",
            is_private=0
        )
        
        frappe.logger().info(f"LIFF Upload Success - File URL: {file_doc.file_url}")
        
        # Return in standard Frappe format (matching /api/method/upload_file)
        return {
            "file_url": file_doc.file_url,
            "file_name": file_doc.file_name,
            "name": file_doc.name
        }
        
    except Exception as e:
        error_msg = str(e)
        frappe.log_error(f"LIFF Upload Error: {error_msg}\nUser Agent: {frappe.request.headers.get('User-Agent', 'Unknown')}", "LIFF Upload Error")
        frappe.throw(f"Upload failed: {error_msg}")


@frappe.whitelist(allow_guest=True, methods=["POST"])
def log_debug():
    """
    API: POST /api/method/crmliff.api.liff_api.log_debug
    บันทึกข้อมูล Debug สำหรับการแก้ไขปัญหา
    """
    try:
        # Get request data
        request_data = frappe.request.get_data()
        if isinstance(request_data, bytes):
            request_data = request_data.decode('utf-8')
        
        data = json.loads(request_data) if isinstance(request_data, str) else request_data
        
        debug_info = data.get('debug_info', {})
        user_id = data.get('user_id')
        
        # Create error log entry
        error_log = frappe.get_doc({
            "doctype": "Error Log",
            "method": "LIFF Debug Info",
            "error": json.dumps(debug_info, indent=2),
            "reference_doctype": "CLIFF Customer Store Visit",
            "reference_name": user_id or "Unknown User"
        })
        error_log.insert(ignore_permissions=True)
        
        # Also log to console for immediate debugging
        frappe.logger().info(f"LIFF Debug Info from {user_id}: {json.dumps(debug_info, indent=2)}")
        
        return {
            "success": True,
            "message": "Debug info logged successfully",
            "log_id": error_log.name
        }
        
    except Exception as e:
        frappe.log_error(f"Error logging debug info: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to log debug info"
        } 