// ===== GLOBAL VARIABLES =====
let currentLocation = null;
let capturedPhoto = null;
let selectedStoreType = 'food';
let currentUser = null;
let mapInstance = null;
let locationMarker = null;

// ===== DOM ELEMENTS =====
const screens = {
    loading: document.getElementById('loading-screen'),
    login: document.getElementById('login-screen'),
    main: document.getElementById('main-screen'),
    success: document.getElementById('success-screen')
};

const elements = {
    // Login elements
    agentCode: document.getElementById('agent-code'),
    verifyBtn: document.getElementById('verify-btn'),
    userName: document.getElementById('user-name'),
    
    // Main screen elements
    agentName: document.getElementById('agent-name'),
    locationDisplay: document.getElementById('location-display'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Map elements
    toggleMapBtn: document.getElementById('toggle-map-btn'),
    mapContainer: document.getElementById('map-container'),
    closeMapBtn: document.getElementById('close-map-btn'),
    map: document.getElementById('map'),
    
    // Photo elements
    photoInput: document.getElementById('photo-input'),
    takePhotoBtn: document.getElementById('take-photo-btn'),
    photoPreview: document.getElementById('photo-preview'),
    previewImage: document.getElementById('preview-image'),
    retakeBtn: document.getElementById('retake-btn'),
    
    // Store type elements
    storeTypeContainer: document.getElementById('store-type-container'),
    
    // Form elements
    storeName: document.getElementById('store-name'),
    contactName: document.getElementById('contact-name'),
    contactPhone: document.getElementById('contact-phone'),
    storeDescription: document.getElementById('store-description'),
    submitBtn: document.getElementById('submit-btn'),
    
    // Success screen
    newVisitBtn: document.getElementById('new-visit-btn'),
    
    // Error modal
    errorModal: document.getElementById('error-modal'),
    errorMessage: document.getElementById('error-message'),
    closeErrorBtn: document.getElementById('close-error'),
    errorOkBtn: document.getElementById('error-ok-btn')
};

// ===== MOCK DATA =====
const mockAgents = {
    'S001': { name: 'สมชาย ใจดี', territory: 'กรุงเทพฯ เขตบางกะปิ' },
    'S002': { name: 'สมศรี รักงาน', territory: 'กรุงเทพฯ เขตห้วยขวาง' },
    'S003': { name: 'สมหมาย ขยันทำ', territory: 'กรุงเทพฯ เขตลาดพร้าว' }
};

const storeTypes = [
    { id: 'food', name: 'ร้านอาหาร', icon: '🍽️', color: '#FF6B6B' },
    { id: 'retail', name: 'ร้านค้าปลีก', icon: '🏪', color: '#4ECDC4' },
    { id: 'grocery', name: 'ร้านโชห่วย', icon: '🛒', color: '#45B7D1' },
    { id: 'drink', name: 'ร้านเครื่องดื่ม', icon: '☕', color: '#96CEB4' },
    { id: 'convenience', name: 'ร้านสะดวกซื้อ', icon: '🏬', color: '#FECA57' },
    { id: 'pharmacy', name: 'ร้านยา', icon: '💊', color: '#FF9FF3' },
    { id: 'other', name: 'อื่นๆ', icon: '❓', color: '#95A5A6' }
];

// ===== UTILITY FUNCTIONS =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-modal').classList.remove('hidden');
}

function hideError() {
    document.getElementById('error-modal').classList.add('hidden');
}

function showLoading() {
    document.getElementById('loading-screen').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-screen').classList.add('hidden');
}

