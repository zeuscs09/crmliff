// ===== GLOBAL VARIABLES =====
let currentUser = null;
let currentLocation = null;
let selectedStoreType = null;
let capturedPhoto = null;
let mapInstance = null;
let locationMarker = null;
let currentStep = 1;
const totalSteps = 4;
let storeTypes = []; // Store types from API

// Step validation flags
let stepValidation = {
    1: false, // location
    2: false, // photo and store type
    3: true,  // information (optional)
    4: false  // confirm
};

// Store type labels mapping (will be updated from API)
let storeTypeLabels = {};

// No fallback icons - all data must come from API
const storeTypeIcons = {};

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
    
    // Progress bar elements
    progressSteps: document.querySelectorAll('.progress-step'),
    
    // Navigation buttons
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    
    // Step content elements
    stepContents: document.querySelectorAll('.step-content'),
    
    // Step 1 - Location elements
    currentAddress: document.getElementById('current-address'),
    currentCoordinates: document.getElementById('current-coordinates'),
    accuracyDot: document.getElementById('accuracy-dot'),
    accuracyText: document.getElementById('accuracy-text'),
    step1Map: document.getElementById('step1-map'),
    
    // Step 2 - Photo and Store Type elements
    photoInput: document.getElementById('photo-input'),
    takePhotoBtnStep2: document.getElementById('take-photo-btn-step2'),
    photoPreviewStep2: document.getElementById('photo-preview-step2'),
    previewImageStep2: document.getElementById('preview-image-step2'),
    retakeBtnStep2: document.getElementById('retake-btn-step2'),
    photoCaptureContainer: document.getElementById('photo-capture-container'),
    photoCapturePrompt: document.getElementById('photo-capture-prompt'),
    storeTypeGrid: document.getElementById('store-type-grid'),
    
    // Step 3 - Information elements
    storeNameStep3: document.getElementById('store-name-step3'),
    contactNameStep3: document.getElementById('contact-name-step3'),
    contactPhoneStep3: document.getElementById('contact-phone-step3'),
    storeDescriptionStep3: document.getElementById('store-description-step3'),
    
    // Step 4 - Confirm elements
    confirmAddress: document.getElementById('confirm-address'),
    confirmCoordinates: document.getElementById('confirm-coordinates'),
    confirmPhoto: document.getElementById('confirm-photo'),
    confirmStoreType: document.getElementById('confirm-store-type'),
    confirmStoreName: document.getElementById('confirm-store-name'),
    confirmContactName: document.getElementById('confirm-contact-name'),
    confirmContactPhone: document.getElementById('confirm-contact-phone'),
    confirmDescription: document.getElementById('confirm-description'),
    
    // Success screen
    newVisitBtn: document.getElementById('new-visit-btn'),
    closeSuccessBtn: document.getElementById('close-success-btn'),
    
    // Error modal
    errorModal: document.getElementById('error-modal'),
    errorMessage: document.getElementById('error-message'),
    closeErrorBtn: document.getElementById('close-error'),
    errorOkBtn: document.getElementById('error-ok-btn'),
    showDebugBtn: document.getElementById('show-debug-btn'),
    
    // Debug modal
    debugModal: document.getElementById('debug-modal'),
    debugContent: document.getElementById('debug-content'),
    closeDebugBtn: document.getElementById('close-debug-btn'),
    closeDebugX: document.getElementById('close-debug'),
    copyDebugBtn: document.getElementById('copy-debug-btn'),
    sendDebugBtn: document.getElementById('send-debug-btn')
};

// ===== NAVIGATION BUTTONS =====
function updateNavigationButtons() {
    // Update previous button
    elements.prevBtn.disabled = currentStep === 1;
    
    // Check validation based on current step
    let isValidStep = stepValidation[currentStep];
    
    // Special check for step 3 - store name is required
    if (currentStep === 3) {
        const storeName = elements.storeNameStep3.value.trim();
        isValidStep = !!storeName;
        stepValidation[3] = isValidStep;
    }
    
    // Update next button
    if (currentStep === totalSteps) {
        elements.nextBtn.innerHTML = '<i class="fas fa-save"></i> บันทึกข้อมูล';
        elements.nextBtn.disabled = !isValidStep;
        console.log(`🔘 Submit button state: disabled=${elements.nextBtn.disabled}, stepValidation[${currentStep}]=${isValidStep}`);
    } else {
        elements.nextBtn.innerHTML = 'ถัดไป <i class="fas fa-chevron-right"></i>';
        elements.nextBtn.disabled = !isValidStep;
        console.log(`🔘 Next button state: disabled=${elements.nextBtn.disabled}, stepValidation[${currentStep}]=${isValidStep}`);
    }
}

// ===== APP INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LIFF App Starting...');
    initializeLiff();
});

async function initializeLiff() {
    try {
        console.log('📱 Initializing LIFF...');
        
        // Initialize LIFF using common function
        currentUser = await CRMLIFFCommon.initializeLIFF('main');
        
        if (!currentUser) {
            return; // Will redirect to login
        }
        
        console.log('✅ LIFF initialized successfully');
        
        // Load store types from API
        await loadStoreTypes();
        
        // Try auto-login first
        const existingAgent = await CRMLIFFCommon.getAgentByLineUID(currentUser.userId);
        
        if (existingAgent) {
            console.log('✅ Auto-login successful');
            currentUser.agent = {
                code: existingAgent.agent_code,
                name: existingAgent.agent_name,
                agentDoc: existingAgent.name
            };
            
            // Store agent for cross-page use
            CRMLIFFCommon.setCurrentAgent(existingAgent);
            
            showScreen('main');
            currentStep = 1;
            showStep(currentStep);
            updateProgressBar();
            getCurrentLocation();
        } else {
            console.log('🔐 Need manual verification');
            showScreen('login');
            elements.userName.textContent = currentUser.displayName;
        }
        
        initializeEventListeners();
        
    } catch (error) {
        console.error('❌ LIFF initialization failed:', error);
        showError('เกิดข้อผิดพลาดในการเริ่มต้นแอป กรุณาลองใหม่อีกครั้ง');
    }
}

