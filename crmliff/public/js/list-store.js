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
            
            const response = await fetch(`/api/method/crmliff.api.liff_api.get_agent_stores?${params.toString()}`, {
                method: 'GET'
            });

            const result = await response.json();

            if (result.message && result.message.success) {
                this.stores = result.message.data.stores;
                this.filteredStores = [...this.stores];
                this.renderStores();
            } else {
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
        const storesList = document.getElementById('stores-list');
        
        if (this.filteredStores.length === 0) {
            this.hideElement('stores-list');
            this.showElement('empty-stores');
            return;
        }

        this.hideElement('empty-stores');
        this.showElement('stores-list');

        storesList.innerHTML = this.filteredStores.map(store => this.createStoreCard(store)).join('');
        
        // Setup event listeners for store cards
        this.setupStoreCardEvents();
    }

    createStoreCard(store) {
        const lastVisitText = store.last_visit_date ? 
            this.formatDateTime(store.last_visit_date) : 'ไม่มีข้อมูล';
        
        const statusClass = `status-${store.status.toLowerCase()}`;
        
        return `
            <div class="store-card" data-store-id="${store.name}">
                <div class="store-header">
                    <div class="store-info">
                        <h3 class="store-name">${store.store_name}</h3>
                        <div class="store-type">
                            <span class="status-indicator ${statusClass}"></span>
                            ${store.store_type_name}
                        </div>
                    </div>
                    ${store.cover_image ? 
                        `<img src="${store.cover_image}" alt="${store.store_name}" class="store-image">` :
                        `<div class="store-image placeholder"><i class="fas fa-store"></i></div>`
                    }
                </div>
                
                <div class="store-details">
                    ${store.contact_name ? `
                        <div class="store-detail-item">
                            <i class="fas fa-user"></i>
                            <span>${store.contact_name}</span>
                        </div>
                    ` : ''}
                    
                    ${store.contact_phone ? `
                        <div class="store-detail-item">
                            <i class="fas fa-phone"></i>
                            <span>${store.contact_phone}</span>
                        </div>
                    ` : ''}
                    
                    <div class="store-detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${store.address || 'ไม่มีที่อยู่'}</span>
                    </div>
                    
                    <div class="store-detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>เยียมชมครั้งแรก: ${this.formatDate(store.first_visit_date)}</span>
                    </div>
                </div>
                
                <div class="store-actions">
                    <button class="btn-checkin" data-action="checkin" data-store-id="${store.name}">
                        <i class="fas fa-map-marker-alt"></i> เช็คอิน
                    </button>
                    <button class="btn-view" data-action="view" data-store-id="${store.name}">
                        <i class="fas fa-eye"></i> ดู
                    </button>
                </div>
                
                <div class="last-visit">
                    <span class="visit-count">${store.total_visits} ครั้ง</span>
                    เยียมชมล่าสุด: ${lastVisitText}
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
        try {
            // Get current location
            const position = await this.getCurrentPosition();
            
            // Navigate to visit form with store pre-selected
            const params = new URLSearchParams({
                visit_type: 'Check-in',
                store_id: storeId,
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
            
            window.location.href = `/liff-app?${params.toString()}`;
            
        } catch (error) {
            console.error('Checkin error:', error);
            this.showError('ไม่สามารถดึงตำแหน่งปัจจุบันได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง');
        }
    }

    viewStoreDetails(storeId) {
        const store = this.stores.find(s => s.name === storeId);
        if (!store) return;
        
        // Create detail modal or navigate to detail page
        // For now, show basic info in alert
        alert(`ร้าน: ${store.store_name}\nประเภท: ${store.store_type_name}\nเยียมชม: ${store.total_visits} ครั้ง`);
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
        CRMLIFFCommon.showElement(id);
    }

    hideElement(id) {
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