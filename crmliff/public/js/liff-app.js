// ===== GLOBAL VARIABLES =====
let currentUser = null;
let currentLocation = null;
let selectedStoreType = null;
let capturedPhoto = null;
let mapInstance = null;
let locationMarker = null;
let currentStep = 1;
const totalSteps = 4;

// Step validation flags
let stepValidation = {
    1: false, // location
    2: false, // photo and store type
    3: true,  // information (optional)
    4: false  // confirm
};

// Store type labels mapping
const storeTypeLabels = {
    'food': 'ร้านอาหาร',
    'retail': 'ร้านค้าปลีก',
    'grocery': 'ร้านโชห่วย',
    'drink': 'ร้านเครื่องดื่ม',
    'convenience': 'ร้านสะดวกซื้อ',
    'pharmacy': 'ร้านยา'
};

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
    
    // Error modal
    errorModal: document.getElementById('error-modal'),
    errorMessage: document.getElementById('error-message'),
    closeErrorBtn: document.getElementById('close-error'),
    errorOkBtn: document.getElementById('error-ok-btn')
};

// ===== STORE TYPE DATA =====
const storeTypeMapping = {
    'food': 'FOOD001', // Map to actual store type codes in system
    'retail': 'RETAIL001',
    'grocery': 'GROCERY001',
    'drink': 'DRINK001',
    'convenience': 'CONV001',
    'pharmacy': 'PHARM001'
};

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
    
    // Success screen events
    elements.newVisitBtn.addEventListener('click', startNewVisit);
    
    // Error modal events
    elements.closeErrorBtn.addEventListener('click', closeErrorModal);
    elements.errorOkBtn.addEventListener('click', closeErrorModal);
}