// ===== LOAD STORE TYPES FROM API =====
async function loadStoreTypes() {
    try {
        console.log('📥 Loading store types from API...');
        
        const response = await fetch('/api/method/crmliff.api.liff_api.get_store_types');
        const result = await response.json();
        
        if (result.message && result.message.success && result.message.data) {
            storeTypes = result.message.data;
            console.log('✅ Store types loaded:', storeTypes);
            
            if (storeTypes.length === 0) {
                throw new Error('ไม่พบข้อมูลประเภทร้านในระบบ');
            }
            
            // Update store type labels
            storeTypes.forEach(type => {
                storeTypeLabels[type.store_type_code] = type.store_type_name;
                console.log(`🎨 Store type ${type.store_type_code}: color=${type.color}, icon=${type.icon}`);
            });
            
            // Generate store type grid
            generateStoreTypeGrid();
        } else {
            throw new Error(result.message?.error || 'ไม่สามารถโหลดข้อมูลประเภทร้านได้');
        }
        
    } catch (error) {
        console.error('❌ Error loading store types:', error);
        showStoreTypeError(error.message);
    }
}

// Generate store type grid from API data
function generateStoreTypeGrid() {
    const grid = elements.storeTypeGrid;
    grid.innerHTML = '';
    
    storeTypes.forEach(type => {
        const card = document.createElement('div');
        card.className = 'store-type-card';
        card.dataset.type = type.store_type_code;
        
        // Use icon from API only
        const icon = type.icon || '🏪';
        
        // Apply color from API immediately (no hover needed for mobile)
        if (type.color) {
            console.log(`🎨 Setting color for ${type.store_type_code}: ${type.color}`);
            
            // Set border color and light background immediately
            card.style.borderColor = type.color;
            card.style.backgroundColor = `${type.color}08`; // Very light background
            
        } else {
            console.warn(`⚠️ No color found for ${type.store_type_code}`);
        }
        
        card.innerHTML = `
            <div class="icon">${icon}</div>
            <div class="name">${type.store_type_name}</div>
        `;
        
        // Store color for later use in selection
        card.dataset.color = type.color || '';
        
        grid.appendChild(card);
    });
    
    console.log('✅ Store type grid generated with', storeTypes.length, 'types');
}

// Show error when store types cannot be loaded
function showStoreTypeError(errorMessage) {
    const grid = elements.storeTypeGrid;
    grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff5f5; border-radius: 12px; border: 2px dashed #fed7d7;">
            <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
            <div style="font-size: 16px; margin-bottom: 10px; color: #e53e3e; font-weight: 600;">ไม่สามารถโหลดประเภทร้านได้</div>
            <div style="font-size: 14px; margin-bottom: 20px; color: #666;">${errorMessage}</div>
            <button onclick="retryLoadStoreTypes()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Prompt', sans-serif;">
                <i class="fas fa-redo"></i> ลองใหม่
            </button>
        </div>
    `;
    
    // Disable step 2 navigation
    stepValidation[2] = false;
    updateNavigationButtons();
}

// Retry loading store types
function retryLoadStoreTypes() {
    console.log('🔄 Retrying store types...');
    const grid = elements.storeTypeGrid;
    grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <div style="font-size: 24px; margin-bottom: 10px;"><i class="fas fa-spinner fa-spin"></i></div>
            <div style="font-size: 14px; color: #666;">กำลังโหลดประเภทร้าน...</div>
        </div>
    `;
    loadStoreTypes();
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Login events
    elements.verifyBtn.addEventListener('click', handleVerification);
    elements.agentCode.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleVerification();
    });
    
    // Navigation events
    elements.prevBtn.addEventListener('click', goToPreviousStep);
    elements.nextBtn.addEventListener('click', goToNextStep);
    
    // Step 2 - Photo events
    elements.takePhotoBtnStep2.addEventListener('click', handlePhotoCapture);
    elements.retakeBtnStep2.addEventListener('click', handleRetakePhoto);
    elements.photoInput.addEventListener('change', handlePhotoSelected);
    
    // Step 2 - Store type events
    elements.storeTypeGrid.addEventListener('click', handleStoreTypeSelection);
    
    // Step 3 - Store name validation
    elements.storeNameStep3.addEventListener('input', function() {
        if (currentStep === 3) {
            updateNavigationButtons();
        }
    });
    
    // Success screen events
    elements.newVisitBtn.addEventListener('click', startNewVisit);
    elements.closeSuccessBtn.addEventListener('click', closeApp);
    
    // Error modal events
    elements.closeErrorBtn.addEventListener('click', closeErrorModal);
    elements.errorOkBtn.addEventListener('click', closeErrorModal);
    elements.showDebugBtn.addEventListener('click', showDebugModal);
    
    // Debug modal events
    elements.closeDebugBtn.addEventListener('click', closeDebugModal);
    elements.closeDebugX.addEventListener('click', closeDebugModal);
    elements.copyDebugBtn.addEventListener('click', copyDebugInfo);
    elements.sendDebugBtn.addEventListener('click', sendDebugInfo);
}

