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