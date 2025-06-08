# Copyright (c) 2025, CRMLiff and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class CLIFFStore(Document):
	def validate(self):
		"""Validate the store data"""
		# if not self.store_name:
		# 	frappe.throw("Store Name is required")
		
		if not self.location_lat or not self.location_lng:
			frappe.throw("Location coordinates are required")
	
	
	def before_save(self):
		"""Set first visit date when creating new store"""
		if self.is_new():
			self.first_visit_date = frappe.utils.now()
			self.total_visits = 1
	
	def update_visit_count(self):
		"""Update last visit date and increment visit count"""
		self.last_visit_date = frappe.utils.now()
		self.total_visits += 1
		self.save(ignore_permissions=True) 