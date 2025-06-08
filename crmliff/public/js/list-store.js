// LIFF App for Store List
class StoreListApp {
    constructor() {
        this.stores = [];
        this.filteredStores = [];
        this.currentAgent = null;
        this.userProfile = null;
        
        this.init();
    }

    async init() {
        try {
            // Initialize LIFF using common function
            this.userProfile = await CRMLIFFCommon.initializeLIFF('list');
            
            if (!this.userProfile) {
                return; // Will redirect to login
            }

            // Try to auto-login if LINE UID is already linked
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
        
        // Setup search functionality
        this.setupSearch();
        
        // Setup floating action button
        this.setupFAB();
        
        // Load stores
        await this.loadStores();
    }

    setupSearch() {
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.filterStores(e.target.value);
        });
    }

    setupFAB() {
        const fab = document.getElementById('fab-new-store');
        fab.addEventListener('click', () => {
            // Navigate to create new store page
            window.location.href = '/liff-app';
        });


    }

    async loadStores() {
        try {
            this.showElement('loading-stores');
            this.hideElement('empty-stores');
            this.hideElement('stores-list');

            const params = new URLSearchParams({
                agent_code: this.currentAgent.name
            });
            
            console.log('🔍 Requesting stores for agent:', this.currentAgent.name);
            console.log('🔗 API URL:', `/api/method/crmliff.api.liff_api.get_agent_stores?${params.toString()}`);
            
            const response = await fetch(`/api/method/crmliff.api.liff_api.get_agent_stores?${params.toString()}`, {
                method: 'GET'
            });

            console.log('🌐 API Response Status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            console.log('🔍 API Response:', result);

            if (result.message && result.message.success) {
                console.log('✅ Stores data:', result.message.data.stores);
                
                // Debug: Log each store's image data
                result.message.data.stores.forEach((store, index) => {
                    console.log(`🏪 Store ${index + 1} (${store.store_name}):`, {
                        cover_image: store.cover_image,
                        hasImage: !!store.cover_image
                    });
                });
                
                this.stores = result.message.data.stores;
                this.filteredStores = [...this.stores];
                this.renderStores();
            } else {
                console.error('❌ API Error:', result.message?.error);
                throw new Error(result.message?.error || 'ไม่สามารถโหลดข้อมูลร้านค้าได้');
            }

        } catch (error) {
            console.error('Load stores error:', error);
            this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูลร้านค้า');
        } finally {
            this.hideElement('loading-stores');
        }
    }

    filterStores(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            this.filteredStores = [...this.stores];
        } else {
            this.filteredStores = this.stores.filter(store => 
                store.store_name.toLowerCase().includes(term) ||
                store.store_type_name.toLowerCase().includes(term) ||
                (store.contact_name && store.contact_name.toLowerCase().includes(term))
            );
        }
        
        this.renderStores();
    }

    renderStores() {
        console.log('🎨 renderStores called with', this.filteredStores.length, 'stores');
        const storesList = document.getElementById('stores-list');
        
        if (this.filteredStores.length === 0) {
            console.log('📝 No stores found, showing empty state');
            this.hideElement('stores-list');
            this.showElement('empty-stores');
            return;
        }

        console.log('📝 Rendering stores list');
        this.hideElement('empty-stores');
        this.showElement('stores-list');

        const cardsHTML = this.filteredStores.map(store => this.createStoreCard(store)).join('');
        console.log('🏪 Generated cards HTML length:', cardsHTML.length);
        storesList.innerHTML = cardsHTML;
        
        // Setup event listeners for store cards
        this.setupStoreCardEvents();
    }

    createStoreCard(store) {
        const lastVisitText = store.last_visit_date ? 
            this.formatDateTime(store.last_visit_date) : 'ไม่มีข้อมูล';
        
        const statusClass = `status-${store.status.toLowerCase()}`;
        
        // Create image HTML if store has image (cover_image field from API)
        const imageHtml = store.cover_image ? `
            <div class="store-image">
                <img src="${store.cover_image}" alt="${store.store_name}" loading="lazy">
            </div>
        ` : '';
        
        return `
            <div class="store-card" data-store-id="${store.name}">
                ${imageHtml}
                <h3 class="store-name">
                    <i class="fas fa-store"></i>
                    ${store.store_name}
                </h3>
                
                <p class="store-type">
                    <i class="fas fa-tag"></i> ${store.store_type_name}
                </p>
                
                ${store.contact_name ? `
                    <p class="store-detail-item">
                        <i class="fas fa-user"></i>
                        ${store.contact_name}
                    </p>
                ` : ''}
                
                ${store.contact_phone ? `
                    <p class="store-detail-item">
                        <i class="fas fa-phone"></i>
                        ${store.contact_phone}
                    </p>
                ` : ''}
                
                <p class="store-detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    ${store.address || 'ไม่มีที่อยู่'}
                </p>
                
                <p class="store-detail-item">
                    <i class="fas fa-calendar"></i>
                    เยียมชมครั้งแรก: ${this.formatDate(store.first_visit_date)}
                </p>
                
                <p class="store-detail-item">
                    <i class="fas fa-chart-line"></i>
                    เยียมชม ${store.total_visits} ครั้ง • ล่าสุด: ${lastVisitText}
                </p>
                
                <div class="store-actions">
                    <button class="btn-checkin" data-action="checkin" data-store-id="${store.name}">
                        <i class="fas fa-map-marker-alt"></i> เช็คอิน
                    </button>
                    <button class="btn-navigate" data-action="navigate" data-store-id="${store.name}" data-lat="${store.location_lat}" data-lng="${store.location_lng}">
                        <i class="fas fa-directions"></i> นำทาง
                    </button>
                    <button class="btn-view" data-action="view" data-store-id="${store.name}">
                        <i class="fas fa-eye"></i> ดู
                    </button>
                </div>
            </div>
        `;
    }

    setupStoreCardEvents() {
        // Checkin buttons
        document.querySelectorAll('[data-action="checkin"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const storeId = btn.getAttribute('data-store-id');
                this.checkinToStore(storeId);
            });
        });

        // Navigate buttons
        document.querySelectorAll('[data-action="navigate"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lat = btn.getAttribute('data-lat');
                const lng = btn.getAttribute('data-lng');
                this.navigateToStore(lat, lng);
            });
        });

        // View buttons
        document.querySelectorAll('[data-action="view"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const storeId = btn.getAttribute('data-store-id');
                this.viewStoreDetails(storeId);
            });
        });
    }

    async checkinToStore(storeId) {
        const store = this.stores.find(s => s.name === storeId);
        if (!store) return;
        
        // Show check-in modal
        this.showCheckinModal(store);
    }

    showCheckinModal(store) {
        // Populate store info
        const storeInfoDiv = document.getElementById('checkin-store-info');
        storeInfoDiv.innerHTML = `
            <h4>${store.store_name || 'ไม่มีชื่อ'}</h4>
            <p><i class="fas fa-tag"></i> ${store.store_type_name}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${store.address || 'ไม่มีที่อยู่'}</p>
        `;
        
        // Get current location
        this.getCurrentLocationForCheckin();
        
        // Setup photo input
        this.setupCheckinPhoto();
        
        // Setup modal events
        this.setupCheckinModal(store);
        
        // Show modal
        this.showElement('checkin-modal');
    }

    async getCurrentLocationForCheckin() {
        const locationDisplay = document.getElementById('checkin-location-display');
        
        try {
            const position = await this.getCurrentPosition();
            this.checkinLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            locationDisplay.innerHTML = `
                <i class="fas fa-check-circle" style="color: #4CAF50;"></i>
                พิกัด: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}
            `;
            
            this.checkCheckinFormValidity();
            
        } catch (error) {
            console.error('Location error:', error);
            locationDisplay.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color: #f44336;"></i>
                ไม่สามารถดึงตำแหน่งได้: ${error.message}
            `;
        }
    }

    setupCheckinPhoto() {
        const photoInput = document.getElementById('checkin-photo');
        const takePhotoBtn = document.getElementById('checkin-take-photo-btn');
        const retakeBtn = document.getElementById('checkin-retake-btn');
        const preview = document.getElementById('checkin-photo-preview');
        const previewImage = document.getElementById('checkin-preview-image');
        const capturePrompt = document.getElementById('checkin-photo-capture-prompt');
        
        // Take photo button click
        takePhotoBtn.addEventListener('click', () => {
            photoInput.click();
        });
        
        // Retake button click
        retakeBtn.addEventListener('click', () => {
            this.hideElement('checkin-photo-preview');
            this.showElement('checkin-photo-capture-prompt');
            this.checkinPhotoData = null;
            this.checkCheckinFormValidity();
        });
        
        photoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    console.log('📷 Checkin photo selected:', file.name, file.size, 'bytes');
                    
                    if (!file.type.startsWith('image/')) {
                        this.showError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
                        return;
                    }
                    
                    // Compress image if it's too large
                    let processedFile = file;
                    if (file.size > 2 * 1024 * 1024) { // 2MB threshold
                        console.log('🗜️ Compressing checkin image...');
                        processedFile = await this.compressImage(file, 0.7, 1920); // 70% quality, max 1920px width
                        console.log('✅ Checkin image compressed:', processedFile.size, 'bytes');
                    }
                    
                    if (processedFile.size > 5 * 1024 * 1024) {
                        this.showError('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewImage.src = e.target.result;
                        this.hideElement('checkin-photo-capture-prompt');
                        this.showElement('checkin-photo-preview');
                        this.checkinPhotoData = e.target.result;
                        this.checkCheckinFormValidity();
                    };
                    reader.readAsDataURL(processedFile);
                    
                } catch (error) {
                    console.error('❌ Checkin photo processing error:', error);
                    this.showError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
                }
            }
        });
    }

    setupCheckinModal(store) {
        const submitBtn = document.getElementById('checkin-submit-btn');
        const cancelBtn = document.getElementById('checkin-cancel-btn');
        const closeBtn = document.getElementById('close-checkin');
        
        // Submit check-in
        submitBtn.onclick = () => this.submitCheckin(store);
        
        // Close modal
        cancelBtn.onclick = () => this.hideCheckinModal();
        closeBtn.onclick = () => this.hideCheckinModal();
        
        // Reset form
        this.checkinLocation = null;
        this.checkinPhotoData = null;
        this.checkCheckinFormValidity();
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

    async submitCheckin(store) {
        if (!this.checkinLocation || !this.checkinPhotoData) return;
        
        const submitBtn = document.getElementById('checkin-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเช็คอิน...';
        
        try {
            // First, upload the photo to get the file URL
            let photoUrl = null;
            if (this.checkinPhotoData) {
                // Convert base64 to blob
                const response = await fetch(this.checkinPhotoData);
                const blob = await response.blob();
                
                // Create a file from the blob
                const file = new File([blob], `checkin_${store.name}_${Date.now()}.jpg`, { type: 'image/jpeg' });
                
                // Upload the file
                photoUrl = await this.uploadPhoto(file);
            }
            
            const data = {
                agent_code: this.currentAgent.name,
                store_id: store.name,
                location_lat: this.checkinLocation.lat,
                location_lng: this.checkinLocation.lng,
                remark: document.getElementById('checkin-remark').value.trim(),  // Add remark field
                photos: [{
                    image: photoUrl,
                    caption: `เช็คอิน ${store.store_name || 'ร้านค้า'}`
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
                // Refresh stores list
                await this.loadStores();
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

    hideCheckinModal() {
        this.hideElement('checkin-modal');
        // Reset form
        this.checkinLocation = null;
        this.checkinPhotoData = null;
        document.getElementById('checkin-photo').value = '';
        document.getElementById('checkin-remark').value = '';  // Reset remark field
        this.hideElement('checkin-photo-preview');
        this.showElement('checkin-photo-capture-prompt');
    }

    async uploadPhoto(file) {
        console.log('📤 Uploading photo...', file.size, 'bytes');
        
        try {
            // Compress image if it's too large
            let processedFile = file;
            if (file.size > 2 * 1024 * 1024) { // 2MB threshold
                console.log('🗜️ Compressing large image...');
                processedFile = await this.compressImage(file, 0.7, 1920); // 70% quality, max 1920px width
                console.log('✅ Image compressed:', processedFile.size, 'bytes');
            }
            
            if (processedFile.size > 5 * 1024 * 1024) {
                throw new Error('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
            }
            
            const formData = new FormData();
            formData.append('file', processedFile);
            formData.append('doctype', 'CLIFF Store');
            formData.append('docname', 'temp');

            const csrfToken = await this.getCSRFToken();
            
            const response = await fetch('/api/method/upload_file', {
                method: 'POST',
                headers: {
                    'X-Frappe-CSRF-Token': csrfToken,
                },
                body: formData
            });

            console.log('📤 Upload response status:', response.status);
            
            if (response.status === 413) {
                throw new Error('ไฟล์รูปภาพมีขนาดใหญ่เกินไป กรุณาลองถ่ายรูปใหม่');
            }
            
            if (!response.ok) {
                throw new Error(`Upload failed: HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('📤 Upload result:', result);
            
            if (result.message && result.message.file_url) {
                console.log('✅ Photo uploaded successfully:', result.message.file_url);
                return result.message.file_url;
            } else {
                throw new Error('Upload failed: Invalid response format');
            }
            
        } catch (error) {
            console.error('❌ Photo upload error:', error);
            
            // More specific error messages
            if (error.message.includes('413') || error.message.includes('Request Entity Too Large')) {
                throw new Error('ไฟล์รูปภาพมีขนาดใหญ่เกินไป กรุณาลองถ่ายรูปใหม่');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
            } else {
                throw error;
            }
        }
    }

    compressImage(file, quality = 0.7, maxWidth = 1920, maxHeight = 1080) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
                
                // Set canvas size
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    // Create new file from blob
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    async getCSRFToken() {
        try {
            const response = await fetch('/api/method/frappe.sessions.get_csrf_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            return result.message;
        } catch (error) {
            console.error('Error getting CSRF token:', error);
            return null;
        }
    }

    showSuccess(message) {
        // Simple success alert - could be enhanced with a proper modal
        alert(`✅ ${message}`);
    }

    navigateToStore(lat, lng) {
        console.log('🗺️ Navigate to store:', lat, lng);
        if (!lat || !lng) {
            this.showError('ไม่พบข้อมูลตำแหน่งของร้าน');
            return;
        }
        
        // Open Google Maps with navigation
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(googleMapsUrl, '_blank');
    }

    viewStoreDetails(storeId) {
        console.log('📍 View store details:', storeId);
        // Navigate to store detail page
        window.location.href = `/store-detail?id=${storeId}`;
    }

    getCurrentPosition() {
        return CRMLIFFCommon.getCurrentPosition();
    }



    // Utility functions
    formatDate(dateString) {
        return CRMLIFFCommon.formatDate(dateString);
    }

    formatDateTime(dateString) {
        return CRMLIFFCommon.formatDateTime(dateString);
    }

    showElement(id) {
        console.log(`👁️ Show element: ${id}`);
        CRMLIFFCommon.showElement(id);
    }

    hideElement(id) {
        console.log(`🙈 Hide element: ${id}`);
        CRMLIFFCommon.hideElement(id);
    }



    showError(message) {
        CRMLIFFCommon.showError(message);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new StoreListApp();
}); 