// Common functions for LIFF Apps
window.CRMLIFFCommon = {
    
    // LIFF Configuration
    LIFF_CONFIG: {
        development: '2007538080-9yOGJ6dz', // For list-store
        production: '2007538080-9yOGJ6dz'   // Replace with actual production LIFF ID
    },
    
    LIFF_CONFIG_MAIN: {
        development: '2007538080-ZN9y1Woe', // For liff-app
        production: '2007538080-ZN9y1Woe'   // Replace with actual production LIFF ID
    },

    // Get CSRF Token
    async getCSRFToken() {
        try {
            const response = await fetch('/api/method/frappe.auth.get_logged_user');
            if (response.ok) {
                // If user is logged in, get CSRF token from cookies
                const cookies = document.cookie.split(';');
                for (let cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'csrf_token') {
                        return decodeURIComponent(value);
                    }
                }
            }
            
            // If no CSRF token found, make a dummy request to get one
            const dummyResponse = await fetch('/api/method/ping');
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'csrf_token') {
                    return decodeURIComponent(value);
                }
            }
            
            return '';
        } catch (error) {
            console.warn('Could not get CSRF token:', error);
            return '';
        }
    },

    // Check if agent is already linked with LINE UID
    async getAgentByLineUID(lineUID) {
        try {
            if (!lineUID) {
                return null;
            }

            const response = await fetch(`/api/method/crmliff.api.liff_api.get_agent_info?line_uid=${encodeURIComponent(lineUID)}`, {
                method: 'GET'
            });

            const result = await response.json();

            if (result.message && result.message.success) {
                return result.message.data;
            } else {
                return null; // Not linked yet
            }

        } catch (error) {
            console.warn('Get agent by LINE UID error:', error);
            return null;
        }
    },

    // Verify Agent and Link with LINE UID
    async verifyAndLinkAgent(agentCode, lineUID) {
        try {
            if (!agentCode) {
                throw new Error('กรุณากรอกรหัสพนักงานเซลส์');
            }

            // Step 1: Verify agent code
            const verifyResponse = await fetch(`/api/method/crmliff.api.liff_api.verify_agent?agent_code=${encodeURIComponent(agentCode)}`, {
                method: 'GET'
            });

            const verifyResult = await verifyResponse.json();

            if (!verifyResult.message || !verifyResult.message.success) {
                throw new Error(verifyResult.message?.error || 'ไม่พบข้อมูลพนักงานเซลส์');
            }

            const agent = verifyResult.message.data;

            // Step 2: Link with LINE UID (if provided)
            if (lineUID) {
                try {
                    console.log(`🔗 Linking LINE UID ${lineUID} with agent ${agentCode}...`);
                    
                    const linkResponse = await fetch('/api/method/crmliff.api.liff_api.link_line_account', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            'agent_code': agentCode,
                            'line_uid': lineUID
                        })
                    });

                    const linkResult = await linkResponse.json();
                    console.log('🔗 Link Response:', linkResult);
                    
                    if (linkResult.message && linkResult.message.success) {
                        console.log('✅ LINE UID linked successfully');
                    } else {
                        console.warn('⚠️ LINE linking failed:', linkResult.message?.error);
                        // Continue anyway, verification was successful
                    }
                } catch (linkError) {
                    console.warn('⚠️ LINE linking error:', linkError);
                    // Continue anyway, verification was successful
                }
            }

            return agent;

        } catch (error) {
            console.error('Verification error:', error);
            throw error;
        }
    },



    // Show Error Modal
    showError(message) {
        const errorMessage = document.getElementById('error-message');
        const errorModal = document.getElementById('error-modal');
        
        if (errorMessage && errorModal) {
            errorMessage.textContent = message;
            errorModal.classList.remove('hidden');
            
            // Setup close handlers
            const closeBtn = document.getElementById('close-error');
            const okBtn = document.getElementById('error-ok-btn');
            
            if (closeBtn) closeBtn.onclick = () => this.closeError();
            if (okBtn) okBtn.onclick = () => this.closeError();
        } else {
            alert(message); // Fallback
        }
    },

    // Close Error Modal
    closeError() {
        const errorModal = document.getElementById('error-modal');
        if (errorModal) {
            errorModal.classList.add('hidden');
        }
    },

    // Initialize LIFF
    async initializeLIFF(appType = 'list') {
        try {
            // Check if in development mode
            const isDev = window.location.hostname === 'localhost' || 
                         window.location.hostname.includes('127.0.0.1') ||
                         window.location.hostname.endsWith('.localhost');
            
            if (isDev && !window.liff.userId) {
                console.log('🔧 Development mode detected');
                // In dev mode, liff is already mocked by dev-mock.js
            } else {
                // Production mode - use real LIFF
                const config = appType === 'main' ? this.LIFF_CONFIG_MAIN : this.LIFF_CONFIG;
                const liffId = isDev ? config.development : config.production;
                
                await liff.init({ liffId });
                
                if (!liff.isLoggedIn()) {
                    liff.login();
                    return null;
                }
            }

            return await liff.getProfile();
            
        } catch (error) {
            console.error('LIFF initialization failed:', error);
            throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ LINE');
        }
    },

    // Get Current Position
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            // Check for mock location first (development)
            if (window.mockLocation) {
                console.log('📍 Using mock location:', window.mockLocation);
                resolve({
                    coords: window.mockLocation
                });
                return;
            }

            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    },

    // Format Date
    formatDate(dateString) {
        if (!dateString) return 'ไม่มีข้อมůล';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format DateTime
    formatDateTime(dateString) {
        if (!dateString) return 'ไม่มีข้อมูล';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Show/Hide Elements
    showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('hidden');
        }
    },

    hideElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    },

    // Agent persistence across pages
    setCurrentAgent(agent) {
        localStorage.setItem('crmliff_current_agent', JSON.stringify(agent));
    },

    getCurrentAgent() {
        try {
            const stored = localStorage.getItem('crmliff_current_agent');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Error getting stored agent:', error);
            return null;
        }
    },

    // Navigation helpers
    goToListStore() {
        window.location.href = '/list-store';
    },

    goToCreateStore() {
        window.location.href = '/liff-app';
    }
}; 