function formatLocation(lat, lng) {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// ===== LIFF INITIALIZATION =====
async function initializeLiff() {
    try {
        showLoading();
        
        console.log('Initializing LIFF...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const isLoggedIn = await mockLiffLogin();
        
        if (isLoggedIn) {
            const profile = await mockGetProfile();
            const isVerified = await mockCheckVerification(profile.userId);
            
            if (isVerified) {
                currentUser = MOCK_USERS[profile.userId];
                initializeMainScreen();
            } else {
                initializeLoginScreen(profile);
            }
        } else {
            console.log('User not logged in');
            showError('กรุณาเข้าสู่ระบบผ่าน LINE');
        }
        
    } catch (error) {
        console.error('LIFF initialization failed:', error);
        showError('ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
        hideLoading();
    }
}

// ===== MOCK LIFF FUNCTIONS =====
async function mockLiffLogin() {
    return true;
}

async function mockGetProfile() {
    return {
        userId: 'Uxxxxxxxxxxxxxxx',
        displayName: 'สมชาย ใจดี',
        pictureUrl: null
    };
}

async function mockCheckVerification(userId) {
    return localStorage.getItem('verified_' + userId) === 'true';
}

async function mockVerifyAgent(agentCode) {
    const validCodes = ['S001', 'S002', 'S003'];
    if (validCodes.includes(agentCode)) {
        return {
            success: true,
            agentName: 'สมชาย ใจดี'
        };
    }
    return {
        success: false,
        message: 'ไม่พบรหัสพนักงานนี้ในระบบ'
    };
}

// ===== LOGIN SCREEN =====
function initializeLoginScreen(profile) {
    showScreen('login-screen');
    document.getElementById('user-name').textContent = profile.displayName;
    
    const verifyBtn = document.getElementById('verify-btn');
    const agentCodeInput = document.getElementById('agent-code');
    
    verifyBtn.addEventListener('click', handleVerification);
    agentCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleVerification();
        }
    });
}

async function handleVerification() {
    const agentCode = document.getElementById('agent-code').value.trim();
    
    if (!agentCode) {
        showError('กรุณากรอกรหัสพนักงานเซลส์');
        return;
    }
    
    showLoading();
    
    try {
        const result = await mockVerifyAgent(agentCode);
        
        if (result.success) {
            localStorage.setItem('verified_Uxxxxxxxxxxxxxxx', 'true');
            
            currentUser = {
                userId: 'Uxxxxxxxxxxxxxxx',
                displayName: 'สมชาย ใจดี',
                agentCode: agentCode,
                agentName: result.agentName
            };
            
            initializeMainScreen();
        } else {
            showError(result.message);
        }
    } catch (error) {
        showError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
        hideLoading();
    }
}

// ===== MAIN SCREEN =====
function initializeMainScreen() {
    showScreen('main-screen');
    
    document.getElementById('agent-name').textContent = currentUser.agentName;
    
    initializeGPS();
    initializePhotoCapture();
    initializeStoreTypeSlider();
    initializeFormSubmission();
    
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

// ===== GPS FUNCTIONALITY =====
function initializeGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                const locationText = formatLocation(currentLocation.lat, currentLocation.lng);
                document.getElementById('location-display').textContent = locationText;
            },
            (error) => {
                console.error('GPS Error:', error);
                currentLocation = {
                    lat: 13.7563,
                    lng: 100.5018
                };
                document.getElementById('location-display').textContent = 
                    formatLocation(currentLocation.lat, currentLocation.lng) + ' (Mock)';
            }
        );
    } else {
        currentLocation = {
            lat: 13.7563,
            lng: 100.5018
        };
        document.getElementById('location-display').textContent = 
            formatLocation(currentLocation.lat, currentLocation.lng) + ' (Mock)';
    }
}

// ===== PHOTO CAPTURE =====
function initializePhotoCapture() {
    const takePhotoBtn = document.getElementById('take-photo-btn');
    const photoInput = document.getElementById('photo-input');
    const retakeBtn = document.getElementById('retake-btn');
    
    takePhotoBtn.addEventListener('click', () => {
        photoInput.click();
    });
    
    photoInput.addEventListener('change', handlePhotoCapture);
    retakeBtn.addEventListener('click', () => {
        photoInput.click();
    });
}

function handlePhotoCapture(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showError('ขนาดไฟล์ต้องไม่เกิน 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        capturedPhoto = e.target.result;
        showPhotoPreview(capturedPhoto);
    };
    reader.readAsDataURL(file);
}

function showPhotoPreview(imageData) {
    const previewImage = document.getElementById('preview-image');
    const photoPreview = document.getElementById('photo-preview');
    const takePhotoBtn = document.getElementById('take-photo-btn');
    
    previewImage.src = imageData;
    photoPreview.classList.remove('hidden');
    takePhotoBtn.classList.add('hidden');
}

