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


@frappe.whitelist(allow_guest=True, methods=["GET", "POST"])
def save_visit_data(data):
    """
    API: POST /api/method/crmliff.api.liff_api.save_visit_data
    บันทึกข้อมูลการเข้าเยี่ยมลูกค้า พร้อมสนับสนุนการสร้างร้านใหม่และการเช็คอิน
    """
    try:
        data = json.loads(data) if isinstance(data, str) else data
        
        visit_type = data.get('visit_type', 'New Store')
        agent_code = data.get('agent_code')
        
        # Verify agent
        agent = frappe.get_doc("CLIFF Sale Agent", agent_code)
        if not agent:
            return {"success": False, "error": "ไม่พบข้อมูลพนักงานเซลส์"}
        
        store_doc = None
        
        if visit_type == 'New Store':
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
            
        elif visit_type == 'Check-in':
            # Get existing store and update visit count
            store_id = data.get('store_id')
            if not store_id:
                return {"success": False, "error": "ไม่พบข้อมูลร้านที่จะเช็คอิน"}
            
            store_doc = frappe.get_doc("CLIFF Store", store_id)
            store_doc.update_visit_count()
        
        # Create visit record
        visit = frappe.new_doc("CLIFF Customer Store Visit")
        visit.sale_agent = agent_code
        visit.visit_type = visit_type
        visit.visit_datetime = frappe.utils.now()
        
        if store_doc:
            visit.store_link = store_doc.name
            visit.store_type = store_doc.store_type
            visit.store_name = store_doc.store_name
            visit.store_description = store_doc.store_description
            visit.contact_name = store_doc.contact_name
            visit.contact_phone = store_doc.contact_phone
            visit.location_lat = store_doc.location_lat
            visit.location_lng = store_doc.location_lng
        else:
            # For check-in without creating new store
            visit.store_type = data.get('store_type')
            visit.store_name = data.get('store_name')
            visit.location_lat = data.get('location_lat')
            visit.location_lng = data.get('location_lng')
        
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
                "store_id": store_doc.name if store_doc else None
            },
            "message": "บันทึกข้อมูลสำเร็จ"
        }
        
    except Exception as e:
        frappe.log_error(f"Error saving visit data: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
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


@frappe.whitelist()
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