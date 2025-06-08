// Mock LIFF for Development
window.liffMock = {
    isLoggedIn: () => true,
    getProfile: () => {
        const mockLineUID = window.mockLineUID || localStorage.getItem('dev_mock_line_uid') || 'U123456789abcdef01';
        return Promise.resolve({
            userId: mockLineUID,
            displayName: 'Dev User',
            pictureUrl: 'https://via.placeholder.com/150'
        });
    },
    init: () => Promise.resolve(),
    login: () => console.log('Mock login called'),
    logout: () => console.log('Mock logout called')
};

// Replace liff with mock if in development
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname.includes('127.0.0.1') ||
                     window.location.hostname.endsWith('.localhost');

if (isDevelopment) {
    console.log('🔧 Using LIFF Mock for development on:', window.location.hostname);
    window.liff = window.liffMock;
} else if (!window.liff) {
    console.warn('⚠️ LIFF SDK not loaded, using mock');
    window.liff = window.liffMock;
}

// Development helpers
window.DEV_TOOLS = {
    setMockAgent: (agentData) => {
        localStorage.setItem('dev_mock_agent', JSON.stringify(agentData));
        console.log('🔧 Mock agent set:', agentData);
    },
    
    getMockAgent: () => {
        try {
            return JSON.parse(localStorage.getItem('dev_mock_agent'));
        } catch {
            return null;
        }
    },
    
    clearMockAgent: () => {
        localStorage.removeItem('dev_mock_agent');
        console.log('🧹 Mock agent cleared');
    },
    
    // Mock LINE UID functions
    setMockLineUID: (lineUID) => {
        window.mockLineUID = lineUID;
        localStorage.setItem('dev_mock_line_uid', lineUID);
        console.log('📱 Mock LINE UID set:', lineUID);
    },

    getMockLineUID: () => {
        if (window.mockLineUID) {
            return window.mockLineUID;
        }
        
        const stored = localStorage.getItem('dev_mock_line_uid');
        if (stored) {
            window.mockLineUID = stored;
            return stored;
        }
        
        return null;
    },

    clearMockLineUID: () => {
        window.mockLineUID = null;
        localStorage.removeItem('dev_mock_line_uid');
        console.log('🧹 Mock LINE UID cleared');
    },
    
    setMockLocation: (lat, lng) => {
        window.mockLocation = { latitude: lat, longitude: lng, accuracy: 10 };
        console.log('📍 Mock location set:', window.mockLocation);
        
        // Trigger location update if getCurrentLocation exists
        if (typeof getCurrentLocation === 'function') {
            console.log('🔄 Triggering location update...');
            getCurrentLocation();
        }
    }
};

console.log('🔧 Development tools available: DEV_TOOLS'); 