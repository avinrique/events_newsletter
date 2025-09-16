let currentUser = null;
let currentApprovalItem = null;

// Initialize HOD Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Immediate modal hiding
    hideAllModalsOnLoad();
    
    // Additional safety check after a short delay
    setTimeout(() => {
        hideAllModalsOnLoad();
    }, 100);
    // Check if user is authenticated and has HOD role
    if (!api.token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await api.getMe();
        currentUser = response.data;
        
        // Debug: Log user data to help troubleshoot
        console.log('🔍 HOD Auth Check - User data:', {
            role: currentUser.role,
            position: currentUser.position,
            name: currentUser.name,
            email: currentUser.email
        });
        
        // Check if user has HOD privileges (role='teacher' with position='HOD')
        const isHOD = currentUser.role === 'teacher' && currentUser.position === 'HOD';
        
        console.log('🔍 HOD Auth Check - isHOD:', isHOD);
        
        if (!isHOD) {
            console.error('❌ HOD Auth Failed - User does not have HOD privileges');
            alert(`Access denied. HOD privileges required.\n\nUser details:\nRole: ${currentUser.role}\nPosition: ${currentUser.position}`);
            
            // Add delay to see console logs
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
            return;
        }
        
        initializeHODDashboard();
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/';
    }
});

function initializeHODDashboard() {
    // Display HOD info
    document.getElementById('hodInfo').textContent = `Welcome, ${currentUser.name} - ${currentUser.department?.name || 'Department'} HOD`;
    
    // Hide any modals that might be visible on page load
    hideAllModalsOnLoad();
    
    // Initialize teacher functionality for HOD
    initializeTeacherFunctionality();
    
    // Load dashboard data
    loadDashboardStats();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup global modal handlers
    setupGlobalModalHandlers();
}

function hideAllModalsOnLoad() {
    // Hide all modals that might be showing on page refresh
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('show');
    });
    
    // Also hide specific problematic modals by ID
    const problematicModals = [
        'approvalModal',
        'editStudentModal', 
        'viewStudentModal',
        'addCertificateModal',
        'addInternshipModal',
        'addProjectModal',
        'editCertificateModal',
        'editInternshipModal',
        'editProjectModal'
    ];
    
    problematicModals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    });
    
    console.log('✅ All modals hidden on page load');
}

function setupGlobalModalHandlers() {
    // Global modal close handlers
    document.addEventListener('click', (e) => {
        // Handle any close button clicks
        if (e.target.matches('.close, [data-close-modal]')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.remove();
                    }
                }, 300);
            }
        }
    });
    
    // Global escape key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const visibleModals = document.querySelectorAll('.modal.show');
            visibleModals.forEach(modal => {
                modal.classList.remove('show');
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.remove();
                    }
                }, 300);
            });
        }
    });
    
    console.log('✅ Global modal handlers set up');
}

function initializeTeacherFunctionality() {
    // Since HODs are teachers with position='HOD', they should have access to teacher functionality
    try {
        if (typeof TeacherDashboard !== 'undefined') {
            window.teacherDashboard = new TeacherDashboard();
            
            // Set the current user for the teacher dashboard to work properly in HOD context
            // Ensure both _id and id properties exist for compatibility
            const userForTeacher = {
                ...currentUser,
                id: currentUser._id || currentUser.id,
                _id: currentUser._id || currentUser.id
            };
            window.teacherDashboard.currentUser = userForTeacher;
            
            // Override modal display to make it more responsive
            enhanceModalResponsiveness();
            
            console.log('✅ Teacher functionality initialized for HOD');
            console.log('🔍 Current user set for teacher dashboard:', currentUser);
        } else {
            console.warn('⚠️ TeacherDashboard class not available. Some functionality may be limited.');
        }
    } catch (error) {
        console.error('❌ Error initializing teacher functionality for HOD:', error);
    }
}

function enhanceModalResponsiveness() {
    // Add responsive enhancements for modals in HOD context
    const originalCreateModal = window.teacherDashboard?.showCreateEventModal;
    if (originalCreateModal) {
        window.teacherDashboard.showCreateEventModal = async function() {
            const result = await originalCreateModal.call(this);
            
            // Add responsive classes and behaviors
            setTimeout(() => {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    if (!modal.classList.contains('hod-enhanced')) {
                        modal.classList.add('hod-enhanced');
                        
                        // Ensure modal is properly centered and responsive
                        modal.classList.add('show');
                        modal.style.alignItems = 'center';
                        modal.style.justifyContent = 'center';
                        
                        // Add touch/click outside to close
                        modal.addEventListener('click', (e) => {
                            if (e.target === modal) {
                                modal.classList.remove('show');
                                setTimeout(() => modal.remove(), 300); // Allow animation
                            }
                        });
                        
                        // Add escape key to close
                        const escapeHandler = (e) => {
                            if (e.key === 'Escape') {
                                modal.classList.remove('show');
                                setTimeout(() => modal.remove(), 300); // Allow animation
                                document.removeEventListener('keydown', escapeHandler);
                            }
                        };
                        document.addEventListener('keydown', escapeHandler);
                        
                        // Ensure the modal content is scrollable on mobile
                        const modalContent = modal.querySelector('.modal-content');
                        if (modalContent) {
                            modalContent.style.maxHeight = '95vh';
                            modalContent.style.overflowY = 'auto';
                            modalContent.style.margin = '10px';
                        }
                        
                        console.log('✅ Enhanced modal responsiveness for HOD panel');
                    }
                });
            }, 100);
            
            return result;
        };
    }
}

function setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', handleTabSwitch);
    });
    
    // Modal handlers
    document.getElementById('closeApprovalModal').addEventListener('click', closeApprovalModal);
    
    // Approval buttons
    document.getElementById('approveBtn').addEventListener('click', handleApprove);
    document.getElementById('rejectBtn').addEventListener('click', handleReject);
    document.getElementById('cancelApprovalBtn').addEventListener('click', closeApprovalModal);
    
    // Filter handlers
    document.getElementById('clubStatusFilter').addEventListener('change', loadClubs);
    document.getElementById('eventTypeFilter').addEventListener('change', loadEvents);
    document.getElementById('eventStatusFilter').addEventListener('change', loadEvents);
    document.getElementById('teacherEventStatusFilter').addEventListener('change', loadTeacherEvents);
    document.getElementById('teacherEventCreatedByFilter').addEventListener('change', loadTeacherEvents);
    
    // Teacher Event Management
    document.getElementById('createTeacherEventBtn').addEventListener('click', createTeacherEvent);
    
    // Report handlers
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
    document.getElementById('generateNewsletterBtn').addEventListener('click', generateNewsletter);
    document.getElementById('reportPeriod').addEventListener('change', handleReportPeriodChange);
    document.getElementById('reportType').addEventListener('change', handleReportTypeChange);
    
    // Dynamic content event delegation
    document.addEventListener('click', handleDynamicActions);
    
    // Search functionality
    document.getElementById('teacherSearch').addEventListener('keyup', searchTeachers);
    document.getElementById('studentSearch').addEventListener('keyup', searchStudents);
    document.getElementById('teacherEventSearch').addEventListener('keyup', searchTeacherEvents);
    document.getElementById('semesterFilter').addEventListener('change', loadStudents);
    document.getElementById('projectTypeFilter').addEventListener('change', loadProjects);
    document.getElementById('projectStatusFilter').addEventListener('change', loadProjects);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