// ===== SCREEN MANAGEMENT =====
function showScreen(screenName) {
    console.log(`📺 Showing screen: ${screenName}`);
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    if (screens[screenName]) screens[screenName].classList.remove('hidden');
    
    // Scroll to top when switching screens
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ===== STEP NAVIGATION =====
function updateProgressBar() {
    elements.progressSteps.forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNumber < currentStep) {
            step.classList.add('completed');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
        }
    });
}

function showStep(stepNumber) {
    console.log(`📄 Showing step: ${stepNumber}`);
    
    // Hide all step contents
    elements.stepContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Show current step content
    const stepContent = document.getElementById(`step-${stepNumber}`);
    if (stepContent) {
        stepContent.classList.add('active');
    }
    
    // Initialize step-specific functionality
    if (stepNumber === 1) {
        initializeStep1();
    } else if (stepNumber === 4) {
        initializeStep4();
    }
    
    // Update navigation buttons and progress bar
    updateNavigationButtons();
    updateProgressBar();
    
    // Scroll to top when changing steps
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function goToNextStep() {
    if (!validateCurrentStep()) {
        return;
    }
    
    if (currentStep === totalSteps) {
        handleSubmission();
        return;
    }
    
    currentStep++;
    showStep(currentStep);
}

function goToPreviousStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function validateCurrentStep() {
    switch (currentStep) {
        case 1: // Location
            if (!currentLocation) {
                showError('กรุณารอให้ระบบหาตำแหน่งให้เสร็จสิ้นก่อน หรือคลิกปุ่ม "ลองใหม่" หากไม่สามารถระบุตำแหน่งได้');
                return false;
            }
            if (!stepValidation[1]) {
                showError('ไม่สามารถระบุตำแหน่งได้ กรุณาเปิดการใช้งาน GPS และลองใหม่');
                return false;
            }
            return true;
            
        case 2: // Photo and Store Type
            if (!capturedPhoto) {
                showError('กรุณาถ่ายรูปหน้าร้านก่อน');
                return false;
            }
            if (!selectedStoreType) {
                showError('กรุณาเลือกประเภทร้าน');
                return false;
            }
            stepValidation[2] = true;
            return true;
            
        case 3: // Information (required store name)
            const storeName = elements.storeNameStep3.value.trim();
            if (!storeName) {
                showError('กรุณากรอกชื่อร้าน');
                return false;
            }
            stepValidation[3] = true;
            return true;
            
        case 4: // Confirm
            console.log('🔍 Step 4 validation check:', {
                currentLocation: !!currentLocation,
                capturedPhoto: !!capturedPhoto,
                selectedStoreType: selectedStoreType,
                stepValidation: stepValidation,
                currentUser: !!currentUser,
                hasAgentCode: !!(currentUser && currentUser.agent && currentUser.agent.code)
            });
            
            // Check essential data
            if (!currentUser || !currentUser.agent || !currentUser.agent.code) {
                showError('ข้อมูลผู้ใช้ไม่ครบถ้วน กรุณาล็อกอินใหม่');
                return false;
            }
            
            if (!currentLocation) {
                showError('ไม่พบข้อมูลตำแหน่ง กรุณากลับไปขั้นตอนที่ 1');
                return false;
            }
            
            if (!capturedPhoto) {
                showError('ไม่พบรูปภาพ กรุณากลับไปขั้นตอนที่ 2');
                return false;
            }
            
            if (!selectedStoreType) {
                showError('ไม่พบประเภทร้าน กรุณากลับไปขั้นตอนที่ 2');
                return false;
            }
            
            const storeNameStep4 = elements.storeNameStep3.value.trim();
            if (!storeNameStep4) {
                showError('ไม่พบชื่อร้าน กรุณากลับไปขั้นตอนที่ 3');
                return false;
            }
            
            return stepValidation[1] && stepValidation[2] && stepValidation[3];
            
        default:
            return true;
    }
}

// ===== STEP 1: LOCATION =====
function initializeStep1() {
    console.log('🗺️ Initializing Step 1...');
    
    // Always try to initialize map when step 1 is shown
    setTimeout(() => {
        initializeStepMap();
    }, 200);
    
    // Update button state based on location availability
    updateLocationButtonState();
}

function initializeStepMap() {
    const mapElement = document.getElementById('step1-map');
    if (!mapElement) {
        console.error('❌ Map element not found');
        return;
    }
    
    if (!currentLocation) {
        console.log('⏳ Waiting for location...');
        showLocationPending();
        return;
    }
    
    console.log('🗺️ Initializing step 1 map with location:', currentLocation);
    
    try {
        // Remove existing map instance
        if (mapInstance) {
            mapInstance.remove();
            mapInstance = null;
            locationMarker = null;
        }
        
        // Clear map container
        mapElement.innerHTML = '';
        
        // Initialize new map
        mapInstance = L.map('step1-map').setView([currentLocation.latitude, currentLocation.longitude], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(mapInstance);
        
        // Add location marker
        locationMarker = L.marker([currentLocation.latitude, currentLocation.longitude])
            .addTo(mapInstance)
            .bindPopup(`
                <div style="text-align: center; font-family: 'Prompt', sans-serif;">
                    <strong>📍 ตำแหน่งปัจจุบัน</strong><br>
                    <small>Lat: ${currentLocation.latitude.toFixed(6)}<br>
                    Lng: ${currentLocation.longitude.toFixed(6)}</small>
                </div>
            `)
            .openPopup();
        
        // Add accuracy circle
        if (currentLocation.accuracy) {
            L.circle([currentLocation.latitude, currentLocation.longitude], {
                radius: currentLocation.accuracy,
                color: '#667eea',
                fillColor: '#667eea',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(mapInstance);
        }
        
        console.log('✅ Step 1 Map initialized successfully');
        hideLocationPending();
        updateLocationButtonState();
        
    } catch (error) {
        console.error('❌ Step 1 Map initialization failed:', error);
        showLocationError();
    }
}

function showLocationPending() {
    const mapElement = document.getElementById('step1-map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div style="height: 100%; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 12px;">
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📍</div>
                    <div style="font-size: 16px; margin-bottom: 10px;">กำลังหาตำแหน่ง...</div>
                    <div style="font-size: 14px; color: #999;">กรุณารอสักครู่</div>
                </div>
            </div>
        `;
    }
}

function hideLocationPending() {
    // Location is ready, map will be shown
}

function showLocationError() {
    const mapElement = document.getElementById('step1-map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div style="height: 100%; display: flex; align-items: center; justify-content: center; background: #fff5f5; border-radius: 12px; border: 2px dashed #fed7d7;">
                <div style="text-align: center; padding: 40px; color: #e53e3e;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📍</div>
                    <div style="font-size: 16px; margin-bottom: 10px;">ไม่สามารถระบุตำแหน่งได้</div>
                    <div style="font-size: 14px; margin-bottom: 20px; color: #666;">กรุณาเปิดการใช้งาน GPS และอนุญาตเข้าถึงตำแหน่ง</div>
                    <button onclick="retryLocation()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Prompt', sans-serif;">
                        <i class="fas fa-redo"></i> ลองใหม่
                    </button>
                </div>
            </div>
        `;
    }
}

function retryLocation() {
    console.log('🔄 Retrying location...');
    showLocationPending();
    getCurrentLocation();
}

function updateLocationButtonState() {
    stepValidation[1] = !!currentLocation;
    
    if (currentStep === 1) {
        updateNavigationButtons();
        if (!currentLocation) {
            elements.nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> รอตำแหน่ง...';
        } else {
            // Location is ready, update button text
            elements.nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i> ถัดไป';
        }
    }
}

// ===== STEP 4: CONFIRM =====
function initializeStep4() {
    console.log('📋 Initializing step 4 - confirm data');
    
    // Location data
    if (currentLocation) {
        elements.confirmAddress.textContent = currentLocation.address || 'ไม่สามารถระบุที่อยู่ได้';
        elements.confirmCoordinates.textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
    }
    
    // Photo data
    if (capturedPhoto) {
        elements.confirmPhoto.src = capturedPhoto.dataUrl;
        elements.confirmPhoto.alt = 'รูปหน้าร้าน';
    } else {
        elements.confirmPhoto.src = '';
        elements.confirmPhoto.alt = 'ไม่มีรูปภาพ';
    }
    
    // Store type data
    elements.confirmStoreType.textContent = storeTypeLabels[selectedStoreType] || selectedStoreType || '-';
    
    // Information data  
    elements.confirmStoreName.textContent = elements.storeNameStep3.value.trim() || '-';
    elements.confirmContactName.textContent = elements.contactNameStep3.value.trim() || '-';
    elements.confirmContactPhone.textContent = elements.contactPhoneStep3.value.trim() || '-';
    elements.confirmDescription.textContent = elements.storeDescriptionStep3.value.trim() || '-';
    
    // Update step validation and button state
    stepValidation[4] = stepValidation[1] && stepValidation[2] && stepValidation[3];
    updateNavigationButtons();
    
    console.log('📋 Step 4 initialized with validation:', stepValidation);
}

// ===== LOCATION SERVICES =====
async function getCurrentLocation() {
    console.log('📍 Getting current location...');
    console.log('🔧 Checking mock location:', window.mockLocation);
    
    // Show loading state in step 1 if we're currently on it
    if (currentStep === 1) {
        showLocationPending();
        updateLocationButtonState();
    }
    
    try {
        // Check for mock location first (development mode)
        if (window.mockLocation) {
            console.log('🔧 Using mock location:', window.mockLocation);
            currentLocation = {...window.mockLocation}; // Clone the object
            stepValidation[1] = true;
            console.log('✅ Mock location set:', currentLocation);
            
            // Skip real geolocation entirely when using mock
            await updateLocationDisplay();
            updateLocationButtonState();
            
            // If we're on step 1, re-initialize map with new location
            if (currentStep === 1) {
                setTimeout(() => {
                    initializeStepMap();
                }, 500);
            }
            return; // Exit early when using mock location
            
        } else if ('geolocation' in navigator) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 60000
                });
            });
            
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            console.log('✅ Location obtained:', currentLocation);
            stepValidation[1] = true;
            
        } else {
            throw new Error('Geolocation not supported');
        }
    } catch (error) {
        console.warn('⚠️ Location error:', error.message);
        
        // Check for mock location as fallback
        if (window.mockLocation) {
            console.log('🔧 Using mock location as fallback:', window.mockLocation);
            currentLocation = window.mockLocation;
            stepValidation[1] = true;
        } else {
            stepValidation[1] = false;
            
            // Show error message
            if (currentStep === 1) {
                showLocationError();
                showError('ไม่สามารถระบุตำแหน่งได้ กรุณาเปิดการใช้งาน GPS หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือใช้ DEV_TOOLS.setMockLocation()');
            }
            return;
        }
    }
    
    await updateLocationDisplay();
    updateLocationButtonState();
    
    // If we're on step 1, re-initialize map with new location
    if (currentStep === 1) {
        setTimeout(() => {
            initializeStepMap();
        }, 500);
    }
}

