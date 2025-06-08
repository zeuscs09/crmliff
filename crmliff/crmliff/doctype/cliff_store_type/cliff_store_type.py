# Copyright (c) 2024, Bangbow and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class CLIFFStoreType(Document):
    def validate(self):
        """Validate store type data"""
        self.validate_unique_fields()
        self.validate_sort_order()
    
    def validate_unique_fields(self):
        """Ensure store_type_code and store_type_name are unique"""
        # Check store_type_code uniqueness
        if frappe.db.exists("CLIFF Store Type", {
            "store_type_code": self.store_type_code,
            "name": ("!=", self.name)
        }):
            frappe.throw(f"Store Type Code '{self.store_type_code}' already exists")
        
        # Check store_type_name uniqueness
        if frappe.db.exists("CLIFF Store Type", {
            "store_type_name": self.store_type_name,
            "name": ("!=", self.name)
        }):
            frappe.throw(f"Store Type Name '{self.store_type_name}' already exists")
    
    def validate_sort_order(self):
        """Ensure sort_order is a positive integer"""
        if self.sort_order < 0:
            frappe.throw("Sort Order must be a positive integer")


@frappe.whitelist()
def get_active_store_types():
    """API method to get all active store types for LIFF"""
    store_types = frappe.get_all(
        "CLIFF Store Type",
        filters={"is_active": 1},
        fields=[
            "name", 
            "store_type_name", 
            "store_type_code", 
            "icon", 
            "color",
            "description"
        ],
        order_by="sort_order ASC"
    )
    
    return store_types 