function handleNavigation(e) {
    e.preventDefault();
    const target = e.target.getAttribute('href').substring(1);
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    e.target.classList.add('active');
    
    // Show corresponding section
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.getElementById(target + 'Section').classList.add('active');
    
    // Load section data
    switch(target) {
        case 'approvals':
            loadPendingApprovals();
            break;
        case 'clubs':
            loadClubs();
            break;
        case 'events':
            loadEvents();
            break;
        case 'teacher-events':
            loadTeacherEvents();
            break;
        case 'teachers':
            loadTeachers();
            break;
        case 'students':
            loadStudents();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'budgets':
            loadBudgets();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

function handleTabSwitch(e) {
    const tabName = e.target.getAttribute('data-tab');
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // Show corresponding content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName + 'Approvals').classList.add('active');
    
    // Load tab-specific data
    switch(tabName) {
        case 'clubs':
            loadPendingClubs();
            break;
        case 'events':
            loadPendingEvents();
            break;
        case 'budgets':
            loadPendingBudgets();
            break;
    }
}

function handleDynamicActions(e) {
    if (!e.target.hasAttribute('data-action')) return;
    
    const action = e.target.getAttribute('data-action');
    const id = e.target.getAttribute('data-id');
    const type = e.target.getAttribute('data-type');
    
    switch (action) {
        case 'approve':
            showApprovalModal(id, type, 'approve');
            break;
        case 'reject':
            showApprovalModal(id, type, 'reject');
            break;
        case 'viewDetails':
            viewItemDetails(id, type);
            break;
    }
}

// Dashboard Statistics
async function loadDashboardStats() {
    try {
        const [clubsResponse, eventsResponse, usersResponse] = await Promise.all([
            api.getClubs({ department: currentUser.department._id }),
            api.getEvents({ department: currentUser.department._id }),
            api.getUsers({ department: currentUser.department._id, role: 'student' })
        ]);
        
        // Update stats
        const pendingClubs = clubsResponse.data?.filter(club => club.status === 'pending').length || 0;
        const pendingEvents = eventsResponse.data?.filter(event => event.status === 'pending').length || 0;
        const pendingApprovals = pendingClubs + pendingEvents;
        
        // Update stats with null checks
        const pendingApprovalsEl = document.getElementById('pendingApprovals');
        if (pendingApprovalsEl) pendingApprovalsEl.textContent = pendingApprovals;
        
        const totalClubsEl = document.getElementById('totalClubs');
        if (totalClubsEl) totalClubsEl.textContent = clubsResponse.data?.length || 0;
        
        const totalEventsEl = document.getElementById('totalEvents');
        if (totalEventsEl) totalEventsEl.textContent = eventsResponse.data?.length || 0;
        
        const totalStudentsEl = document.getElementById('totalStudents');
        if (totalStudentsEl) totalStudentsEl.textContent = usersResponse.data?.length || 0;
        
        // Load recent activity
        loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    
    try {
        // Get recent clubs and events from the department
        const [recentClubs, recentEvents] = await Promise.all([
            api.getClubs({ department: currentUser.department._id }),
            api.getEvents({ department: currentUser.department._id })
        ]);
        
        // Combine and sort by creation date
        const allActivities = [];
        
        if (recentClubs.data) {
            recentClubs.data.slice(0, 3).forEach(club => {
                allActivities.push({
                    type: 'club',
                    title: `New club: ${club.name}`,
                    description: club.status === 'pending' ? 'Awaiting approval' : `Status: ${club.status}`,
                    createdAt: new Date(club.createdAt),
                    icon: 'fas fa-users',
                    color: club.status === 'pending' ? '#ff9500' : '#4ecdc4'
                });
            });
        }
        
        if (recentEvents.data) {
            recentEvents.data.slice(0, 3).forEach(event => {
                allActivities.push({
                    type: 'event',
                    title: `Event: ${event.title}`,
                    description: event.status === 'pending' ? 'Awaiting approval' : `Status: ${event.status}`,
                    createdAt: new Date(event.createdAt),
                    icon: 'fas fa-calendar',
                    color: event.status === 'pending' ? '#ff9500' : '#45b7d1'
                });
            });
        }
        
        // Sort by date (newest first) and limit to 5
        allActivities.sort((a, b) => b.createdAt - a.createdAt);
        const recentActivities = allActivities.slice(0, 5);
        
        if (recentActivities.length > 0) {
            activityList.innerHTML = recentActivities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon" style="background: ${activity.color};">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p><strong>${activity.title}</strong></p>
                        <small>${activity.description} • ${getTimeAgo(activity.createdAt)}</small>
                    </div>
                </div>
            `).join('');
        } else {
            activityList.innerHTML = '<p>No recent activity in your department.</p>';
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityList.innerHTML = '<p>Unable to load recent activity.</p>';
    }
}

// Teacher Management
async function loadTeachers() {
    try {
        const response = await api.getUsers({ 
            department: currentUser.department._id, 
            role: 'teacher'
        });
        
        const teachersList = document.getElementById('teachersList');
        
        if (response.data && response.data.length > 0) {
            teachersList.innerHTML = response.data.map(teacher => `
                <div class="data-card">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <i class="fas fa-chalkboard-teacher"></i>
                        </div>
                        <div class="profile-info">
                            <h4>${teacher.name}</h4>
                            <div class="profile-meta">
                                ${teacher.position === 'HOD' ? '<span class="badge badge-primary">HOD</span>' : ''}
                                ${teacher.designation ? `<span class="designation">${teacher.designation.name}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="profile-details">
                        <p><i class="fas fa-envelope"></i> ${teacher.email}</p>
                        ${teacher.contactNumber ? `<p><i class="fas fa-phone"></i> ${teacher.contactNumber}</p>` : ''}
                        <p><i class="fas fa-calendar"></i> Joined: ${new Date(teacher.createdAt).toLocaleDateString()}</p>
                        <p class="status ${teacher.isActive ? 'active' : 'inactive'}">
                            <i class="fas fa-circle"></i> ${teacher.isActive ? 'Active' : 'Inactive'}
                        </p>
                    </div>
                </div>
            `).join('');
        } else {
            teachersList.innerHTML = '<p>No teachers found in your department.</p>';
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
        document.getElementById('teachersList').innerHTML = '<p>Error loading teachers.</p>';
    }
}

function searchTeachers() {
    const searchTerm = document.getElementById('teacherSearch').value.toLowerCase();
    const teacherCards = document.querySelectorAll('#teachersList .data-card');
    
    teacherCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Student Management
async function loadStudents() {
    try {
        const semesterFilter = document.getElementById('semesterFilter').value;
        const params = {};
        
        if (semesterFilter) {
            params.semester = semesterFilter;
        }
        
        const response = await api.getDepartmentStudents(params);
        const studentsList = document.getElementById('studentsList');
        
        if (response.data && response.data.length > 0) {
            studentsList.innerHTML = response.data.map(student => `
                <div class="data-card">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <i class="fas fa-user-graduate"></i>
                        </div>
                        <div class="profile-info">
                            <h4>${student.name}</h4>
                            <div class="profile-meta">
                                <span class="semester">Semester ${student.semester || 'N/A'}</span>
                                <span class="usn">${student.usn || student.tempUSN || 'No USN'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="profile-details">
                        <p><i class="fas fa-envelope"></i> ${student.email}</p>
                        ${student.rollNumber ? `<p><i class="fas fa-id-card"></i> Roll: ${student.rollNumber}</p>` : ''}
                        ${student.contactNumber ? `<p><i class="fas fa-phone"></i> ${student.contactNumber}</p>` : ''}
                        <p><i class="fas fa-calendar"></i> Joined: ${new Date(student.createdAt).toLocaleDateString()}</p>
                        <p class="status ${student.isActive ? 'active' : 'inactive'}">
                            <i class="fas fa-circle"></i> ${student.isActive ? 'Active' : 'Inactive'}
                        </p>
                    </div>
                </div>
            `).join('');
        } else {
            studentsList.innerHTML = '<p>No students found in your department.</p>';
        }
    } catch (error) {
        console.error('Error loading students:', error);
        document.getElementById('studentsList').innerHTML = '<p>Error loading students.</p>';
    }
}

function searchStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const studentCards = document.querySelectorAll('#studentsList .data-card');
    
    studentCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Approval Functions
async function loadPendingApprovals() {
    loadPendingClubs();
}

async function loadPendingClubs() {
    try {
        const response = await api.getClubs({ 
            department: currentUser.department._id,
            status: 'pending'
        });
        
        const pendingClubs = document.getElementById('pendingClubs');
        
        if (response.data && response.data.length > 0) {
            pendingClubs.innerHTML = response.data.map(club => `
                <div class="data-card">
                    <h4>${club.name}</h4>
                    <div class="card-meta">
                        Proposed by: ${club.mentor?.name || 'Unknown'} | ${new Date(club.createdAt).toLocaleDateString()}
                    </div>
                    <p>${club.description}</p>
                    <div class="card-actions">
                        <button class="btn btn-success" data-action="approve" data-id="${club._id}" data-type="club">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-danger" data-action="reject" data-id="${club._id}" data-type="club">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        <button class="btn btn-secondary" data-action="viewDetails" data-id="${club._id}" data-type="club">
                            <i class="fas fa-eye"></i> Details
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            pendingClubs.innerHTML = '<p>No pending club proposals.</p>';
        }
    } catch (error) {
        console.error('Error loading pending clubs:', error);
        document.getElementById('pendingClubs').innerHTML = '<p>Error loading club proposals.</p>';
    }
}

async function loadPendingEvents() {
    try {
        const response = await api.getEvents({ 
            department: currentUser.department._id,
            status: 'pending'
        });
        
        const pendingEvents = document.getElementById('pendingEvents');
        
        if (response.data && response.data.length > 0) {
            pendingEvents.innerHTML = response.data.map(event => `
                <div class="data-card">
                    <h4>${event.title}</h4>
                    <div class="card-meta">
                        Type: ${event.type} | Date: ${new Date(event.eventDate).toLocaleDateString()}
                        ${event.organizer ? ` | Organizer: ${event.organizer.name}` : ''}
                    </div>
                    <p>${event.description}</p>
                    ${event.budget ? `<p><strong>Budget:</strong> ₹${event.budget.toLocaleString()}</p>` : ''}
                    <div class="card-actions">
                        <button class="btn btn-success" data-action="approve" data-id="${event._id}" data-type="event">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-danger" data-action="reject" data-id="${event._id}" data-type="event">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        <button class="btn btn-secondary" data-action="viewDetails" data-id="${event._id}" data-type="event">
                            <i class="fas fa-eye"></i> Details
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            pendingEvents.innerHTML = '<p>No pending event requests.</p>';
        }
    } catch (error) {
        console.error('Error loading pending events:', error);
        document.getElementById('pendingEvents').innerHTML = '<p>Error loading event requests.</p>';
    }
}

async function loadPendingBudgets() {
    // TODO: Implement budget loading when API is ready
    document.getElementById('pendingBudgets').innerHTML = '<p>Budget approval functionality - To be implemented</p>';
}

// Club Management
async function loadClubs() {
    try {
        const statusFilter = document.getElementById('clubStatusFilter').value;
        const params = { department: currentUser.department._id };
        if (statusFilter) params.status = statusFilter;
        
        const response = await api.getClubs(params);
        const clubsList = document.getElementById('clubsList');
        
        if (response.data && response.data.length > 0) {
            clubsList.innerHTML = response.data.map(club => `
                <div class="data-card">
                    <h4>${club.name}</h4>
                    <div class="card-meta">
                        Mentor: ${club.mentor?.name || 'Not assigned'} | 
                        Status: <span class="status-badge status-${club.status}">${club.status}</span>
                    </div>
                    <p>${club.description}</p>
                    <p><strong>Members:</strong> ${club.members?.length || 0}</p>
                    ${club.president ? `<p><strong>President:</strong> ${club.president.name}</p>` : ''}
                </div>
            `).join('');
        } else {
            clubsList.innerHTML = '<p>No clubs found.</p>';
        }
    } catch (error) {
        console.error('Error loading clubs:', error);
    }
}

// Event Management
async function loadEvents() {
    try {
        const typeFilter = document.getElementById('eventTypeFilter').value;
        const statusFilter = document.getElementById('eventStatusFilter').value;
        const params = { department: currentUser.department._id };
        
        if (typeFilter) params.type = typeFilter;
        if (statusFilter) params.status = statusFilter;
        
        const response = await api.getEvents(params);
        const eventsList = document.getElementById('eventsList');
        
        if (response.data && response.data.length > 0) {
            eventsList.innerHTML = response.data.map(event => `
                <div class="data-card">
                    <h4>${event.title}</h4>
                    <div class="card-meta">
                        Type: ${event.type} | Date: ${new Date(event.eventDate).toLocaleDateString()} |
                        Status: <span class="status-badge status-${event.status}">${event.status}</span>
                    </div>
                    <p>${event.description}</p>
                    ${event.budget ? `<p><strong>Budget:</strong> ₹${event.budget.toLocaleString()}</p>` : ''}
                    ${event.organizer ? `<p><strong>Organizer:</strong> ${event.organizer.name}</p>` : ''}
                </div>
            `).join('');
        } else {
            eventsList.innerHTML = '<p>No events found.</p>';
        }
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Budget Management
async function loadBudgets() {
    // TODO: Implement budget loading
    document.getElementById('totalRequested').textContent = '₹0';
    document.getElementById('totalApproved').textContent = '₹0';
    document.getElementById('totalUtilized').textContent = '₹0';
    
    document.getElementById('budgetsList').innerHTML = '<p>Budget management functionality - To be implemented</p>';
}

// Project Management
async function loadProjects() {
    try {
        const typeFilter = document.getElementById('projectTypeFilter').value;
        const statusFilter = document.getElementById('projectStatusFilter').value;
        const params = {};
        
        if (typeFilter) {
            params.studentProjectType = typeFilter;
        }
        if (statusFilter) {
            params.approvalStatus = statusFilter;
        }
        
        const response = await api.getDepartmentProjects(params);
        const projectsList = document.getElementById('projectsList');
        
        if (response.data && response.data.length > 0) {
            projectsList.innerHTML = response.data.map(project => `
                <div class="project-card" data-project-id="${project._id}">
                    <div class="project-header">
                        <div class="project-info">
                            <h3>${project.title}</h3>
                            <div class="project-meta">
                                <span class="project-type ${project.studentProjectType}">${project.studentProjectType.charAt(0).toUpperCase() + project.studentProjectType.slice(1)} Project</span>
                                <span class="project-status ${project.approvalStatus}">${project.approvalStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            </div>
                        </div>
                        <div class="project-actions">
                            <button class="btn btn-sm btn-outline" onclick="viewProject('${project._id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </div>
                    </div>
                    
                    <div class="project-details">
                        <p><strong>Domain:</strong> ${project.domain}</p>
                        <p><strong>Created by:</strong> ${project.createdBy.name} (${project.createdBy.usn || project.createdBy.rollNumber || 'N/A'})</p>
                        ${project.primaryMentor ? `<p><strong>Mentor:</strong> ${project.primaryMentor.name}</p>` : ''}
                        ${project.teamMembers && project.teamMembers.length > 0 ? `
                            <p><strong>Team Members:</strong> ${project.teamMembers.map(member => member.user.name).join(', ')}</p>
                        ` : ''}
                        ${project.description ? `<p><strong>Description:</strong> ${project.description.length > 100 ? project.description.substring(0, 100) + '...' : project.description}</p>` : ''}
                        <p><strong>Created:</strong> ${new Date(project.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    ${project.approvalStatus === 'pending-approval' ? `
                        <div class="project-approval-actions">
                            <button class="btn btn-sm btn-success" onclick="approveProject('${project._id}')">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="rejectProject('${project._id}')">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
            
            // Update project count display
            const projectCounts = {
                total: response.data.length,
                personal: response.projectsByType.personal.length,
                mini: response.projectsByType.mini.length,
                major: response.projectsByType.major.length,
                approved: response.data.filter(p => p.approvalStatus === 'approved').length,
                pending: response.data.filter(p => p.approvalStatus === 'pending-approval').length
            };
            
            // Display project statistics if element exists
            const statsContainer = document.getElementById('projectStats');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-number">${projectCounts.total}</span>
                            <span class="stat-label">Total Projects</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${projectCounts.personal}</span>
                            <span class="stat-label">Personal</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${projectCounts.mini}</span>
                            <span class="stat-label">Mini Projects</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${projectCounts.major}</span>
                            <span class="stat-label">Major Projects</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${projectCounts.approved}</span>
                            <span class="stat-label">Approved</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${projectCounts.pending}</span>
                            <span class="stat-label">Pending</span>
                        </div>
                    </div>
                `;
            }
        } else {
            projectsList.innerHTML = '<p>No projects found in your department.</p>';
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projectsList').innerHTML = '<p>Error loading projects.</p>';
    }
}

// Project Action Functions
function viewProject(projectId) {
    // TODO: Implement project view modal or redirect to project details
    console.log('Viewing project:', projectId);
    alert(`Project viewing feature to be implemented. Project ID: ${projectId}`);
}

async function approveProject(projectId) {
    try {
        if (!confirm('Are you sure you want to approve this project?')) {
            return;
        }

        const response = await api.approveProject(projectId);

        if (response.success) {
            alert('Project approved successfully!');
            loadProjects(); // Reload the projects list
        } else {
            alert('Failed to approve project: ' + (response.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error approving project:', error);
        alert('Error approving project: ' + error.message);
    }
}

async function rejectProject(projectId) {
    try {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) {
            return; // User cancelled
        }

        const response = await api.rejectProject(projectId, reason);

        if (response.success) {
            alert('Project rejected successfully!');
            loadProjects(); // Reload the projects list
        } else {
            alert('Failed to reject project: ' + (response.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error rejecting project:', error);
        alert('Error rejecting project: ' + error.message);
    }
}

// Report Management
async function loadReports() {
    // Load teachers for the dropdown
    await loadTeachersForReports();
    document.getElementById('reportContent').innerHTML = '<p>Select a report type and period, then click "Generate Report" to view reports.</p>';
}

async function loadTeachersForReports() {
    try {
        const response = await api.getUsers({ 
            department: currentUser.department._id, 
            role: 'teacher' 
        });
        
        const teacherSelect = document.getElementById('selectedTeacher');
        teacherSelect.innerHTML = '<option value="">Select a teacher...</option>';
        
        if (response.data && response.data.length > 0) {
            response.data.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher._id;
                option.textContent = `${teacher.name} (${teacher.designation?.name || 'Teacher'})`;
                teacherSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading teachers for reports:', error);
    }
}

function handleReportTypeChange() {
    const reportType = document.getElementById('reportType').value;
    const teacherSelector = document.getElementById('teacherSelector');
    
    if (reportType === 'individual') {
        teacherSelector.style.display = 'block';
    } else {
        teacherSelector.style.display = 'none';
    }
}

function handleReportPeriodChange() {
    const period = document.getElementById('reportPeriod').value;
    const customDateRange = document.getElementById('customDateRange');
    
    if (period === 'custom') {
        customDateRange.style.display = 'block';
    } else {
        customDateRange.style.display = 'none';
    }
}

async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const period = document.getElementById('reportPeriod').value;
    let startDate, endDate;
    
    const now = new Date();
    
    // Calculate date range
    switch (period) {
        case 'current-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'current-quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            break;
        case 'current-year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'custom':
            startDate = new Date(document.getElementById('startDate').value);
            endDate = new Date(document.getElementById('endDate').value);
            break;
    }

    const params = {};
    if (startDate && endDate) {
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
    }
    
    try {
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = '<div class="loading">Generating report...</div>';

        if (reportType === 'individual') {
            const teacherId = document.getElementById('selectedTeacher').value;
            if (!teacherId) {
                alert('Please select a teacher for individual report');
                return;
            }
            await generateIndividualTeacherReport(teacherId, params);
        } else if (reportType === 'teachers') {
            await generateTeachersReport(params);
        } else {
            await generateDepartmentReport(params);
        }
        
        showNotification('Report generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('Error generating report: ' + error.message, 'error');
        document.getElementById('reportContent').innerHTML = '<p>Error generating report. Please try again.</p>';
    }
}

async function generateIndividualTeacherReport(teacherId, params) {
    const response = await api.getTeacherReport(teacherId, params);
    const reportData = response.data;
    
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = `
        <div class="teacher-report">
            <div class="report-header">
                <h3>Teacher Activity Report</h3>
                <div class="report-actions">
                    <button onclick="downloadTeacherReport('${teacherId}', ${JSON.stringify(params).replace(/"/g, '&quot;')})" class="btn btn-primary">
                        <i class="fas fa-download"></i> Download Report
                    </button>
                </div>
            </div>
            
            <div class="teacher-info">
                <h4>${reportData.teacher.name}</h4>
                <p><strong>Designation:</strong> ${reportData.teacher.designation || 'Teacher'}</p>
                <p><strong>Email:</strong> ${reportData.teacher.email}</p>
                <p><strong>Department:</strong> ${reportData.teacher.department}</p>
                <p><strong>Report Period:</strong> ${reportData.reportPeriod.startDate} to ${reportData.reportPeriod.endDate}</p>
            </div>

            <div class="statistics-grid">
                <div class="stat-card">
                    <h5>Projects Mentored</h5>
                    <div class="stat-number">${reportData.statistics.totalMentoredProjects}</div>
                    <div class="stat-breakdown">
                        Major: ${reportData.statistics.projectsByType.major} | 
                        Mini: ${reportData.statistics.projectsByType.mini} | 
                        Personal: ${reportData.statistics.projectsByType.personal}
                    </div>
                </div>
                
                <div class="stat-card">
                    <h5>Certificates Supervised</h5>
                    <div class="stat-number">${reportData.statistics.totalSupervisedCertificates}</div>
                    <div class="stat-breakdown">
                        Approved: ${reportData.statistics.certificatesByStatus.approved} | 
                        Pending: ${reportData.statistics.certificatesByStatus.pending}
                    </div>
                </div>
                
                <div class="stat-card">
                    <h5>Internships Supervised</h5>
                    <div class="stat-number">${reportData.statistics.totalSupervisedInternships}</div>
                    <div class="stat-breakdown">
                        Approved: ${reportData.statistics.internshipsByStatus.approved} | 
                        Pending: ${reportData.statistics.internshipsByStatus.pending}
                    </div>
                </div>
                
                <div class="stat-card">
                    <h5>Events Created</h5>
                    <div class="stat-number">${reportData.statistics.totalCreatedEvents}</div>
                    <div class="stat-breakdown">
                        Published: ${reportData.statistics.eventsByStatus.published} | 
                        Completed: ${reportData.statistics.eventsByStatus.completed}
                    </div>
                </div>
            </div>

            <div class="report-sections">
                <div class="report-section">
                    <h5>Recent Projects Mentored</h5>
                    <div class="data-table">
                        ${reportData.mentoredProjects.length > 0 ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th>Project Title</th>
                                        <th>Type</th>
                                        <th>Student</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${reportData.mentoredProjects.map(project => `
                                        <tr>
                                            <td>${project.title}</td>
                                            <td>${project.type}</td>
                                            <td>${project.createdBy} (${project.studentUSN})</td>
                                            <td><span class="status-badge ${project.status}">${project.status}</span></td>
                                            <td>${new Date(project.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p>No projects mentored in this period.</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function generateTeachersReport(params) {
    const response = await api.getDepartmentTeachersReport(params);
    const reportData = response.data;
    
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = `
        <div class="teachers-report">
            <div class="report-header">
                <h3>Department Teachers Report</h3>
                <p><strong>Period:</strong> ${reportData.reportPeriod.startDate} to ${reportData.reportPeriod.endDate}</p>
            </div>
            
            <div class="department-totals">
                <h4>Department Summary</h4>
                <div class="statistics-grid">
                    <div class="stat-card">
                        <h5>Total Teachers</h5>
                        <div class="stat-number">${reportData.departmentTotals.totalTeachers}</div>
                    </div>
                    <div class="stat-card">
                        <h5>Projects Mentored</h5>
                        <div class="stat-number">${reportData.departmentTotals.totalMentoredProjects}</div>
                    </div>
                    <div class="stat-card">
                        <h5>Certificates Supervised</h5>
                        <div class="stat-number">${reportData.departmentTotals.totalSupervisedCertificates}</div>
                    </div>
                    <div class="stat-card">
                        <h5>Events Created</h5>
                        <div class="stat-number">${reportData.departmentTotals.totalCreatedEvents}</div>
                    </div>
                </div>
            </div>

            <div class="teachers-list">
                <h4>Individual Teacher Performance</h4>
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Teacher</th>
                                <th>Designation</th>
                                <th>Projects</th>
                                <th>Certificates</th>
                                <th>Internships</th>
                                <th>Events</th>
                                <th>Students</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportData.teacherReports.map(teacher => `
                                <tr>
                                    <td>${teacher.teacher.name}</td>
                                    <td>${teacher.teacher.designation || 'Teacher'}</td>
                                    <td>${teacher.activityCounts.mentoredProjects}</td>
                                    <td>${teacher.activityCounts.supervisedCertificates}</td>
                                    <td>${teacher.activityCounts.supervisedInternships}</td>
                                    <td>${teacher.activityCounts.createdEvents}</td>
                                    <td>${teacher.activityCounts.assignedStudents}</td>
                                    <td>
                                        <button onclick="generateIndividualTeacherReportById('${teacher.teacher._id}')" class="btn btn-sm btn-outline">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async function generateDepartmentReport(params) {
    // For now, generate a combined department summary
    await generateTeachersReport(params);
}

async function downloadTeacherReport(teacherId, params) {
    try {
        const response = await api.downloadTeacherReport(teacherId, params);
        if (response.success) {
            response.directDownload();
            showNotification('Report download started!', 'success');
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        showNotification('Error downloading report: ' + error.message, 'error');
    }
}

async function generateIndividualTeacherReportById(teacherId) {
    document.getElementById('reportType').value = 'individual';
    document.getElementById('selectedTeacher').value = teacherId;
    handleReportTypeChange();
    await generateReport();
}

async function generateNewsletter() {
    const period = document.getElementById('reportPeriod').value;
    let startDate, endDate;
    
    const now = new Date();
    
    switch (period) {
        case 'current-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'current-quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            break;
        case 'current-year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'custom':
            startDate = new Date(document.getElementById('startDate').value);
            endDate = new Date(document.getElementById('endDate').value);
            break;
    }
    
    try {
        showNotification('Generating newsletter...', 'info');
        
        // Get department ID (handle both object and string formats)
        const departmentId = typeof currentUser.department === 'object' 
            ? currentUser.department._id || currentUser.department.id
            : currentUser.department;
        
        console.log('🏢 Department ID for API call:', departmentId);
        
        // Fetch only teacher events data
        const teacherEvents = await api.request('/teacher-events');
        
        console.log('📊 Teacher Events Response:', {
            teacherEvents: teacherEvents?.data?.length || 0
        });
        
        // Handle API response
        const teacherEventsData = teacherEvents?.data || [];
        
        // Debug image structure
        teacherEventsData.forEach((event, idx) => {
            if (event.images && event.images.length > 0) {
                console.log(`🖼️ Event ${idx} "${event.title}" has ${event.images.length} images:`, event.images);
                event.images.forEach((image, imgIdx) => {
                    console.log(`  📷 Image ${imgIdx}:`, typeof image, image);
                    if (typeof image === 'object' && image) {
                        console.log(`    Properties:`, Object.keys(image));
                    }
                });
            }
        });
        
        // Filter events by date range
        const filteredTeacherEvents = teacherEventsData.filter(event => {
            const eventDate = new Date(event.eventDate);
            return eventDate >= startDate && eventDate <= endDate;
        });
        
        console.log('📅 Filtered Teacher Events:', filteredTeacherEvents.length);
        
        // Generate newsletter content
        const newsletterHTML = generateTeacherEventsNewsletter(
            filteredTeacherEvents,
            startDate,
            endDate
        );
        
        // Display newsletter
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = newsletterHTML;
        
        // Add print and export buttons
        addNewsletterActions();
        
        showNotification('Newsletter generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating newsletter:', error);
        showNotification('Error generating newsletter: ' + error.message, 'error');
    }
}

function generateTeacherEventsNewsletter(teacherEvents, startDate, endDate) {
    console.log('📋 HOD Newsletter generation started with', teacherEvents.length, 'events');
    teacherEvents.forEach((event, idx) => {
        console.log(`HOD Event ${idx + 1}: ${event.title}`);
        if (event.documentContent) {
            console.log('  HOD documentContent items:', event.documentContent.length);
            event.documentContent.forEach((content, cIdx) => {
                if (content.type === 'image') {
                    console.log(`    HOD Content ${cIdx + 1} (image):`, content.imageUrls || content.imageUrl);
                }
            });
        }
    });
    
    const departmentName = typeof currentUser.department === 'object' 
        ? (currentUser.department.name || 'Academic Department')
        : (currentUser.department || 'Academic Department');
    
    // Sort events by date (most recent first)
    const sortedEvents = teacherEvents.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    
    // Group events by type/category for better organization
    const categorizeEvents = (events) => {
        const categories = {};
        events.forEach(event => {
            const category = event.eventType || 'Professional Activities';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(event);
        });
        return categories;
    };
    
    const categorizedEvents = categorizeEvents(sortedEvents);
    
    // Create single-column layout for better readability and PDF conversion
    const allEvents = Object.values(categorizedEvents).flat();
    
    return `
        <div class="newsletter-container" id="newsletter">
            <!-- Newsletter Header - Full Width Row -->
            <div class="newsletter-masthead">
                <div class="masthead-border-top"></div>
                <div class="masthead-content">
                    <h1 class="newsletter-main-title">${departmentName}</h1>
                    <h2 class="newsletter-tagline">Faculty Events & Activities Newsletter</h2>
                    <div class="newsletter-info-bar">
                        <div class="info-left">
                            <strong>Vol. ${new Date().getFullYear()}</strong> | Issue ${new Date().getMonth() + 1}
                        </div>
                        <div class="info-center">
                            ${new Date().toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </div>
                        <div class="info-right">
                            ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div class="masthead-border-bottom"></div>
            </div>
            
            <!-- Newsletter Content - Single Column Layout -->
            <div class="newsletter-body">
                <div class="newsletter-single-column">
                    ${allEvents.map((event, index) => {
                        // Single column layout - no column breaks needed
                        return `
                            <article class="newsletter-article">
                                <header class="article-header">
                                    <h3 class="article-title">${event.title || 'Faculty Event'}</h3>
                                    <div class="article-date">${new Date(event.eventDate).toLocaleDateString('en-US', {
                                        day: 'numeric',
                                        month: 'short', 
                                        year: 'numeric'
                                    })}</div>
                                </header>
                                
                                <div class="article-content">
                                    <p class="article-text">
                                        <span class="drop-cap">${(event.title || 'Event')[0]}</span>${(event.title || 'Event').slice(1)} was organized on ${new Date(event.eventDate).toLocaleDateString('en-US', {
                                            day: 'numeric',
                                            month: 'long', 
                                            year: 'numeric'
                                        })} by <strong>${event.createdBy?.name || 'Faculty Member'}</strong>${event.createdBy?.designation ? `, ${event.createdBy.designation.title}` : ''}${event.createdBy?.department ? `, Dept. of ${event.createdBy.department.name}` : ''}. 
                                    </p>
                                    
                                    ${event.documentContent && event.documentContent.length > 0 ? 
                                        event.documentContent
                                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                                            .map(content => {
                                                switch(content.type) {
                                                    case 'title':
                                                        return `<h4 class="document-title">${content.content}</h4>`;
                                                    case 'description':
                                                        return `<p class="document-description">${content.content}</p>`;
                                                    case 'date':
                                                        return `<p class="document-date"><strong>Date:</strong> ${content.content}</p>`;
                                                    case 'teacher':
                                                        return `<p class="document-teacher"><strong>Faculty:</strong> ${content.content}</p>`;
                                                    case 'student':
                                                        return `<p class="document-student"><strong>Students:</strong> ${content.content}</p>`;
                                                    case 'small':
                                                        return `<p class="document-small">${content.content}</p>`;
                                                    case 'image':
                                                        if (content.imageUrls && content.imageUrls.length > 0) {
                                                            return `<div class="document-images">
                                                                ${content.imageUrls.map((imgUrl, idx) => {
                                                                    console.log('🔍 HOD Processing imageUrl:', imgUrl, 'Type:', typeof imgUrl);
                                                                    // Handle both full paths and filenames
                                                                    const imageSrc = (imgUrl.startsWith('/uploads/') || imgUrl.includes('/uploads/')) ? imgUrl : `/uploads/teacher-events/${imgUrl}`;
                                                                    console.log('🔗 HOD Final imageSrc:', imageSrc);
                                                                    return `
                                                                        <figure class="document-figure">
                                                                            <img src="${imageSrc}" 
                                                                                 alt="Event Image ${idx + 1}" 
                                                                                 class="document-image"
                                                                                 onload="console.log('✅ Document image loaded: ${imageSrc}')"
                                                                                 onerror="console.warn('❌ Document image failed: ${imageSrc}'); this.parentElement.remove();">
                                                                            ${content.content ? `<figcaption class="document-caption">${content.content}</figcaption>` : ''}
                                                                        </figure>
                                                                    `;
                                                                }).join('')}
                                                            </div>`;
                                                        } else if (content.imageUrl) {
                                                            console.log('🔍 HOD Processing single imageUrl:', content.imageUrl, 'Type:', typeof content.imageUrl);
                                                            // Handle both full paths and filenames
                                                            const imageSrc = (content.imageUrl.startsWith('/uploads/') || content.imageUrl.includes('/uploads/')) ? content.imageUrl : `/uploads/teacher-events/${content.imageUrl}`;
                                                            console.log('🔗 HOD Final single imageSrc:', imageSrc);
                                                            return `<div class="document-images">
                                                                <figure class="document-figure">
                                                                    <img src="${imageSrc}" 
                                                                         alt="Event Image" 
                                                                         class="document-image"
                                                                         onload="console.log('✅ Document image loaded: ${imageSrc}')"
                                                                         onerror="console.warn('❌ Document image failed: ${imageSrc}'); this.parentElement.remove();">
                                                                    ${content.content ? `<figcaption class="document-caption">${content.content}</figcaption>` : ''}
                                                                </figure>
                                                            </div>`;
                                                        }
                                                        return '';
                                                    default:
                                                        return `<p class="document-content">${content.content}</p>`;
                                                }
                                            }).join('') 
                                        : (event.description ? `
                                            <p class="article-description">
                                                <strong>Event Description:</strong> ${event.description}
                                            </p>
                                        ` : '')
                                    }
                                    
                                    ${event.outcome ? `
                                        <p class="article-outcome">
                                            <strong>Event Outcome:</strong> ${event.outcome}
                                        </p>
                                    ` : ''}
                                    
                                    ${event.teachersInvolved?.length > 0 ? `
                                        <p class="article-teachers">
                                            <strong>Collaborating Faculty:</strong> ${event.teachersInvolved.map(t => t.name).join(', ')}.
                                        </p>
                                    ` : ''}
                                    
                                    ${event.studentsInvolved?.length > 0 ? `
                                        <p class="article-students">
                                            <strong>Student Participation:</strong> This event engaged ${event.studentsInvolved.length} students. The participating students demonstrated exceptional performance and enthusiasm.
                                        </p>
                                    ` : ''}
                                    
                                    <p class="article-conclusion">
                                        This initiative reflects our department's commitment to academic excellence and practical learning, contributing to the holistic development of our students and faculty.
                                    </p>
                                    
                                    ${event.studentsInvolved?.length > 0 ? `
                                        <div class="participants-box">
                                            <strong>Student Participants (${event.studentsInvolved.length}):</strong><br>
                                            ${event.studentsInvolved.map(student => 
                                                `<span class="participant-name">${student.name}${student.usn ? ` (${student.usn})` : student.rollNumber ? ` (${student.rollNumber})` : ''}</span>`
                                            ).join(', ')}
                                        </div>
                                    ` : ''}
                                    
                                    ${event.teachersInvolved?.length > 0 ? `
                                        <div class="teachers-box">
                                            <strong>Faculty Participants (${event.teachersInvolved.length}):</strong><br>
                                            ${event.teachersInvolved.map(teacher => 
                                                `<span class="teacher-name">${teacher.name}${teacher.designation ? ` (${teacher.designation.title})` : ''}</span>`
                                            ).join(', ')}
                                        </div>
                                    ` : ''}
                                </div>
                            </article>
                        `;
                    }).join('')}
                </div>
            </div>
            
            ${sortedEvents.length === 0 ? `
                <div class="newsletter-section">
                    <div class="no-events-message">
                        <h3>No Faculty Events</h3>
                        <p>No faculty events were recorded during the specified period.</p>
                    </div>
                </div>
            ` : ''}
            
            <!-- PDF Footer -->
            <div class="pdf-newsletter-footer">
                <div style="margin-bottom: 0.5rem;">
                    <strong>${departmentName}</strong><br>
                    Faculty Events & Activities Newsletter
                </div>
                <div>
                    Generated on ${new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })} | Academic Management System
                </div>
            </div>
        </div>
    `;
}

function addNewsletterActions() {
    const reportContent = document.getElementById('reportContent');
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;';
    actionsDiv.innerHTML = `
        <button id="printNewsletterBtn" class="btn btn-secondary">
            <i class="fas fa-print"></i> Print Newsletter
        </button>
        <button id="exportNewsletterBtn" class="btn btn-primary">
            <i class="fas fa-download"></i> Export as HTML
        </button>
    `;
    
    reportContent.appendChild(actionsDiv);
    
    // Add event listeners
    document.getElementById('printNewsletterBtn').addEventListener('click', printNewsletter);
    document.getElementById('exportNewsletterBtn').addEventListener('click', exportNewsletter);
}

function printNewsletter() {
    const newsletter = document.getElementById('newsletter');
    const originalContents = document.body.innerHTML;
    const printContents = newsletter.outerHTML;
    
    document.body.innerHTML = `
        <html>
            <head>
                <title>Department Newsletter</title>
                <link rel="stylesheet" href="/css/hod.css">
                <style>
                    body { margin: 0; padding: 20px; font-family: 'Segoe UI', sans-serif; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                ${printContents}
            </body>
        </html>
    `;
    
    window.print();
    
    // Restore original content
    setTimeout(() => {
        document.body.innerHTML = originalContents;
        // Re-initialize event listeners
        initializeEventListeners();
    }, 1000);
}

function exportNewsletter() {
    const newsletter = document.getElementById('newsletter');
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Department Newsletter</title>
    <link rel="stylesheet" href="/css/hod.css">
    <style>
        body { margin: 0; padding: 20px; font-family: 'Segoe UI', sans-serif; background: #f8fafc; }
        .newsletter-container { margin: 0 auto; max-width: 800px; }
    </style>
</head>
<body>
    ${newsletter.outerHTML}
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `department-newsletter-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Newsletter exported successfully!', 'success');
}

// Approval Modal Functions
function showApprovalModal(id, type, action) {
    currentApprovalItem = { id, type, action };
    
    const modal = document.getElementById('approvalModal');
    const title = document.getElementById('approvalModalTitle');
    const details = document.getElementById('approvalDetails');
    
    title.textContent = `${action === 'approve' ? 'Approve' : 'Reject'} ${type}`;
    details.innerHTML = `<p>Loading ${type} details...</p>`;
    
    modal.style.display = 'block';
    
    // Load item details
    loadApprovalItemDetails(id, type);
}

async function loadApprovalItemDetails(id, type) {
    try {
        let response;
        if (type === 'club') {
            response = await api.getClub(id);
        } else if (type === 'event') {
            response = await api.getEvent(id);
        }
        
        const details = document.getElementById('approvalDetails');
        const item = response.data;
        
        if (type === 'club') {
            details.innerHTML = `
                <div class="approval-details">
                    <h4>${item.name}</h4>
                    <p><strong>Description:</strong> ${item.description}</p>
                    <p><strong>Mentor:</strong> ${item.mentor?.name || 'Not assigned'}</p>
                    <p><strong>Category:</strong> ${item.category || 'General'}</p>
                    <p><strong>Proposed Date:</strong> ${new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
            `;
        } else if (type === 'event') {
            details.innerHTML = `
                <div class="approval-details">
                    <h4>${item.title}</h4>
                    <p><strong>Description:</strong> ${item.description}</p>
                    <p><strong>Type:</strong> ${item.type}</p>
                    <p><strong>Event Date:</strong> ${new Date(item.eventDate).toLocaleDateString()}</p>
                    <p><strong>Organizer:</strong> ${item.organizer?.name || 'Unknown'}</p>
                    ${item.budget ? `<p><strong>Budget:</strong> ₹${item.budget.toLocaleString()}</p>` : ''}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading item details:', error);
        document.getElementById('approvalDetails').innerHTML = '<p>Error loading details.</p>';
    }
}

function closeApprovalModal() {
    document.getElementById('approvalModal').style.display = 'none';
    document.getElementById('approvalComments').value = '';
    currentApprovalItem = null;
}

async function handleApprove() {
    if (!currentApprovalItem) return;
    
    const comments = document.getElementById('approvalComments').value;
    
    try {
        if (currentApprovalItem.type === 'club') {
            await api.approveClub(currentApprovalItem.id, { comments });
        } else if (currentApprovalItem.type === 'event') {
            await api.approveEvent(currentApprovalItem.id, { comments });
        }
        
        closeApprovalModal();
        loadDashboardStats();
        loadPendingApprovals();
        showNotification(`${currentApprovalItem.type} approved successfully!`, 'success');
    } catch (error) {
        console.error('Error approving item:', error);
        showNotification('Error approving item: ' + error.message, 'error');
    }
}

async function handleReject() {
    if (!currentApprovalItem) return;
    
    const comments = document.getElementById('approvalComments').value;
    
    if (!comments.trim()) {
        alert('Please provide a reason for rejection.');
        return;
    }
    
    try {
        if (currentApprovalItem.type === 'club') {
            await api.rejectClub(currentApprovalItem.id, { comments });
        } else if (currentApprovalItem.type === 'event') {
            await api.rejectEvent(currentApprovalItem.id, { comments });
        }
        
        closeApprovalModal();
        loadDashboardStats();
        loadPendingApprovals();
        showNotification(`${currentApprovalItem.type} rejected.`, 'info');
    } catch (error) {
        console.error('Error rejecting item:', error);
        showNotification('Error rejecting item: ' + error.message, 'error');
    }
}

// Utility Functions
async function viewItemDetails(id, type) {
    try {
        let item;
        if (type === 'club') {
            const response = await api.getClubs();
            item = response.data?.find(club => club._id === id);
        } else if (type === 'event') {
            const response = await api.getEvents();
            item = response.data?.find(event => event._id === id);
        }
        
        if (!item) {
            alert('Item not found');
            return;
        }
        
        // Create a detailed view modal or alert
        const details = type === 'club' 
            ? `Club: ${item.name}\nDescription: ${item.description}\nMentor: ${item.mentor?.name || 'N/A'}\nStatus: ${item.status}\nCreated: ${new Date(item.createdAt).toLocaleDateString()}`
            : `Event: ${item.title}\nDescription: ${item.description}\nType: ${item.type}\nDate: ${new Date(item.eventDate).toLocaleDateString()}\nBudget: ₹${item.budget?.toLocaleString() || 'N/A'}\nOrganizer: ${item.organizer?.name || 'N/A'}\nStatus: ${item.status}`;
            
        alert(details);
    } catch (error) {
        console.error('Error loading item details:', error);
        alert('Error loading details');
    }
}

// Teacher Events Management
async function loadTeacherEvents() {
    try {
        console.log('🔍 HOD Loading teacher events...');
        const response = await api.request('/teacher-events');
        console.log('📋 Teacher events response:', response);
        
        if (response.success) {
            const events = response.data;
            displayTeacherEvents(events);
            populateTeacherFilter(events);
        }
    } catch (error) {
        console.error('Error loading teacher events:', error);
        document.getElementById('teacherEventsList').innerHTML = '<p class="error">Error loading teacher events</p>';
    }
}

function displayTeacherEvents(events) {
    const container = document.getElementById('teacherEventsList');
    
    if (events.length === 0) {
        container.innerHTML = '<p class="no-data">No teacher events found</p>';
        return;
    }

    const eventsHtml = events.map(event => `
        <div class="event-card" data-event-id="${event._id}">
            <div class="event-header">
                <h3>${event.title}</h3>
                <span class="event-status ${event.status}">${event.status}</span>
            </div>
            
            <div class="event-details">
                <p class="event-description">${event.description?.substring(0, 150)}${event.description?.length > 150 ? '...' : ''}</p>
                
                <div class="event-meta">
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <span><strong>Date:</strong> ${new Date(event.eventDate).toLocaleDateString()}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <span><strong>Created by:</strong> ${event.createdBy?.name || 'Unknown'}</span>
                    </div>
                    ${event.studentsInvolved?.length > 0 ? `
                        <div class="meta-item">
                            <i class="fas fa-user-graduate"></i>
                            <span><strong>${event.studentsInvolved.length}</strong> students involved</span>
                        </div>
                    ` : ''}
                    ${event.teachersInvolved?.length > 0 ? `
                        <div class="meta-item">
                            <i class="fas fa-chalkboard-teacher"></i>
                            <span><strong>${event.teachersInvolved.length}</strong> teachers involved</span>
                        </div>
                    ` : ''}
                    ${event.images?.length > 0 ? `
                        <div class="meta-item">
                            <i class="fas fa-images"></i>
                            <span><strong>${event.images.length}</strong> images</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="event-actions">
                <button class="btn btn-view" onclick="viewTeacherEvent('${event._id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-edit" onclick="editTeacherEvent('${event._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-delete" onclick="deleteTeacherEvent('${event._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = eventsHtml;
}

function populateTeacherFilter(events) {
    const filterSelect = document.getElementById('teacherEventCreatedByFilter');
    
    // Get unique teachers
    const uniqueTeachers = [...new Map(events.map(event => 
        event.createdBy ? [event.createdBy._id, event.createdBy] : null
    ).filter(Boolean)).values()];
    
    const optionsHtml = uniqueTeachers.map(teacher => 
        `<option value="${teacher._id}">${teacher.name}</option>`
    ).join('');
    
    filterSelect.innerHTML = '<option value="">All Teachers</option>' + optionsHtml;
}

function searchTeacherEvents() {
    const searchTerm = document.getElementById('teacherEventSearch').value.toLowerCase();
    const eventCards = document.querySelectorAll('.event-card');
    
    eventCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('.event-description').textContent.toLowerCase();
        const creator = card.querySelector('.meta-item span').textContent.toLowerCase();
        
        const matches = title.includes(searchTerm) || 
                       description.includes(searchTerm) || 
                       creator.includes(searchTerm);
        
        card.style.display = matches ? 'block' : 'none';
    });
}

// Teacher Event Management Functions
async function createTeacherEvent() {
    try {
        // Ensure teacher functionality is available and properly initialized
        if (!window.teacherDashboard) {
            console.log('🔄 Re-initializing teacher functionality...');
            initializeTeacherFunctionality();
        }
        
        // Double-check the currentUser is set properly
        if (window.teacherDashboard && !window.teacherDashboard.currentUser) {
            const userForTeacher = {
                ...currentUser,
                id: currentUser._id || currentUser.id,
                _id: currentUser._id || currentUser.id
            };
            window.teacherDashboard.currentUser = userForTeacher;
            console.log('🔧 Fixed currentUser for teacher dashboard:', userForTeacher);
        }
        
        if (window.teacherDashboard && typeof window.teacherDashboard.showCreateEventModal === 'function') {
            // Set up success callback to reload HOD events
            const originalCallback = window.teacherDashboard.onEventCreated;
            window.teacherDashboard.onEventCreated = function(newEvent) {
                if (originalCallback) originalCallback.call(this, newEvent);
                loadTeacherEvents(); // Reload HOD events list
                showNotification('Teacher event created successfully!', 'success');
            };
            
            await window.teacherDashboard.showCreateEventModal();
        } else {
            console.error('Teacher functionality not available');
            showNotification('Teacher event functionality not available', 'error');
        }
    } catch (error) {
        console.error('Error opening create teacher event modal:', error);
        console.error('Error details:', error.stack);
        showNotification('Error opening create event form', 'error');
    }
}

// Teacher Event Actions
async function viewTeacherEvent(eventId) {
    try {
        console.log('🔍 HOD View Event - Starting for event:', eventId);
        
        // Ensure teacher functionality is available and properly initialized
        if (!window.teacherDashboard) {
            console.log('🔄 Re-initializing teacher functionality for view...');
            initializeTeacherFunctionality();
        }
        
        // Double-check the currentUser is set properly
        if (window.teacherDashboard && !window.teacherDashboard.currentUser) {
            const userForTeacher = {
                ...currentUser,
                id: currentUser._id || currentUser.id,
                _id: currentUser._id || currentUser.id
            };
            window.teacherDashboard.currentUser = userForTeacher;
            console.log('🔧 Fixed currentUser for teacher dashboard (view):', userForTeacher);
        }
        
        // Use the teacher view functionality
        if (window.teacherDashboard && typeof window.teacherDashboard.viewEvent === 'function') {
            console.log('✅ Using teacher dashboard viewEvent method');
            await window.teacherDashboard.viewEvent(eventId);
        } else {
            console.warn('⚠️ Teacher viewEvent method not available, using fallback');
            // Enhanced fallback with proper modal display
            const response = await api.request(`/teacher-events/${eventId}`);
            if (response.success) {
                showEventDetailsModal(response.data);
            }
        }
    } catch (error) {
        console.error('Error viewing teacher event:', error);
        console.error('Error details:', error.stack);
        showNotification('Error loading event details', 'error');
    }
}

// Enhanced fallback modal for viewing events
function showEventDetailsModal(event) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>Event Details - ${event.title}</h3>
                <button class="close" data-close-modal>&times;</button>
            </div>
            <div class="modal-body">
                <div style="background: white; padding: 24px; line-height: 1.6;">
                    <h1 style="text-align: center; margin-bottom: 20px; color: #2d3748;">${event.title}</h1>
                    
                    <div style="margin-bottom: 20px; padding: 12px; background: #f7fafc; border-left: 4px solid #3182ce; border-radius: 4px;">
                        <strong>📅 Event Date:</strong> ${new Date(event.eventDate).toLocaleDateString()}
                    </div>
                    
                    ${event.description ? `<div style="margin-bottom: 16px;"><strong>Description:</strong><br>${event.description}</div>` : ''}
                    
                    ${event.createdBy?.name ? `<div style="margin-bottom: 12px;"><strong>Created by:</strong> ${event.createdBy.name}</div>` : ''}
                    
                    ${event.teachersInvolved?.length ? `<div style="margin-bottom: 12px;"><strong>Teachers Involved:</strong> ${event.teachersInvolved.map(t => t.name).join(', ')}</div>` : ''}
                    
                    ${event.studentsInvolved?.length ? `<div style="margin-bottom: 12px;"><strong>Students Involved:</strong> ${event.studentsInvolved.map(s => `${s.name} (${s.usn || s.rollNumber})`).join(', ')}</div>` : ''}
                    
                    ${event.outcome ? `<div style="margin-bottom: 16px;"><strong>Outcome:</strong><br>${event.outcome}</div>` : ''}
                    
                    ${event.images?.length ? `
                        <div style="margin-bottom: 16px;">
                            <strong>Event Images (${event.images.length}):</strong>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                                ${event.images.map(image => `
                                    <img src="${image.fileUrl}" alt="${image.fileName}" 
                                         style="max-width: 150px; height: auto; border-radius: 4px; border: 1px solid #d1d5db; cursor: pointer;"
                                         onclick="window.open('${image.fileUrl}', '_blank')"
                                         title="${image.fileName}">
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
                        <strong>Status:</strong> ${event.status} | 
                        <strong>Created:</strong> ${new Date(event.createdAt).toLocaleDateString()} |
                        <strong>Last Updated:</strong> ${new Date(event.updatedAt).toLocaleDateString()}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="editTeacherEvent('${event._id}')">
                    <i class="fas fa-edit"></i> Edit Event
                </button>
                <button class="btn btn-secondary" data-close-modal>Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add close functionality
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.hasAttribute('data-close-modal')) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    });
}

async function editTeacherEvent(eventId) {
    try {
        console.log('🔧 HOD Edit Event - Starting for event:', eventId);
        
        // Close any existing modals first
        const existingModals = document.querySelectorAll('.modal.show');
        existingModals.forEach(modal => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 100);
        });
        
        // Ensure teacher functionality is available and properly initialized
        if (!window.teacherDashboard) {
            console.log('🔄 Re-initializing teacher functionality for edit...');
            initializeTeacherFunctionality();
        }
        
        // Double-check the currentUser is set properly
        if (window.teacherDashboard && !window.teacherDashboard.currentUser) {
            const userForTeacher = {
                ...currentUser,
                id: currentUser._id || currentUser.id,
                _id: currentUser._id || currentUser.id
            };
            window.teacherDashboard.currentUser = userForTeacher;
            console.log('🔧 Fixed currentUser for teacher dashboard (edit):', userForTeacher);
        }
        
        if (window.teacherDashboard && typeof window.teacherDashboard.editEvent === 'function') {
            console.log('✅ Using teacher dashboard editEvent method');
            
            // Set up success callback to reload HOD events
            const originalCallback = window.teacherDashboard.onEventUpdated;
            window.teacherDashboard.onEventUpdated = function(updatedEvent) {
                if (originalCallback) originalCallback.call(this, updatedEvent);
                loadTeacherEvents(); // Reload HOD events list
                showNotification('Teacher event updated successfully!', 'success');
            };
            
            await window.teacherDashboard.editEvent(eventId);
        } else {
            console.error('Teacher edit functionality not available');
            console.error('Available methods:', Object.getOwnPropertyNames(window.teacherDashboard || {}));
            showNotification('Teacher event editing not available', 'error');
        }
    } catch (error) {
        console.error('Error editing teacher event:', error);
        console.error('Error details:', error.stack);
        showNotification('Error opening event for editing', 'error');
    }
}

async function deleteTeacherEvent(eventId) {
    // Enhanced confirmation dialog
    const confirmMessage = `Are you sure you want to delete this teacher event?

⚠️ This action will:
• Permanently remove the event from the database
• Delete all associated images and files
• Remove all participant records
• Cannot be undone

Click OK to proceed with deletion.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        console.log('🗑️ HOD Delete Event - Starting deletion for event:', eventId);
        
        // Show loading notification
        showNotification('Deleting teacher event...', 'info');
        
        const response = await api.request(`/teacher-events/${eventId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            console.log('✅ Teacher event deleted successfully');
            showNotification('Teacher event deleted successfully!', 'success');
            
            // Close any open modals showing this event
            const existingModals = document.querySelectorAll('.modal.show');
            existingModals.forEach(modal => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            });
            
            // Reload the list
            loadTeacherEvents();
        } else {
            throw new Error(response.message || 'Delete request failed');
        }
    } catch (error) {
        console.error('Error deleting teacher event:', error);
        console.error('Error details:', error.stack);
        
        const errorMessage = error.message?.includes('Not authorized') 
            ? 'You are not authorized to delete this event'
            : error.message?.includes('not found')
            ? 'Event not found or already deleted'  
            : 'Failed to delete teacher event. Please try again.';
            
        showNotification(errorMessage, 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        info: '#4299e1'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        background: ${colors[type] || '#718096'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        api.clearToken();
        window.location.href = '/';
    }
}