// ===== SCREEN MANAGEMENT =====
function showScreen(screenName) {
    console.log(`📺 Showing screen: ${screenName}`);
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    if (screens[screenName]) screens[screenName].classList.remove('hidden');
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
    
    // Update navigation buttons
    elements.prevBtn.disabled = stepNumber === 1;
    elements.nextBtn.textContent = stepNumber === totalSteps ? 'บันทึกข้อมูล' : 'ถัดไป';
    elements.nextBtn.innerHTML = stepNumber === totalSteps ? 
        '<i class="fas fa-save"></i> บันทึกข้อมูล' : 
        'ถัดไป <i class="fas fa-chevron-right"></i>';
    
    // Initialize step-specific functionality
    if (stepNumber === 1) {
        initializeStep1();
    } else if (stepNumber === 4) {
        initializeStep4();
    }
    
    updateProgressBar();
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
            
        case 3: // Information (optional)
            stepValidation[3] = true;
            return true;
            
        case 4: // Confirm
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
    updateStep1ButtonState();
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
        updateStep1ButtonState();
        
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

function updateStep1ButtonState() {
    if (elements.nextBtn) {
        if (currentLocation) {
            elements.nextBtn.disabled = false;
            elements.nextBtn.innerHTML = 'ถัดไป <i class="fas fa-chevron-right"></i>';
        } else {
            elements.nextBtn.disabled = true;
            elements.nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> รอตำแหน่ง...';
        }
    }
}

// ===== STEP 4: CONFIRM =====
function initializeStep4() {
    console.log('📋 Initializing step 4 - confirm data');
    
    // Update location info
    if (currentLocation) {
        elements.confirmCoordinates.textContent = `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
        // Mock address for demo
        elements.confirmAddress.textContent = 'ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพมหานคร';
    }
    
    // Update photo
    if (capturedPhoto) {
        elements.confirmPhoto.src = capturedPhoto.dataUrl;
        elements.confirmPhoto.style.display = 'block';
    } else {
        elements.confirmPhoto.style.display = 'none';
    }
    
    // Update store type
    elements.confirmStoreType.textContent = selectedStoreType ? storeTypeLabels[selectedStoreType] || selectedStoreType : '-';
    
    // Update store information
    elements.confirmStoreName.textContent = elements.storeNameStep3.value.trim() || '-';
    elements.confirmContactName.textContent = elements.contactNameStep3.value.trim() || '-';
    elements.confirmContactPhone.textContent = elements.contactPhoneStep3.value.trim() || '-';
    elements.confirmDescription.textContent = elements.storeDescriptionStep3.value.trim() || '-';
}

// ===== LOCATION SERVICES =====
async function getCurrentLocation() {
    console.log('📍 Getting current location...');
    
    // Show loading state in step 1 if we're currently on it
    if (currentStep === 1) {
        updateStep1ButtonState();
    }
    
    try {
        if ('geolocation' in navigator) {
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
        
        // Don't auto-set mock location - let user handle it
        stepValidation[1] = false;
        
        // Show error message
        if (currentStep === 1) {
            showLocationError();
            showError('ไม่สามารถระบุตำแหน่งได้ กรุณาเปิดการใช้งาน GPS หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
        }
        return;
    }
    
    updateLocationDisplay();
    
    // If we're on step 1, re-initialize map with new location
    if (currentStep === 1) {
        setTimeout(() => {
            initializeStepMap();
        }, 500);
    }
}

function updateLocationDisplay() {
    if (currentLocation) {
        const { latitude, longitude, accuracy } = currentLocation;
        
        // Update step 1 display
        if (elements.currentCoordinates) {
            elements.currentCoordinates.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        }
        
        if (elements.currentAddress) {
            elements.currentAddress.textContent = 'ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพมหานคร';
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

function handlePhotoSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📷 Photo selected:', file.name, file.size, 'bytes');
    
    if (!file.type.startsWith('image/')) {
        showError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
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
            file: file,
            dataUrl: e.target.result,
            timestamp: new Date().toISOString()
        };
        
        console.log('✅ Photo preview loaded');
    };
    
    reader.readAsDataURL(file);
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
    
    const storeType = card.dataset.type;
    console.log(`🏪 Store type selected: ${storeType}`);
    
    // Remove selection from all cards
    document.querySelectorAll('.store-type-card').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked card
    card.classList.add('selected');
    selectedStoreType = storeType;
}

// ===== FORM SUBMISSION =====
async function handleSubmission() {
    console.log('💾 Submitting form...');
    
    if (!validateCurrentStep()) {
        return;
    }

    // Get visit type from URL parameters (for checkin) or default to New Store
    const urlParams = new URLSearchParams(window.location.search);
    const visitType = urlParams.get('visit_type') || 'New Store';
    const storeId = urlParams.get('store_id');
    
    // Upload photo first if exists
    let photoUrl = null;
    if (capturedPhoto) {
        photoUrl = await uploadPhoto(capturedPhoto.file);
    }
    
    const visitData = {
        agent_code: currentUser.agent.agentDoc,
        visit_type: visitType,
        store_id: storeId, // Only for check-in
        location_lat: currentLocation.latitude,
        location_lng: currentLocation.longitude,
        address: currentLocation.address,
        store_type: storeTypeMapping[selectedStoreType] || selectedStoreType,
        store_name: elements.storeNameStep3.value.trim(),
        store_description: elements.storeDescriptionStep3.value.trim(),
        contact_name: elements.contactNameStep3.value.trim(),
        contact_phone: elements.contactPhoneStep3.value.trim(),
        cover_image: photoUrl,
        photos: photoUrl ? [{
            image: photoUrl,
            caption: 'รูปหน้าร้าน'
        }] : []
    };
    
    console.log('📊 Visit data prepared:', visitData);
    
    elements.nextBtn.disabled = true;
    elements.nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...';
    
    try {
        // Get CSRF token
        const csrfToken = await CRMLIFFCommon.getCSRFToken();
        
        const response = await fetch('/api/method/crmliff.api.liff_api.save_visit_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Frappe-CSRF-Token': csrfToken,
            },
            body: JSON.stringify(visitData)
        });

        const result = await response.json();

        if (result.message && result.message.success) {
            console.log('✅ Visit data saved successfully');
            showScreen('success');
            resetForm();
        } else {
            throw new Error(result.message?.error || 'เกิดข้อผิดพลาดในการบันทึก');
        }
        
    } catch (error) {
        console.error('❌ Submission failed:', error);
        showError(error.message || 'เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง');
        
    } finally {
        elements.nextBtn.disabled = false;
        elements.nextBtn.innerHTML = '<i class="fas fa-save"></i> บันทึกข้อมูล';
    }
}



// ===== PHOTO UPLOAD =====
async function uploadPhoto(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('doctype', 'CLIFF Store');
        formData.append('docname', 'temp');

        const csrfToken = await CRMLIFFCommon.getCSRFToken();
        
        const response = await fetch('/api/method/upload_file', {
            method: 'POST',
            headers: {
                'X-Frappe-CSRF-Token': csrfToken,
            },
            body: formData
        });

        const result = await response.json();
        
        if (result.message && result.message.file_url) {
            return result.message.file_url;
        } else {
            console.warn('Photo upload failed, continuing without photo');
            return null;
        }
        
    } catch (error) {
        console.error('Photo upload error:', error);
        return null;
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

// ===== ERROR HANDLING =====
function showError(message) {
    console.error('⚠️ Error:', message);
    CRMLIFFCommon.showError(message);
}

function closeErrorModal() {
    CRMLIFFCommon.closeError();
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
    }
};

console.log('🔧 Debug functions available: CRMLIFF_DEBUG');

// Make retryLocation available globally for onclick
window.retryLocation = retryLocation;
