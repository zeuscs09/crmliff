# Copyright (c) 2024, Bangbow and contributors
# For license information, please see license.txt

import frappe
import json
import base64
from frappe.model.document import Document
from frappe.utils import now
from crmliff.crmliff.doctype.cliff_sale_agent.cliff_sale_agent import get_agent_by_line_uid


class CLIFFCustomerStoreVisit(Document):
    def validate(self):
        """Validate store visit data"""
        self.validate_location()
        self.validate_photos()
    
    def validate_location(self):
        """Validate location coordinates"""
        if not (-90 <= self.location_lat <= 90):
            frappe.throw("Invalid latitude. Must be between -90 and 90")
        
        if not (-180 <= self.location_lng <= 180):
            frappe.throw("Invalid longitude. Must be between -180 and 180")
    
    def validate_photos(self):
        """Validate that at least one photo is provided"""
        if not self.photos or len(self.photos) == 0:
            frappe.throw("At least one photo is required")


@frappe.whitelist()
def submit_visit(data):
    """API method to submit store visit from LIFF"""
    try:
        # Parse JSON data if it's a string
        if isinstance(data, str):
            data = json.loads(data)
        
        # Get agent by LINE UID
        agent = get_agent_by_line_uid(data.get('line_uid'))
        if not agent:
            frappe.throw("LINE UID not found or not mapped to any agent. Please verify your agent code first.")
        
        # Create new store visit document
        visit_doc = frappe.new_doc("CLIFF Customer Store Visit")
        
        # Set basic fields
        visit_doc.sale_agent = agent.get('name')
        visit_doc.visit_datetime = now()
        visit_doc.store_type = data.get('store_type')
        visit_doc.store_name = data.get('store_name', '')
        visit_doc.store_description = data.get('store_description', '')
        visit_doc.contact_name = data.get('contact_name', '')
        visit_doc.contact_phone = data.get('contact_phone', '')
        
        # Set location
        location = data.get('location', {})
        visit_doc.location_lat = location.get('lat')
        visit_doc.location_lng = location.get('lng')
        
        # Process and save images
        images = data.get('images', [])
        if not images:
            frappe.throw("At least one image is required")
        
        for idx, img_data in enumerate(images):
            if 'base64' not in img_data:
                continue
                
            # Process base64 image
            base64_data = img_data['base64']
            if base64_data.startswith('data:image/'):
                # Extract image format and data
                format_and_data = base64_data.split(',', 1)
                if len(format_and_data) == 2:
                    image_format = format_and_data[0].split(';')[0].split('/')[1]
                    image_data = format_and_data[1]
                    
                    # Create file
                    filename = f"store_visit_{frappe.generate_hash(length=8)}_{idx+1}.{image_format}"
                    
                    file_doc = frappe.get_doc({
                        "doctype": "File",
                        "file_name": filename,
                        "content": base64.b64decode(image_data),
                        "is_private": 0
                    })
                    file_doc.save()
                    
                    # Add to photos table
                    photo_row = visit_doc.append("photos", {})
                    photo_row.image = file_doc.file_url
                    photo_row.caption = img_data.get('caption', f'รูปที่ {idx+1}')
        
        # Save the document
        visit_doc.insert()
        
        return {
            "success": True,
            "message": "Store visit recorded successfully",
            "visit_id": visit_doc.name,
            "agent_name": agent.get('agent_name')
        }
        
    except Exception as e:
        frappe.log_error(f"Error in submit_visit: {str(e)}")
        frappe.throw(f"Failed to submit store visit: {str(e)}")


@frappe.whitelist()
def get_visit_summary(agent_code=None, from_date=None, to_date=None):
    """API to get visit summary for dashboard"""
    filters = {}
    
    if agent_code:
        filters['sale_agent'] = agent_code
    
    if from_date:
        filters['visit_datetime'] = ['>=', from_date]
    
    if to_date:
        if 'visit_datetime' in filters:
            filters['visit_datetime'] = ['between', [from_date, to_date]]
        else:
            filters['visit_datetime'] = ['<=', to_date]
    
    visits = frappe.get_all(
        "CLIFF Customer Store Visit",
        filters=filters,
        fields=[
            "name", "visit_datetime", "store_name", "store_type", 
            "sale_agent", "location_lat", "location_lng"
        ],
        order_by="visit_datetime DESC"
    )
    
    return visits 