// ===== STORE TYPE SLIDER =====
function initializeStoreTypeSlider() {
    const container = document.getElementById('store-type-container');
    
    const storeTypeItems = container.querySelectorAll('.store-type-item');
    storeTypeItems.forEach(item => {
        item.addEventListener('click', () => {
            storeTypeItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            selectedStoreType = item.dataset.type;
        });
    });
}

// ===== FORM SUBMISSION =====
function initializeFormSubmission() {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.addEventListener('click', handleFormSubmission);
}

async function handleFormSubmission() {
    if (!capturedPhoto) {
        showError('กรุณาถ่ายรูปหน้าร้าน');
        return;
    }
    
    if (!currentLocation) {
        showError('ไม่สามารถหาตำแหน่งได้ กรุณาเปิด GPS');
        return;
    }
    
    const formData = {
        line_uid: currentUser.userId,
        agent_code: currentUser.agentCode,
        store_name: document.getElementById('store-name').value.trim(),
        store_type: selectedStoreType,
        store_description: document.getElementById('store-description').value.trim(),
        contact_name: document.getElementById('contact-name').value.trim(),
        contact_phone: document.getElementById('contact-phone').value.trim(),
        location: currentLocation,
        image: capturedPhoto,
        visit_datetime: new Date().toISOString()
    };
    
    showLoading();
    
    try {
        await mockSubmitVisit(formData);
        saveVisitToLocalStorage(formData);
        showSuccessScreen();
    } catch (error) {
        console.error('Submit error:', error);
        showError('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
        hideLoading();
    }
}

async function mockSubmitVisit(data) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Visit submitted:', data);
    return { success: true, id: 'visit-' + Date.now() };
}

function saveVisitToLocalStorage(data) {
    const visits = JSON.parse(localStorage.getItem('crm_visits') || '[]');
    visits.push({
        ...data,
        id: 'visit-' + Date.now(),
        timestamp: Date.now()
    });
    localStorage.setItem('crm_visits', JSON.stringify(visits));
}

// ===== SUCCESS SCREEN =====
function showSuccessScreen() {
    showScreen('success-screen');
    
    const newVisitBtn = document.getElementById('new-visit-btn');
    newVisitBtn.addEventListener('click', () => {
        resetForm();
        initializeMainScreen();
    });
}

function resetForm() {
    capturedPhoto = null;
    document.getElementById('photo-preview').classList.add('hidden');
    document.getElementById('take-photo-btn').classList.remove('hidden');
    document.getElementById('photo-input').value = '';
    
    selectedStoreType = 'food';
    document.querySelectorAll('.store-type-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector('[data-type="food"]').classList.add('active');
    
    document.getElementById('store-name').value = '';
    document.getElementById('contact-name').value = '';
    document.getElementById('contact-phone').value = '';
    document.getElementById('store-description').value = '';
}

// ===== LOGOUT =====
function handleLogout() {
    if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
        localStorage.removeItem('verified_Uxxxxxxxxxxxxxxx');
        
        currentUser = null;
        currentLocation = null;
        capturedPhoto = null;
        selectedStoreType = 'food';
        
        initializeLiff();
    }
}

// ===== ERROR MODAL HANDLERS =====
function initializeErrorModal() {
    const closeErrorBtn = document.getElementById('close-error');
    const errorOkBtn = document.getElementById('error-ok-btn');
    
    closeErrorBtn.addEventListener('click', hideError);
    errorOkBtn.addEventListener('click', hideError);
    
    document.getElementById('error-modal').addEventListener('click', (e) => {
        if (e.target.id === 'error-modal') {
            hideError();
        }
    });
}

// ===== MAIN INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeErrorModal();
    initializeLiff();
});

// ===== DEBUG FUNCTIONS =====
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugCRM = {
        getStoredVisits: () => JSON.parse(localStorage.getItem('crm_visits') || '[]'),
        clearData: () => { localStorage.clear(); location.reload(); },
        mockError: (message) => showError(message || 'Test error message')
    };
    console.log('Debug functions available: window.debugCRM');
} 