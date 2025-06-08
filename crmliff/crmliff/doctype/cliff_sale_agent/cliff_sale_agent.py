# Copyright (c) 2024, Bangbow and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class CLIFFSaleAgent(Document):
    def validate(self):
        """Validate sale agent data"""
        self.validate_unique_fields()
    
    def validate_unique_fields(self):
        """Ensure agent_code and line_uid are unique"""
        # Check agent_code uniqueness
        if frappe.db.exists("CLIFF Sale Agent", {
            "agent_code": self.agent_code,
            "name": ("!=", self.name)
        }):
            frappe.throw(f"Agent Code '{self.agent_code}' already exists")
        
        # Check line_uid uniqueness if provided
        if self.line_uid and frappe.db.exists("CLIFF Sale Agent", {
            "line_uid": self.line_uid,
            "name": ("!=", self.name)
        }):
            frappe.throw(f"LINE UID '{self.line_uid}' is already mapped to another agent")


@frappe.whitelist()
def verify_agent_code(agent_code):
    """API method to verify agent code and return agent info"""
    agent = frappe.get_value(
        "CLIFF Sale Agent",
        {"agent_code": agent_code, "is_active": 1},
        ["name", "agent_name", "territory", "line_uid"],
        as_dict=True
    )
    
    if not agent:
        frappe.throw(f"Invalid agent code: {agent_code}")
    
    return agent


@frappe.whitelist()
def map_line_uid(agent_code, line_uid):
    """API method to map LINE UID to agent code"""
    # Check if agent exists and is active
    agent = frappe.get_doc("CLIFF Sale Agent", agent_code)
    if not agent.is_active:
        frappe.throw(f"Agent {agent_code} is not active")
    
    # Check if LINE UID is already mapped
    existing_agent = frappe.get_value(
        "CLIFF Sale Agent",
        {"line_uid": line_uid},
        "agent_code"
    )
    
    if existing_agent and existing_agent != agent_code:
        frappe.throw(f"LINE UID is already mapped to agent {existing_agent}")
    
    # Update LINE UID
    agent.line_uid = line_uid
    agent.save()
    
    return {
        "success": True,
        "agent_code": agent.agent_code,
        "agent_name": agent.agent_name,
        "territory": agent.territory
    }


@frappe.whitelist()
def get_agent_by_line_uid(line_uid):
    """API method to get agent info by LINE UID"""
    agent = frappe.get_value(
        "CLIFF Sale Agent",
        {"line_uid": line_uid, "is_active": 1},
        ["name", "agent_code", "agent_name", "territory"],
        as_dict=True
    )
    
    return agent 