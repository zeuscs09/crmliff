/**
 * Shared Navbar Component for Bangbow CRM
 */

class BangbowNavbar {
    constructor(options = {}) {
        this.options = {
            currentPage: options.currentPage || '',
            showActions: options.showActions !== false,
            title: options.title || 'Bangbow Sales Kit',
            subtitle: options.subtitle || '',
            ...options
        };
        this.init();
    }

    init() {
        this.createNavbar();
        this.attachStyles();
    }

    createNavbar() {
        const navbar = document.createElement('div');
        navbar.className = 'bangbow-navbar';
        navbar.innerHTML = this.getNavbarHTML();
        
        // Insert navbar at the beginning of body
        document.body.insertBefore(navbar, document.body.firstChild);
    }

    getNavbarHTML() {
        const actions = this.options.showActions ? this.getNavActions() : '';
        
        return `
            <div class="navbar-header">
                <div class="navbar-content">
                    <div class="navbar-brand">
                        <h1>
                            <i class="${this.options.icon || 'fas fa-chart-line'}"></i>
                            ${this.options.title}
                        </h1>
                        ${this.options.subtitle ? `<div class="navbar-subtitle">${this.options.subtitle}</div>` : ''}
                    </div>
                    ${actions}
                </div>
            </div>
        `;
    }

    getNavActions() {
        const links = [
            {
                href: '/crm-bangbow',
                icon: 'fas fa-home',
                text: 'หน้าหลัก',
                id: 'main-index'
            },
            {
                href: '/crm-bangbow/dashboard.html',
                icon: 'fas fa-chart-line',
                text: 'Dashboard',
                id: 'dashboard'
            },
            {
                href: '/crm-bangbow/visit-map.html',
                icon: 'fas fa-map-marked-alt',
                text: 'แผนที่การเยี่ยมร้าน',
                id: 'visit-map'
            },
            // {
            //     href: '/liff-app.html',
            //     icon: 'fas fa-mobile-alt',
            //     text: 'LIFF App',
            //     id: 'liff'
            // },
            {
                href: '/desk',
                icon: 'fas fa-desktop',
                text: 'Desk',
                id: 'desk'
            }
        ];

        const filteredLinks = links.filter(link => link.id !== this.options.currentPage);
        
        return `
            <div class="navbar-actions">
                ${filteredLinks.map(link => `
                    <a href="${link.href}" class="btn-nav">
                        <i class="${link.icon}"></i>
                        <span class="nav-text">${link.text}</span>
                    </a>
                `).join('')}
            </div>
        `;
    }

    attachStyles() {
        if (document.getElementById('bangbow-navbar-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'bangbow-navbar-styles';
        styles.textContent = `
            .bangbow-navbar {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                position: sticky;
                top: 0;
                z-index: 1000;
            }
            
            .navbar-header {
                padding: 15px 20px;
            }
            
            .navbar-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 15px;
            }
            
            .navbar-brand h1 {
                font-size: 24px;
                font-weight: 700;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .navbar-subtitle {
                font-size: 12px;
                opacity: 0.9;
                margin-top: 4px;
            }
            
            .navbar-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .btn-nav {
                padding: 8px 12px;
                background: rgba(255,255,255,0.15);
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 6px;
                text-decoration: none;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
            }
            
            .btn-nav:hover {
                background: rgba(255,255,255,0.25);
                color: white;
                text-decoration: none;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .btn-nav i {
                font-size: 12px;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .navbar-header {
                    padding: 12px 16px;
                }
                
                .navbar-brand h1 {
                    font-size: 20px;
                }
                
                .navbar-actions {
                    width: 100%;
                    justify-content: center;
                }
                
                .btn-nav {
                    flex: 1;
                    justify-content: center;
                    min-width: 0;
                    padding: 8px 6px;
                }
                
                .nav-text {
                    display: none;
                }
                
                .btn-nav i {
                    font-size: 14px;
                }
            }
            
            @media (max-width: 480px) {
                .navbar-content {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .navbar-actions {
                    width: 100%;
                    grid-template-columns: repeat(4, 1fr);
                    display: grid;
                    gap: 6px;
                }
                
                .btn-nav {
                    padding: 10px 6px;
                    flex-direction: column;
                    gap: 2px;
                }
                
                .nav-text {
                    display: block;
                    font-size: 10px;
                    text-align: center;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    // Method to update current page
    setCurrentPage(pageId) {
        this.options.currentPage = pageId;
        const navbar = document.querySelector('.bangbow-navbar');
        if (navbar) {
            navbar.innerHTML = this.getNavbarHTML();
        }
    }

    // Method to show/hide specific navigation items
    updateNavigation(options) {
        this.options = { ...this.options, ...options };
        const navbar = document.querySelector('.bangbow-navbar');
        if (navbar) {
            navbar.innerHTML = this.getNavbarHTML();
        }
    }
}

// Utility function to initialize navbar
function initBangbowNavbar(options = {}) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new BangbowNavbar(options);
        });
    } else {
        new BangbowNavbar(options);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BangbowNavbar, initBangbowNavbar };
}

// Global access
window.BangbowNavbar = BangbowNavbar;
window.initBangbowNavbar = initBangbowNavbar; 