async function updateLocationDisplay() {
    if (currentLocation) {
        const { latitude, longitude, accuracy } = currentLocation;
        
        // Update step 1 display
        if (elements.currentCoordinates) {
            elements.currentCoordinates.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }
        
        if (elements.currentAddress) {
            // Show loading state
            elements.currentAddress.textContent = 'กำลังหาที่อยู่...';
            
            try {
                let address = await getAddressFromCoordinates(latitude, longitude);
                
                // Fallback for mock locations if API doesn't return good results
                if (window.mockLocation && (!address || address.includes('ไม่พบ'))) {
                    const mockAddresses = {
                        '13.7365,100.5618': 'ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพมหานคร (BTS อโศก)',
                        '13.7469,100.5389': 'ถนนราชดำริ แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร (Central World)',
                        '13.7992,100.5495': 'ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพมหานคร (จตุจักร)',
                        '13.7456,100.5342': 'ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร (สยาม)'
                    };
                    
                    const locationKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
                    address = mockAddresses[locationKey] || address || 'ที่อยู่จำลอง (Mock Location)';
                }
                
                elements.currentAddress.textContent = address;
                currentLocation.address = address; // Store address in currentLocation for step 4
                
            } catch (error) {
                console.warn('⚠️ Failed to get address:', error);
                elements.currentAddress.textContent = 'ไม่สามารถระบุที่อยู่ได้';
                currentLocation.address = 'ไม่สามารถระบุที่อยู่ได้';
            }
        }
        
        // Update accuracy indicator
        if (elements.accuracyDot && elements.accuracyText) {
            let accuracyClass = 'accuracy-medium';
            let accuracyLabel = 'ปานกลาง';
            
            if (accuracy < 50) {
                accuracyClass = 'accuracy-high';
                accuracyLabel = 'สูง';
            } else if (accuracy > 200) {
                accuracyClass = 'accuracy-low';
                accuracyLabel = 'ต่ำ';
            }
            
            elements.accuracyDot.className = `accuracy-dot ${accuracyClass}`;
            elements.accuracyText.textContent = `ความแม่นยำ: ${accuracyLabel} (±${accuracy.toFixed(0)}m)`;
        }
    }
}

