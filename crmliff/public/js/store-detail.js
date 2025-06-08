// Store Detail App
class StoreDetailApp {
    constructor() {
        this.currentAgent = null;
        this.userProfile = null;
        this.storeId = null;
        this.storeData = null;
        this.storeTypes = [];
        this.checkinHistory = [];
        
        this.init();
    }

    async init() {
        try {
            // Get store ID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            this.storeId = urlParams.get('id');
            
            if (!this.storeId) {
                this.showError('ไม่พบรหัสร้านค้า กรุณาเข้าถึงหน้านี้ผ่านรายการร้านค้า');
                return;
            }

            console.log('🏪 Store ID:', this.storeId);

            // Initialize LIFF
            this.userProfile = await CRMLIFFCommon.initializeLIFF('store-detail');
            
            if (!this.userProfile) {
                return; // Will redirect to login
            }

            // Try to auto-login
            await this.tryAutoLogin();
            
        } catch (error) {
            console.error('LIFF init error:', error);
            this.hideElement('loading-screen');
            this.showError('เกิดข้อผิดพลาดในการเชื่อมต่อ LINE');
        }
    }

    async tryAutoLogin() {
        try {
            // Check if agent is already linked with this LINE UID
            const existingAgent = await CRMLIFFCommon.getAgentByLineUID(this.userProfile.userId);
            
            if (existingAgent) {
                console.log('✅ Auto-login successful');
                this.currentAgent = existingAgent;
                
                // Store agent for cross-page use
                CRMLIFFCommon.setCurrentAgent(this.currentAgent);
                
                this.showMainScreen();
            } else {
                console.log('🔐 Need manual verification');
                this.showLoginScreen();
            }
            
        } catch (error) {
            console.warn('Auto-login failed:', error);
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        this.hideElement('loading-screen');
        this.hideElement('main-screen');
        this.showElement('login-screen');
        
        // Display user profile
        if (this.userProfile) {
            document.getElementById('user-name').textContent = this.userProfile.displayName || 'ผู้ใช้';
        }
        
        // Setup verification
        this.setupVerification();
    }

    setupVerification() {
        const verifyBtn = document.getElementById('verify-btn');
        const agentCodeInput = document.getElementById('agent-code');
        
        verifyBtn.addEventListener('click', () => this.verifyAgent());
        
        agentCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.verifyAgent();
            }
        });
    }

    async verifyAgent() {
        const agentCode = document.getElementById('agent-code').value.trim();
        
        if (!agentCode) {
            this.showError('กรุณากรอกรหัสพนักงานเซลส์');
            return;
        }

        try {
            const verifyBtn = document.getElementById('verify-btn');
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังตรวจสอบ...';

            // Verify agent code and link with LINE UID
            this.currentAgent = await CRMLIFFCommon.verifyAndLinkAgent(agentCode, this.userProfile.userId);
            
            // Store agent for cross-page use
            CRMLIFFCommon.setCurrentAgent(this.currentAgent);
            
            this.showMainScreen();

        } catch (error) {
            console.error('Verification error:', error);
            this.showError(error.message || 'เกิดข้อผิดพลาดในการยืนยันตัวตน');
        } finally {
            const verifyBtn = document.getElementById('verify-btn');
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-check"></i> ยืนยันตัวตน';
        }
    }

    async showMainScreen() {
        this.hideElement('loading-screen');
        this.hideElement('login-screen');
        this.showElement('main-screen');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load data
        await this.loadStoreData();
        await this.loadStoreTypes();
        await this.loadCheckinHistory();
    }

    setupEventListeners() {
        // Back button
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = '/list-store';
        });

        // Navigate button
        document.getElementById('navigate-store-btn').addEventListener('click', () => {
            this.navigateToStore();
        });

        // Checkin button
        document.getElementById('checkin-store-btn').addEventListener('click', () => {
            this.showCheckinModal();
        });

        // Edit button
        document.getElementById('edit-store-btn').addEventListener('click', () => {
            this.showEditModal();
        });

        // Setup checkin modal events
        this.setupCheckinEvents();

        // Edit modal events
        document.getElementById('close-edit').addEventListener('click', () => {
            this.hideEditModal();
        });

        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            this.hideEditModal();
        });

        document.getElementById('save-edit-btn').addEventListener('click', () => {
            this.saveStoreChanges();
        });

        // Photo modal events
        document.getElementById('close-photo').addEventListener('click', () => {
            this.hidePhotoModal();
        });

        // Error modal events
        document.getElementById('close-error').addEventListener('click', () => {
            this.hideErrorModal();
        });

        document.getElementById('error-ok-btn').addEventListener('click', () => {
            this.hideErrorModal();
        });
    }

    async loadStoreData() {
        try {
            console.log('📥 Loading store data for ID:', this.storeId);
            
            const response = await fetch(`/api/method/crmliff.api.liff_api.get_store_detail?store_id=${this.storeId}`);
            const result = await response.json();
            
            if (result.message && result.message.success) {
                this.storeData = result.message.data;
                console.log('✅ Store data loaded:', this.storeData);
                this.renderStoreData();
            } else {
                throw new Error(result.message?.error || 'ไม่สามารถโหลดข้อมูลร้านค้าได้');
            }
            
        } catch (error) {
            console.error('Error loading store data:', error);
            this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูลร้านค้า');
        }
    }

    async loadStoreTypes() {
        try {
            const response = await fetch('/api/method/crmliff.api.liff_api.get_store_types');
            const result = await response.json();
            
            if (result.message && result.message.success) {
                this.storeTypes = result.message.data;
                console.log('✅ Store types loaded:', this.storeTypes);
                this.populateStoreTypeSelect();
            }
        } catch (error) {
            console.error('Error loading store types:', error);
        }
    }

    async loadCheckinHistory() {
        try {
            console.log('📥 Loading checkin history for store:', this.storeId);
            
            const response = await fetch(`/api/method/crmliff.api.liff_api.get_store_checkin_history?store_id=${this.storeId}`);
            const result = await response.json();
            
            if (result.message && result.message.success) {
                this.checkinHistory = result.message.data;
                console.log('✅ Checkin history loaded:', this.checkinHistory);
                this.renderCheckinHistory();
            } else {
                console.warn('No checkin history found');
                this.renderEmptyCheckinHistory();
            }
            
        } catch (error) {
            console.error('Error loading checkin history:', error);
            this.renderEmptyCheckinHistory();
        }
    }

    renderStoreData() {
        if (!this.storeData) return;

        // Update page title
        document.getElementById('page-title').textContent = this.storeData.store_name;
        document.getElementById('store-name').textContent = this.storeData.store_name;

        // Update store image
        const imageContainer = document.getElementById('store-image-container');
        if (this.storeData.cover_image) {
            imageContainer.innerHTML = `<img src="${this.storeData.cover_image}" alt="${this.storeData.store_name}">`;
        } else {
            imageContainer.innerHTML = '<i class="fas fa-image no-image"></i>';
        }

        // Update store info
        const infoContent = document.getElementById('store-info-content');
        infoContent.innerHTML = `
            <div class="store-info-item">
                <i class="fas fa-tag info-icon"></i>
                <span class="info-label">ประเภทร้าน:</span>
                <span class="info-value">${this.storeData.store_type_name || 'ไม่ระบุ'}</span>
            </div>
            
            ${this.storeData.contact_name ? `
                <div class="store-info-item">
                    <i class="fas fa-user info-icon"></i>
                    <span class="info-label">ผู้ติดต่อ:</span>
                    <span class="info-value">${this.storeData.contact_name}</span>
                </div>
            ` : ''}
            
            ${this.storeData.contact_phone ? `
                <div class="store-info-item">
                    <i class="fas fa-phone info-icon"></i>
                    <span class="info-label">เบอร์โทร:</span>
                    <span class="info-value">${this.storeData.contact_phone}</span>
                </div>
            ` : ''}
            
            <div class="store-info-item">
                <i class="fas fa-map-marker-alt info-icon"></i>
                <span class="info-label">ที่อยู่:</span>
                <span class="info-value">${this.storeData.address || 'ไม่มีข้อมูล'}</span>
            </div>
            
            ${this.storeData.store_description ? `
                <div class="store-info-item">
                    <i class="fas fa-info-circle info-icon"></i>
                    <span class="info-label">รายละเอียด:</span>
                    <span class="info-value">${this.storeData.store_description}</span>
                </div>
            ` : ''}
            
            <div class="store-info-item">
                <i class="fas fa-calendar info-icon"></i>
                <span class="info-label">สร้างเมื่อ:</span>
                <span class="info-value">${this.formatDateTime(this.storeData.creation)}</span>
            </div>
            
            <div class="store-info-item">
                <i class="fas fa-chart-line info-icon"></i>
                <span class="info-label">เยี่ยมชมทั้งหมด:</span>
                <span class="info-value">${this.storeData.total_visits || 0} ครั้ง</span>
            </div>
        `;
    }

    renderCheckinHistory() {
        const historyContent = document.getElementById('checkin-history-content');
        
        if (!this.checkinHistory || this.checkinHistory.length === 0) {
            this.renderEmptyCheckinHistory();
            return;
        }

        const timelineHTML = `
            <div class="checkin-timeline">
                ${this.checkinHistory.map(checkin => `
                    <div class="checkin-item ${checkin.visit_type.toLowerCase().replace(/\s+/g, '-')}">
                        <div class="checkin-card">
                            <div class="checkin-header">
                                <div class="checkin-type ${checkin.visit_type.toLowerCase().replace(/\s+/g, '-')}">
                                    ${this.getVisitTypeIcon(checkin.visit_type)}
                                    ${this.getVisitTypeLabel(checkin.visit_type)}
                                </div>
                                <div class="checkin-datetime">
                                    <div class="checkin-date">${this.formatDate(checkin.visit_datetime)}</div>
                                    <div class="checkin-time">${this.formatTime(checkin.visit_datetime)}</div>
                                </div>
                            </div>
                            
                            ${checkin.remark ? `
                                <div class="checkin-remark">
                                    <i class="fas fa-comment"></i> ${checkin.remark}
                                </div>
                            ` : ''}
                            
                            ${checkin.photos && checkin.photos.length > 0 ? `
                                <div class="checkin-photos">
                                    ${checkin.photos.map(photo => `
                                        <div class="checkin-photo" onclick="app.showPhotoModal('${photo.image}')">
                                            <img src="${photo.image}" alt="รูปภาพ checkin">
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        historyContent.innerHTML = timelineHTML;
    }

    renderEmptyCheckinHistory() {
        const historyContent = document.getElementById('checkin-history-content');
        historyContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                <p>ยังไม่มีประวัติการเช็คอิน</p>
                <p style="font-size: 14px; color: #999;">ประวัติการเยี่ยมชมจะแสดงที่นี่</p>
            </div>
        `;
    }

    populateStoreTypeSelect() {
        const select = document.getElementById('edit-store-type');
        select.innerHTML = '<option value="">เลือกประเภทร้าน</option>';
        
        this.storeTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.store_type_name;
            select.appendChild(option);
        });
    }

    setupCheckinEvents() {
        // Checkin modal close events
        document.getElementById('close-checkin').addEventListener('click', () => {
            this.hideCheckinModal();
        });

        document.getElementById('checkin-cancel-btn').addEventListener('click', () => {
            this.hideCheckinModal();
        });

        // Photo capture events
        const photoInput = document.getElementById('checkin-photo');
        const takePhotoBtn = document.getElementById('checkin-take-photo-btn');
        const retakeBtn = document.getElementById('checkin-retake-btn');

        takePhotoBtn.addEventListener('click', () => {
            photoInput.click();
        });

        retakeBtn.addEventListener('click', () => {
            this.hideElement('checkin-photo-preview');
            this.showElement('checkin-photo-capture-prompt');
            this.checkinPhotoData = null;
            this.checkCheckinFormValidity();
        });

        photoInput.addEventListener('change', (e) => {
            this.handleCheckinPhotoCapture(e);
        });

        // Submit checkin
        document.getElementById('checkin-submit-btn').addEventListener('click', () => {
            this.submitCheckin();
        });
    }

    async showCheckinModal() {
        if (!this.storeData) return;

        // Populate store info
        const storeInfo = document.getElementById('checkin-store-info');
        storeInfo.innerHTML = `
            <h4>${this.storeData.store_name}</h4>
            <p style="margin: 0; color: #666; font-size: 14px;">${this.storeData.store_type_name || 'ร้านค้า'}</p>
        `;

        // Reset form
        this.checkinLocation = null;
        this.checkinPhotoData = null;
        document.getElementById('checkin-remark').value = '';
        this.hideElement('checkin-photo-preview');
        this.showElement('checkin-photo-capture-prompt');

        // Get current location
        await this.getCurrentLocationForCheckin();

        this.showElement('checkin-modal');
        this.checkCheckinFormValidity();
    }

    hideCheckinModal() {
        this.hideElement('checkin-modal');
    }

    async getCurrentLocationForCheckin() {
        const locationDisplay = document.getElementById('checkin-location-display');
        
        try {
            locationDisplay.textContent = 'กำลังหาตำแหน่ง...';
            
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                });
            });

            this.checkinLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            locationDisplay.innerHTML = `
                <i class="fas fa-map-marker-alt" style="color: #28a745;"></i>
                ตำแหน่ง: ${this.checkinLocation.lat.toFixed(6)}, ${this.checkinLocation.lng.toFixed(6)}
            `;

            this.checkCheckinFormValidity();

        } catch (error) {
            console.error('Error getting location:', error);
            locationDisplay.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>
                ไม่สามารถหาตำแหน่งได้ กรุณาอนุญาต location access
            `;
        }
    }

    handleCheckinPhotoCapture(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.checkinPhotoData = e.target.result;
            
            // Show preview
            const previewImage = document.getElementById('checkin-preview-image');
            previewImage.src = this.checkinPhotoData;
            
            this.hideElement('checkin-photo-capture-prompt');
            this.showElement('checkin-photo-preview');
            
            this.checkCheckinFormValidity();
        };
        
        reader.readAsDataURL(file);
    }

    checkCheckinFormValidity() {
        const submitBtn = document.getElementById('checkin-submit-btn');
        const isValid = this.checkinLocation && this.checkinPhotoData;
        
        submitBtn.disabled = !isValid;
        if (isValid) {
            submitBtn.innerHTML = '<i class="fas fa-check"></i> เช็คอิน';
        } else {
            submitBtn.innerHTML = '<i class="fas fa-check"></i> กรุณากรอกข้อมูลให้ครบ';
        }
    }

    async submitCheckin() {
        if (!this.checkinLocation || !this.checkinPhotoData) return;

        const submitBtn = document.getElementById('checkin-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเช็คอิน...';

        try {
            // Upload photo first
            let photoUrl = null;
            if (this.checkinPhotoData) {
                const response = await fetch(this.checkinPhotoData);
                const blob = await response.blob();
                const file = new File([blob], `checkin_${this.storeId}_${Date.now()}.jpg`, { type: 'image/jpeg' });
                photoUrl = await this.uploadPhoto(file);
            }

            const data = {
                agent_code: this.currentAgent.name,
                store_id: this.storeId,
                location_lat: this.checkinLocation.lat,
                location_lng: this.checkinLocation.lng,
                remark: document.getElementById('checkin-remark').value.trim(),
                photos: [{
                    image: photoUrl,
                    caption: `เช็คอิน ${this.storeData.store_name}`
                }]
            };

            const response = await fetch('/api/method/crmliff.api.liff_api.checkin_store', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.message && result.message.success) {
                this.hideCheckinModal();
                this.showSuccess('เช็คอินสำเร็จ!');
                // Reload checkin history
                await this.loadCheckinHistory();
            } else {
                throw new Error(result.message?.error || 'เกิดข้อผิดพลาดในการเช็คอิน');
            }

        } catch (error) {
            console.error('Checkin error:', error);
            this.showError(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> เช็คอิน';
        }
    }

    async uploadPhoto(file) {
        // Compress image before upload
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        return new Promise((resolve, reject) => {
            img.onload = async () => {
                // Calculate new dimensions (max 800px width)
                const maxWidth = 800;
                const scale = Math.min(maxWidth / img.width, maxWidth / img.height);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(async (blob) => {
                    try {
                        const formData = new FormData();
                        formData.append('file', blob, file.name);
                        formData.append('is_private', 0);
                        
                        const response = await fetch('/api/method/upload_file', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const result = await response.json();
                        if (result.message && result.message.file_url) {
                            resolve(result.message.file_url);
                        } else {
                            reject(new Error('Upload failed'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                }, 'image/jpeg', 0.8);
            };
            
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    showEditModal() {
        if (!this.storeData) return;

        // Populate form with current data
        document.getElementById('edit-store-name').value = this.storeData.store_name || '';
        document.getElementById('edit-store-type').value = this.storeData.store_type || '';
        document.getElementById('edit-contact-name').value = this.storeData.contact_name || '';
        document.getElementById('edit-contact-phone').value = this.storeData.contact_phone || '';
        document.getElementById('edit-store-description').value = this.storeData.store_description || '';

        this.showElement('edit-modal');
    }

    hideEditModal() {
        this.hideElement('edit-modal');
    }

    async saveStoreChanges() {
        try {
            const saveBtn = document.getElementById('save-edit-btn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...';

            const formData = {
                store_id: this.storeId,
                store_name: document.getElementById('edit-store-name').value.trim(),
                store_type: document.getElementById('edit-store-type').value,
                contact_name: document.getElementById('edit-contact-name').value.trim(),
                contact_phone: document.getElementById('edit-contact-phone').value.trim(),
                store_description: document.getElementById('edit-store-description').value.trim()
            };

            if (!formData.store_name) {
                this.showError('กรุณากรอกชื่อร้าน');
                return;
            }

            const response = await fetch('/api/method/crmliff.api.liff_api.update_store', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.message && result.message.success) {
                this.hideEditModal();
                await this.loadStoreData(); // Reload store data
                this.showSuccess('บันทึกข้อมูลสำเร็จ');
            } else {
                throw new Error(result.message?.error || 'ไม่สามารถบันทึกข้อมูลได้');
            }

        } catch (error) {
            console.error('Error saving store changes:', error);
            this.showError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            const saveBtn = document.getElementById('save-edit-btn');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> บันทึก';
        }
    }

    showPhotoModal(imageUrl) {
        const photoView = document.getElementById('photo-view');
        photoView.src = imageUrl;
        this.showElement('photo-modal');
    }

    hidePhotoModal() {
        this.hideElement('photo-modal');
    }

    getVisitTypeLabel(visitType) {
        const labels = {
            'New Store': 'สร้างร้านใหม่',
            'Check-in': 'เช็คอิน',
            'Follow-up': 'ติดตาม'
        };
        return labels[visitType] || visitType;
    }

    getVisitTypeIcon(visitType) {
        const icons = {
            'New Store': '<i class="fas fa-plus-circle"></i>',
            'Check-in': '<i class="fas fa-map-marker-alt"></i>',
            'Follow-up': '<i class="fas fa-phone"></i>'
        };
        return icons[visitType] || '<i class="fas fa-calendar-check"></i>';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('hidden');
        }
    }

    hideElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        this.showElement('error-modal');
    }

    hideErrorModal() {
        this.hideElement('error-modal');
    }

    navigateToStore() {
        if (!this.storeData || !this.storeData.location_lat || !this.storeData.location_lng) {
            this.showError('ไม่พบข้อมูลตำแหน่งของร้าน');
            return;
        }
        
        console.log('🗺️ Navigate to store:', this.storeData.location_lat, this.storeData.location_lng);
        
        // Open Google Maps with navigation
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${this.storeData.location_lat},${this.storeData.location_lng}`;
        window.open(googleMapsUrl, '_blank');
    }

    showSuccess(message) {
        // You can implement a success toast or notification here
        console.log('✅ Success:', message);
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Store Detail App Starting...');
    app = new StoreDetailApp();
}); 