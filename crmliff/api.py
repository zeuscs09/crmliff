import frappe
import json
from frappe.utils import now

@frappe.whitelist(allow_guest=True)
def verify_agent(agent_code, line_uid=None):
    """Verify agent credentials and optionally update LINE UID"""
    try:
        agent = frappe.get_doc("CLIFF Sale Agent", agent_code)
        
        # Update LINE UID if provided
        if line_uid and agent.line_uid != line_uid:
            agent.line_uid = line_uid
            agent.save(ignore_permissions=True)
        
        return {
            "success": True,
            "agent": {
                "name": agent.name,
                "agent_name": agent.agent_name,
                "agent_code": agent.agent_code,
                "line_uid": agent.line_uid
            }
        }
        
    except frappe.DoesNotExistError:
        return {"success": False, "error": "รหัสพนักงานเซลส์ไม่ถูกต้อง"}
    except Exception as e:
        frappe.log_error(f"Error verifying agent: {str(e)}")
        return {"success": False, "error": "เกิดข้อผิดพลาดในการยืนยันตัวตน"}

@frappe.whitelist(allow_guest=True)
def save_visit_data(data):
    """Save visit data with support for new store creation and check-ins"""
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
        visit.visit_datetime = now()
        
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
            "visit_id": visit.name,
            "store_id": store_doc.name if store_doc else None,
            "message": "บันทึกข้อมูลสำเร็จ"
        }
        
    except Exception as e:
        frappe.log_error(f"Error saving visit data: {str(e)}")
        return {"success": False, "error": "เกิดข้อผิดพลาดในการบันทึกข้อมูล"}

@frappe.whitelist(allow_guest=True)
def get_agent_stores(agent_code):
    """Get all stores created by a specific agent"""
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
            "stores": stores,
            "agent": {
                "name": agent.name,
                "agent_name": agent.agent_name
            }
        }
        
    except frappe.DoesNotExistError:
        return {"success": False, "error": "ไม่พบข้อมูลพนักงานเซลส์"}
    except Exception as e:
        frappe.log_error(f"Error getting agent stores: {str(e)}")
        return {"success": False, "error": "เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า"} 