// ===== REVERSE GEOCODING =====
async function getAddressFromCoordinates(lat, lng) {
    try {
        console.log(`🗺️ Getting address for coordinates: ${lat}, ${lng}`);
        
        const url = `https://nominatim.openstreetmap.org/reverse?` + 
                   `format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=th,en`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'CRM-LIFF-App/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🏠 Nominatim response:', data);
        
        if (data && data.address) {
            const addr = data.address;
            let addressParts = [];
            
            // Build Thai-style address
            if (addr.house_number && addr.road) {
                addressParts.push(`${addr.house_number} ${addr.road}`);
            } else if (addr.road) {
                addressParts.push(`ถนน${addr.road}`);
            }
            
            if (addr.suburb || addr.neighbourhood) {
                addressParts.push(`แขวง${addr.suburb || addr.neighbourhood}`);
            }
            
            if (addr.city_district || addr.district) {
                addressParts.push(`เขต${addr.city_district || addr.district}`);
            }
            
            if (addr.city || addr.state) {
                addressParts.push(addr.city || addr.state);
            }
            
            if (addr.country && addr.country === 'ประเทศไทย') {
                addressParts.push('ประเทศไทย');
            }
            
            let fullAddress = addressParts.join(' ');
            
            // If we don't have enough detail, use display_name
            if (addressParts.length < 2 && data.display_name) {
                fullAddress = data.display_name;
            }
            
            console.log('✅ Address found:', fullAddress);
            return fullAddress || 'ไม่พบข้อมูลที่อยู่';
            
        } else {
            console.warn('⚠️ No address data returned');
            return 'ไม่พบข้อมูลที่อยู่';
        }
        
    } catch (error) {
        console.error('❌ Geocoding error:', error);
        return 'ไม่สามารถระบุที่อยู่ได้';
    }
}

// ===== AUTHENTICATION =====
async function handleVerification() {
    const agentCode = elements.agentCode.value.trim().toUpperCase();
    console.log(`🔐 Verifying agent code: ${agentCode}`);
    
    if (!agentCode) {
        showError('กรุณากรอกรหัสพนักงานเซลส์');
        return;
    }

    try {
        elements.verifyBtn.disabled = true;
        elements.verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังตรวจสอบ...';

        // Verify agent code and link with LINE UID
        const agent = await CRMLIFFCommon.verifyAndLinkAgent(agentCode, currentUser.userId);
        console.log('✅ Verification successful:', agent);
        
        currentUser.agent = {
            code: agent.agent_code,
            name: agent.agent_name,
            agentDoc: agent.name
        };
        
        showScreen('main');
        currentStep = 1;
        showStep(currentStep);
        updateProgressBar();
        
        // Store agent for cross-page use
        CRMLIFFCommon.setCurrentAgent(agent);
        
        // Start getting location after login
        getCurrentLocation();

    } catch (error) {
        console.error('Verification error:', error);
        showError(error.message || 'เกิดข้อผิดพลาดในการยืนยันตัวตน');
    } finally {
        elements.verifyBtn.disabled = false;
        elements.verifyBtn.innerHTML = '<i class="fas fa-check"></i> ยืนยันตัวตน';
    }
}

// ===== PHOTO HANDLING =====
function handlePhotoCapture() {
    console.log('📸 Starting photo capture...');
    elements.photoInput.click();
}

// ===== IMAGE COMPRESSION =====
function compressImage(file, quality = 0.7, maxWidth = 1920, maxHeight = 1080) {
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

async function handlePhotoSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📷 Photo selected:', file.name, file.size, 'bytes');
    
    if (!file.type.startsWith('image/')) {
        showError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
    }
    
    try {
        // Compress image if it's too large
        let processedFile = file;
        if (file.size > 2 * 1024 * 1024) { // 2MB threshold
            console.log('🗜️ Compressing large image...');
            processedFile = await compressImage(file, 0.7, 1920); // 70% quality, max 1920px width
            console.log('✅ Image compressed:', processedFile.size, 'bytes');
        }
        
        if (processedFile.size > 5 * 1024 * 1024) {
            showError('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            elements.previewImageStep2.src = e.target.result;
            elements.photoPreviewStep2.classList.remove('hidden');
            elements.photoCapturePrompt.classList.add('hidden');
            elements.photoCaptureContainer.classList.add('has-photo');
            
            capturedPhoto = {
                file: processedFile,
                originalFile: file,
                dataUrl: e.target.result,
                timestamp: new Date().toISOString()
            };
            
            console.log('✅ Photo preview loaded');
        };
        
        reader.readAsDataURL(processedFile);
        
    } catch (error) {
        console.error('❌ Photo processing error:', error);
        showError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
    }
}

function handleRetakePhoto() {
    console.log('🔄 Retaking photo...');
    elements.photoPreviewStep2.classList.add('hidden');
    elements.photoCapturePrompt.classList.remove('hidden');
    elements.photoCaptureContainer.classList.remove('has-photo');
    elements.photoInput.value = '';
    capturedPhoto = null;
}

// ===== STORE TYPE SELECTION =====
function handleStoreTypeSelection(event) {
    const card = event.target.closest('.store-type-card');
    if (!card) return;
    
    // Remove previous selection and reset to default appearance
    document.querySelectorAll('.store-type-card').forEach(el => {
        el.classList.remove('selected');
        const originalColor = el.dataset.color;
        if (originalColor) {
            el.style.borderColor = originalColor;
            el.style.backgroundColor = `${originalColor}08`; // Light background
        } else {
            el.style.borderColor = '#e0e0e0';
            el.style.backgroundColor = 'white';
        }
        el.style.boxShadow = 'none';
    });
    
    // Add selection to clicked card
    card.classList.add('selected');
    selectedStoreType = card.dataset.type;
    
    // Apply selected styling
    const cardColor = card.dataset.color;
    if (cardColor) {
        card.style.borderColor = cardColor;
        card.style.backgroundColor = `${cardColor}20`; // Stronger background for selection
        card.style.boxShadow = `0 0 0 3px ${cardColor}30`; // Glow effect
    }
    
    console.log('🏪 Store type selected:', selectedStoreType);
    
    // Update step validation
    stepValidation[2] = !!(capturedPhoto && selectedStoreType);
    updateNavigationButtons();
}

// ===== FORM SUBMISSION =====
async function handleSubmission() {
    console.log('💾 Submitting form...');
    console.log('🔍 Current state:', {
        currentStep,
        stepValidation,
        currentLocation: !!currentLocation,
        capturedPhoto: !!capturedPhoto,
        selectedStoreType,
        currentUser: !!currentUser
    });
    
    if (!validateCurrentStep()) {
        console.error('❌ Step validation failed');
        return;
    }

    // Get visit type from URL parameters (for checkin) or default to New Store
    const urlParams = new URLSearchParams(window.location.search);
    const visitType = urlParams.get('visit_type') || 'New Store';
    const storeId = urlParams.get('store_id');
    
    // Upload photo first if exists
    let photoUrl = null;
    if (capturedPhoto) {
        try {
            console.log('📸 Starting photo upload...');
            photoUrl = await uploadPhoto(capturedPhoto.file);
            console.log('✅ Photo upload completed:', photoUrl);
        } catch (photoError) {
            console.error('❌ Photo upload failed:', photoError);
            showError(`ไม่สามารถอัปโหลดรูปภาพได้: ${photoError.message}`);
            return; // Stop submission if photo upload fails
        }
    }
    
    // Prepare phone number with country code if provided
    let contactPhone = elements.contactPhoneStep3.value.trim();
    if (contactPhone && !contactPhone.startsWith('+')) {
        // Add Thailand country code if not present
        if (contactPhone.startsWith('0')) {
            contactPhone = '+66' + contactPhone.substring(1);
        } else {
            contactPhone = '+66' + contactPhone;
        }
    }
    
    const visitData = {
        agent_code: currentUser.agent.code,
        visit_type: visitType,
        store_id: storeId, // Only for check-in
        location_lat: currentLocation.latitude,
        location_lng: currentLocation.longitude,
        address: currentLocation.address,
        store_type: selectedStoreType, // Use the exact store type code from API
        store_name: elements.storeNameStep3.value.trim(),
        store_description: elements.storeDescriptionStep3.value.trim(),
        contact_name: elements.contactNameStep3.value.trim(),
        contact_phone: contactPhone,
        cover_image: photoUrl,
        photos: photoUrl ? [{
            image: photoUrl,
            caption: 'รูปหน้าร้าน'
        }] : []
    };
    
    console.log('📊 Visit data prepared:', visitData);
    console.log('📊 JSON size:', JSON.stringify(visitData).length, 'characters');
    
    elements.nextBtn.disabled = true;
    elements.nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...';
    
    // Store submission data for debugging
    window.lastSubmissionData = visitData;
    
    try {
        console.log('🚀 Sending submission request...');
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch('/api/method/crmliff.api.liff_api.create_store', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(visitData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('📡 Response received:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error:', response.status, errorText);
            throw new Error(`เซิร์ฟเวอร์ตอบกลับด้วยข้อผิดพลาด: ${response.status}`);
        }

        const result = await response.json();
        console.log('📋 Response data:', result);

        if (result.message && result.message.success) {
            console.log('✅ Visit data saved successfully:', result.message.data);
            showScreen('success');
            resetForm();
        } else {
            const errorMessage = result.message?.error || result.exc || result.message || 'เกิดข้อผิดพลาดในการบันทึก';
            console.error('❌ API Error:', errorMessage);
            throw new Error(errorMessage);
        }
        
    } catch (error) {
        console.error('❌ Submission failed:', error);
        
        // Store error for debugging
        const errorData = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            visitData: visitData,
            currentStep: currentStep,
            stepValidation: stepValidation
        };
        localStorage.setItem('crmliff_last_error', JSON.stringify(errorData));
        
        let errorMessage = 'เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง';
        
        if (error.name === 'AbortError') {
            errorMessage = 'การบันทึกใช้เวลานานเกินไป กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(errorMessage);
        
    } finally {
        elements.nextBtn.disabled = false;
        elements.nextBtn.innerHTML = '<i class="fas fa-save"></i> บันทึกข้อมูล';
    }
}

// ===== PHOTO UPLOAD =====
async function uploadPhoto(file) {
    console.log('📤 Uploading photo...', file.size, 'bytes');
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('doctype', 'CLIFF Store');
        formData.append('docname', 'temp');

        const csrfToken = await CRMLIFFCommon.getCSRFToken();
        
        // Add timeout for photo upload
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for upload
        
        const response = await fetch('/api/method/upload_file', {
            method: 'POST',
            headers: {
                'X-Frappe-CSRF-Token': csrfToken,
            },
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

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
        if (error.name === 'AbortError') {
            throw new Error('การอัปโหลดรูปภาพใช้เวลานานเกินไป กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่');
        } else if (error.message.includes('413') || error.message.includes('Request Entity Too Large')) {
            throw new Error('ไฟล์รูปภาพมีขนาดใหญ่เกินไป กรุณาลองถ่ายรูปใหม่');
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
        } else {
            throw error;
        }
    }
}

// ===== FORM RESET =====
function resetForm() {
    console.log('🧹 Resetting form...');
    
    // Reset photo
    handleRetakePhoto();
    
    // Reset store type
    document.querySelectorAll('.store-type-card').forEach(el => {
        el.classList.remove('selected');
    });
    selectedStoreType = null;
    
    // Reset form fields
    elements.storeNameStep3.value = '';
    elements.contactNameStep3.value = '';
    elements.contactPhoneStep3.value = '';
    elements.storeDescriptionStep3.value = '';
    
    // Reset step validation
    stepValidation = {
        1: !!currentLocation,
        2: false,
        3: true,
        4: false
    };
    
    // Reset to step 1
    currentStep = 1;
}

// ===== SUCCESS SCREEN =====
function startNewVisit() {
    console.log('🆕 Starting new visit...');
    resetForm();
    showScreen('main');
    showStep(currentStep);
}

// ===== UTILITY FUNCTIONS =====
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle 3-digit hex codes
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    // Parse hex to RGB
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// ===== ERROR HANDLING =====
function showError(message) {
    console.error('⚠️ Error:', message);
    CRMLIFFCommon.showError(message);
}

function closeErrorModal() {
    CRMLIFFCommon.closeError();
}

function closeApp() {
    console.log('🚪 Closing app...');
    
    if (window.liff && window.liff.closeWindow) {
        // Close LINE LIFF window if available
        window.liff.closeWindow();
    } else if (window.close) {
        // Fallback to standard window close
        window.close();
    } else {
        // If can't close, navigate to list-store as fallback
        window.location.href = '/list-store';
    }
}

function showDebugModal() {
    console.log('🐛 Showing debug modal...');
    
    // Collect debug information
    const debugInfo = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        
        // App state
        currentStep: currentStep,
        stepValidation: stepValidation,
        
        // User info
        currentUser: currentUser ? {
            userId: currentUser.userId,
            displayName: currentUser.displayName,
            agent: currentUser.agent
        } : null,
        
        // Location
        currentLocation: currentLocation,
        
        // Form data
        formData: {
            hasPhoto: !!capturedPhoto,
            photoSize: capturedPhoto ? capturedPhoto.file.size : null,
            selectedStoreType: selectedStoreType,
            storeName: elements.storeNameStep3.value.trim(),
            contactName: elements.contactNameStep3.value.trim(),
            contactPhone: elements.contactPhoneStep3.value.trim(),
            description: elements.storeDescriptionStep3.value.trim()
        },
        
        // Recent errors
        lastError: localStorage.getItem('crmliff_last_error') ? 
            JSON.parse(localStorage.getItem('crmliff_last_error')) : null,
        
        // Last submission
        lastSubmission: window.lastSubmissionData || null,
        
        // Browser info
        browserInfo: {
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            platform: navigator.platform
        }
    };
    
    // Display in modal
    elements.debugContent.textContent = JSON.stringify(debugInfo, null, 2);
    elements.debugModal.classList.remove('hidden');
    
    // Store for copying/sending
    window.currentDebugInfo = debugInfo;
}

function closeDebugModal() {
    elements.debugModal.classList.add('hidden');
}

async function copyDebugInfo() {
    try {
        if (window.currentDebugInfo) {
            const text = JSON.stringify(window.currentDebugInfo, null, 2);
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                alert('ข้อมูล Debug ถูกคัดลอกแล้ว');
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('ข้อมูล Debug ถูกคัดลอกแล้ว');
            }
        }
    } catch (error) {
        console.error('Failed to copy debug info:', error);
        alert('ไม่สามารถคัดลอกข้อมูลได้');
    }
}

async function sendDebugInfo() {
    try {
        if (!window.currentDebugInfo) {
            alert('ไม่พบข้อมูล Debug');
            return;
        }
        
        // Send debug info to server
        const response = await fetch('/api/method/crmliff.api.liff_api.log_debug', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                debug_info: window.currentDebugInfo,
                user_id: currentUser ? currentUser.userId : null
            })
        });
        
        if (response.ok) {
            alert('ข้อมูล Debug ถูกส่งไปยังเซิร์ฟเวอร์แล้ว');
            closeDebugModal();
        } else {
            throw new Error('ไม่สามารถส่งข้อมูลได้');
        }
        
    } catch (error) {
        console.error('Failed to send debug info:', error);
        alert('ไม่สามารถส่งข้อมูล Debug ได้ กรุณาใช้ฟังก์ชันคัดลอกแทน');
    }
}

// ===== DEBUG FUNCTIONS =====
window.CRMLIFF_DEBUG = {
    getCurrentData: () => ({
        user: currentUser,
        location: currentLocation,
        storeType: selectedStoreType,
        hasPhoto: !!capturedPhoto,
        currentStep: currentStep,
        stepValidation: stepValidation,
        savedVisits: JSON.parse(localStorage.getItem('crmliff_visits') || '[]')
    }),
    
    getLastSubmission: () => window.lastSubmissionData,
    
    checkSubmission: () => {
        const data = {
            hasUser: !!currentUser,
            hasAgent: !!(currentUser && currentUser.agent),
            hasAgentCode: !!(currentUser && currentUser.agent && currentUser.agent.code),
            hasLocation: !!currentLocation,
            hasPhoto: !!capturedPhoto,
            hasStoreType: !!selectedStoreType,
            storeName: elements.storeNameStep3.value.trim(),
            currentStep: currentStep,
            stepValidation: stepValidation
        };
        console.log('🔍 Submission readiness check:', data);
        return data;
    },
    
    clearStorage: () => {
        localStorage.removeItem('crmliff_current_agent');
        localStorage.removeItem('crmliff_visits');
        localStorage.removeItem('crmliff_last_visit');
        console.log('🧹 Storage cleared');
    },
    
    setMockLocation: (lat, lng) => {
        currentLocation = { latitude: lat, longitude: lng, accuracy: 50 };
        updateLocationDisplay();
        stepValidation[1] = true;
        console.log('📍 Mock location set:', currentLocation);
    },
    
    goToStep: (step) => {
        if (step >= 1 && step <= totalSteps) {
            currentStep = step;
            showStep(currentStep);
        }
    },
    
    forceSubmit: async () => {
        console.log('🚨 Force submitting...');
        await handleSubmission();
    },
    
    getLastError: () => {
        const error = localStorage.getItem('crmliff_last_error');
        if (error) {
            console.log('🔥 Last error:', JSON.parse(error));
            return JSON.parse(error);
        } else {
            console.log('✅ No recent errors found');
            return null;
        }
    },
    
    showDebugScreen: () => {
        showDebugModal();
    },
    
    exportDebugData: () => {
        const debugInfo = {
            lastError: localStorage.getItem('crmliff_last_error'),
            currentAgent: localStorage.getItem('crmliff_current_agent'),
            visits: localStorage.getItem('crmliff_visits'),
            lastVisit: localStorage.getItem('crmliff_last_visit'),
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        const dataStr = JSON.stringify(debugInfo, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `crm-debug-${Date.now()}.json`;
        link.click();
        
        console.log('📦 Debug data exported:', debugInfo);
        return debugInfo;
    }
};

console.log('🔧 Debug functions available: CRMLIFF_DEBUG');

// Make retry functions available globally for onclick
window.retryLocation = retryLocation;
window.retryLoadStoreTypes = retryLoadStoreTypes;

// Triple-tap debug activation
let debugTapCount = 0;
let debugTapTimeout = null;

document.addEventListener('click', function(event) {
    // Only trigger on loading text or app title
    const target = event.target;
    if (target.id === 'loading-text' || 
        (target.tagName === 'H1' && target.textContent.includes('Sales Kit')) ||
        (target.tagName === 'P' && target.textContent.includes('เก็บข้อมูลร้านค้า'))) {
        
        debugTapCount++;
        
        if (debugTapTimeout) {
            clearTimeout(debugTapTimeout);
        }
        
        if (debugTapCount >= 3) {
            // Show debug info directly without error modal
            showDebugModal();
            debugTapCount = 0;
        } else {
            debugTapTimeout = setTimeout(() => {
                debugTapCount = 0;
            }, 1000); // Reset after 1 second
        }
    }
});
