let currentUser = null;

// Initialize Student Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated and has student role
    if (!api.token) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await api.getMe();
        currentUser = response.data;

        if (currentUser.role !== 'student') {
            UI.toast('Access denied. Student privileges required.', 'error');
            api.clearToken();
            window.location.href = '/';
            return;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        api.clearToken();
        window.location.href = '/';
        return;
    }

    try {
        initializeStudentDashboard();
    } catch (error) {
        console.error('Dashboard init error (staying on page):', error);
        UI.toast('Dashboard failed to initialize — see console.', 'error');
    }
});

function initializeStudentDashboard() {
    // Display student info
    const studentName = currentUser.name;
    const semester = currentUser.semester ? `Semester ${currentUser.semester}` : '';
    const usn = currentUser.usn || currentUser.tempUSN || '';
    
    document.getElementById('studentInfo').textContent = 
        `${studentName} ${semester ? '| ' + semester : ''} ${usn ? '| ' + usn : ''}`;
    
    // Load dashboard data
    loadDashboardStats();
    loadRecentNotifications();
    loadUpcomingEvents();
    loadProfileInfo();
    
    // Setup event listeners
    setupEventListeners();
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
    
    // Action buttons
    document.getElementById('editProfileBtn').addEventListener('click', showEditProfileModal);
    document.getElementById('addProjectBtn').addEventListener('click', showAddProjectModal);
    document.getElementById('uploadCertificateBtn').addEventListener('click', showUploadCertificateModal);
    document.getElementById('addInternshipBtn').addEventListener('click', showAddInternshipModal);
    document.getElementById('addEventBtn').addEventListener('click', showAddEventModal);
    
    // Modal close buttons
    document.getElementById('closeProfileModal').addEventListener('click', closeEditProfileModal);
    document.getElementById('cancelProfileBtn').addEventListener('click', closeEditProfileModal);
    document.getElementById('closeCertificateModal').addEventListener('click', closeCertificateModal);
    document.getElementById('cancelCertificateBtn').addEventListener('click', closeCertificateModal);
    document.getElementById('closeInternshipModal').addEventListener('click', closeInternshipModal);
    document.getElementById('cancelInternshipBtn').addEventListener('click', closeInternshipModal);
    document.getElementById('closeProjectModal').addEventListener('click', closeProjectModal);
    document.getElementById('cancelProjectBtn').addEventListener('click', closeProjectModal);
    document.getElementById('closeEventModal').addEventListener('click', closeEventModal);
    document.getElementById('cancelEventBtn').addEventListener('click', closeEventModal);
    
    // Form submissions
    document.getElementById('editProfileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('uploadCertificateForm').addEventListener('submit', handleCertificateUpload);
    document.getElementById('addInternshipForm').addEventListener('submit', handleInternshipAdd);
    document.getElementById('addProjectForm').addEventListener('submit', handleProjectAdd);
    document.getElementById('addEventForm').addEventListener('submit', handleEventAdd);
    
    // File input handlers
    document.getElementById('profileImage').addEventListener('change', handleImagePreview);
    document.getElementById('currentlyWorking').addEventListener('change', handleCurrentlyWorkingChange);
    
    // Modal-specific handlers
    setupModalHandlers();
    
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
        case 'dashboard':
            loadDashboardStats();
            loadRecentNotifications();
            loadUpcomingEvents();
            break;
        case 'profile':
            loadProfileInfo();
            break;
        case 'clubs':
            loadMyClubs();
            break;
        case 'events':
            loadUpcomingEventsList();
            break;
        case 'projects':
            loadMyProjects();
            break;
        case 'certificates':
            loadMyCertificates();
            break;
        case 'internships':
            loadMyInternships();
            break;
    }
}

function handleTabSwitch(e) {
    const tabName = e.target.getAttribute('data-tab');
    const tabContainer = e.target.closest('.section');
    
    // Update active tab
    tabContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // Show corresponding content
    tabContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Handle different tab types
    if (tabContainer.id === 'clubsSection') {
        document.getElementById(`${tabName}ClubsTab`).classList.add('active');
        switch(tabName) {
            case 'my': loadMyClubs(); break;
            case 'available': loadAvailableClubs(); break;
            case 'pending': loadPendingClubs(); break;
        }
    } else if (tabContainer.id === 'eventsSection') {
        document.getElementById(`${tabName}EventsTab`).classList.add('active');
        switch(tabName) {
            case 'upcoming': loadUpcomingEventsList(); break;
            case 'my': loadMyEventParticipations(); break;
        }
    }
}

function setupModalHandlers() {
    // Show/hide team details based on participation type
    const participationTypeSelect = document.getElementById('participationType');
    if (participationTypeSelect) {
        participationTypeSelect.addEventListener('change', function() {
            const teamSection = document.getElementById('teamDetailsSection');
            if (this.value === 'team') {
                teamSection.style.display = 'block';
                document.getElementById('teamName').required = true;
                document.getElementById('teamSize').required = true;
            } else {
                teamSection.style.display = 'none';
                document.getElementById('teamName').required = false;
                document.getElementById('teamSize').required = false;
            }
        });
    }

    // Handle project type changes for mentor requirement
    const projectTypeSelect = document.getElementById('projectType');
    if (projectTypeSelect) {
        projectTypeSelect.addEventListener('change', handleProjectTypeChange);
    }

    // Handle teacher involvement checkbox for personal projects
    const hasTeacherMentorCheckbox = document.getElementById('hasTeacherMentor');
    if (hasTeacherMentorCheckbox) {
        hasTeacherMentorCheckbox.addEventListener('change', function() {
            const mentorSection = document.getElementById('mentorSection');
            if (this.checked) {
                mentorSection.style.display = 'block';
                loadTeachersForMentor(); // Load teachers when needed
            } else {
                mentorSection.style.display = 'none';
                document.getElementById('teacherMentor').required = false;
            }
        });
    }
    
    // Handle team choice radio buttons for mini/major projects
    const teamChoiceRadios = document.querySelectorAll('input[name="teamChoice"]');
    teamChoiceRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const teamMembersList = document.getElementById('teamMembersList');
            if (this.value === 'team') {
                teamMembersList.style.display = 'block';
            } else {
                teamMembersList.style.display = 'none';
                // Clear selected team members when switching to solo
                selectedTeamMembers = [];
                updateSelectedTeamMembersDisplay();
                updateTeamSize();
            }
        });
    });
    
    // Handle add team member button
    const addTeamMemberBtn = document.getElementById('addTeamMemberBtn');
    if (addTeamMemberBtn) {
        addTeamMemberBtn.addEventListener('click', addTeamMember);
    }
    
    // Handle budget request checkbox
    const requestBudgetCheckbox = document.getElementById('requestBudget');
    if (requestBudgetCheckbox) {
        requestBudgetCheckbox.addEventListener('change', function() {
            const budgetSection = document.getElementById('budgetRequestSection');
            if (this.checked) {
                budgetSection.style.display = 'block';
                // Make budget fields required when requesting budget
                document.getElementById('budgetAmount').required = true;
                document.getElementById('budgetCategory').required = true;
                document.getElementById('budgetJustification').required = true;
                document.getElementById('budgetDocument').required = true;
            } else {
                budgetSection.style.display = 'none';
                // Remove required when not requesting budget
                document.getElementById('budgetAmount').required = false;
                document.getElementById('budgetCategory').required = false;
                document.getElementById('budgetJustification').required = false;
                document.getElementById('budgetDocument').required = false;
            }
        });
    }
}

function handleProjectTypeChange() {
    const projectType = document.getElementById('projectType').value;
    const mentorSection = document.getElementById('mentorSection');
    const teacherInvolvementSection = document.getElementById('teacherInvolvementSection');
    const teamMembersSection = document.getElementById('teamMembersSection');
    const teacherMentor = document.getElementById('teacherMentor');
    const hasTeacherMentorCheckbox = document.getElementById('hasTeacherMentor');
    
    if (projectType === 'mini' || projectType === 'major') {
        // Mini/Major projects can have mentor and team members
        teacherInvolvementSection.style.display = 'none';
        mentorSection.style.display = 'block';
        teamMembersSection.style.display = 'block';
        teacherMentor.required = false; // Mentor is optional
        hasTeacherMentorCheckbox.checked = false; // Reset checkbox
        loadTeachersForMentor();
        loadStudentsForTeam();
    } else if (projectType === 'personal') {
        // Personal projects - can have optional mentor and team members
        teacherInvolvementSection.style.display = 'block';
        mentorSection.style.display = 'none';
        teamMembersSection.style.display = 'block'; // Allow teams for personal projects too
        teacherMentor.required = false;
        hasTeacherMentorCheckbox.checked = false; // Reset checkbox
        loadStudentsForTeam(); // Load students for team selection
    } else {
        // No project type selected
        teacherInvolvementSection.style.display = 'none';
        mentorSection.style.display = 'none';
        mentorRequired.style.display = 'none';
        teacherMentor.required = false;
    }
}

async function loadTeachersForMentor() {
    const teacherSelect = document.getElementById('teacherMentor');
    if (!teacherSelect) return;
    
    try {
        // Show loading state
        teacherSelect.innerHTML = '<option value="">Loading teachers...</option>';
        
        // Remove any existing notes
        let existingNote = teacherSelect.parentElement.querySelector('.teacher-note');
        if (existingNote) existingNote.remove();
        
        // Load real teachers from college (any department can be mentor)
        const response = await api.getAllTeachers();
        const teachers = response.data || [];
        
        if (teachers.length === 0) {
            teacherSelect.innerHTML = '<option value="">No teachers found in college</option>';
            
            const noteElement = document.createElement('small');
            noteElement.className = 'text-warning teacher-note';
            noteElement.textContent = 'No teachers found in college. Please contact admin.';
            teacherSelect.parentElement.appendChild(noteElement);
            return;
        }
        
        // Build options with real teacher data
        let optionsHTML = '<option value="">Select a Teacher Mentor</option>';
        teachers.forEach(teacher => {
            const designation = teacher.designation?.title || 'Teacher';
            const department = teacher.department ? ` (${teacher.department.code})` : '';
            optionsHTML += `<option value="${teacher._id}">${teacher.name} - ${designation}${department}</option>`;
        });
        
        teacherSelect.innerHTML = optionsHTML;
        
        // Add success note
        const noteElement = document.createElement('small');
        noteElement.className = 'text-success teacher-note';
        noteElement.textContent = `Found ${teachers.length} teacher(s) in your department.`;
        teacherSelect.parentElement.appendChild(noteElement);
        
        console.log('✅ Loaded teachers successfully:', teachers);
        
    } catch (error) {
        console.error('❌ Error loading teachers:', error);
        
        // Fallback to placeholder data
        teacherSelect.innerHTML = '<option value="">Select a Teacher Mentor</option>';
        
        // Show fallback teachers if API fails
        const placeholderTeachers = [
            { _id: 'temp-teacher-1', name: 'Dr. Rajesh Kumar', designation: 'Professor' },
            { _id: 'temp-teacher-2', name: 'Prof. Priya Sharma', designation: 'Associate Professor' },
            { _id: 'temp-teacher-3', name: 'Dr. Amit Singh', designation: 'Assistant Professor' },
            { _id: 'temp-teacher-4', name: 'Ms. Kavitha Rao', designation: 'Lecturer' }
        ];
        
        let optionsHTML = '<option value="">Select a Teacher Mentor</option>';
        placeholderTeachers.forEach(teacher => {
            optionsHTML += `<option value="${teacher._id}">${teacher.name} - ${teacher.designation}</option>`;
        });
        
        teacherSelect.innerHTML = optionsHTML;
        
        // Add error note
        let existingNote = teacherSelect.parentElement.querySelector('.teacher-note');
        if (existingNote) existingNote.remove();
        
        const noteElement = document.createElement('small');
        noteElement.className = 'text-warning teacher-note';
        noteElement.textContent = `API Error: Showing placeholder teachers. (${error.message})`;
        teacherSelect.parentElement.appendChild(noteElement);
    }
}

// Team member management functions
async function loadStudentsForTeam() {
    try {
        const response = await api.getAllStudents();
        const studentSelect = document.getElementById('teamMemberSelect');
        
        studentSelect.innerHTML = '<option value="">Select a team member...</option>';
        
        response.data.forEach(student => {
            const option = document.createElement('option');
            option.value = student._id;
            const department = student.department ? ` (${student.department.code})` : '';
            const semester = student.semester ? ` - Sem ${student.semester}` : '';
            option.textContent = `${student.name}${department}${semester}`;
            option.dataset.name = student.name;
            option.dataset.usn = student.usn || student.rollNumber || '';
            studentSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading students:', error);
        document.getElementById('teamMemberSelect').innerHTML = '<option value="">Error loading students</option>';
    }
}

let selectedTeamMembers = [];

function addTeamMember() {
    const select = document.getElementById('teamMemberSelect');
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption.value) return;
    
    const memberId = selectedOption.value;
    const memberName = selectedOption.dataset.name;
    const memberUSN = selectedOption.dataset.usn;
    
    // Check if already added
    if (selectedTeamMembers.find(member => member.id === memberId)) {
        showNotification('This student is already added to the team', 'warning');
        return;
    }
    
    // Add to selected members
    selectedTeamMembers.push({
        id: memberId,
        name: memberName,
        usn: memberUSN
    });
    
    // Update UI
    updateSelectedTeamMembersDisplay();
    updateTeamSize();
    
    // Reset select
    select.selectedIndex = 0;
}

function removeTeamMember(memberId) {
    selectedTeamMembers = selectedTeamMembers.filter(member => member.id !== memberId);
    updateSelectedTeamMembersDisplay();
    updateTeamSize();
}

function updateSelectedTeamMembersDisplay() {
    const container = document.getElementById('selectedTeamMembers');
    
    if (selectedTeamMembers.length === 0) {
        container.innerHTML = '<p style="color: #666;">No team members added yet</p>';
        return;
    }
    
    container.innerHTML = selectedTeamMembers.map(member => `
        <div class="team-member-tag">
            <span>${member.name} ${member.usn ? `(${member.usn})` : ''}</span>
            <button type="button" data-member-id="${member.id}" class="remove-member-btn">&times;</button>
        </div>
    `).join('');
    
    // Add event listeners for remove buttons
    container.querySelectorAll('.remove-member-btn').forEach(button => {
        button.addEventListener('click', function() {
            const memberId = this.dataset.memberId;
            removeTeamMember(memberId);
        });
    });
}

function updateTeamSize() {
    // Team size = 1 (current student) + selected team members
    const teamSize = 1 + selectedTeamMembers.length;
    document.getElementById('projectTeamSize').value = teamSize;
}

// Dashboard Statistics
async function loadDashboardStats() {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value);
    };
    try {
        const [clubs, projects, certs, participations] = await Promise.allSettled([
            api.request('/clubs'),
            api.request('/projects'),
            api.request('/certificates'),
            api.request('/event-participations')
        ]);

        const myId = String(currentUser?._id || currentUser?.id || '');
        const sameId = (ref) => {
            if (!ref) return false;
            const id = typeof ref === 'object' ? (ref._id || ref.id) : ref;
            return String(id) === myId;
        };

        let clubCount = 0;
        if (clubs.status === 'fulfilled' && clubs.value?.success) {
            clubCount = (clubs.value.data || []).filter(c =>
                (c.members || []).some(m => sameId(m.student) || sameId(m))
            ).length;
        }

        let projectCount = 0;
        if (projects.status === 'fulfilled' && projects.value?.success) {
            projectCount = (projects.value.data || []).filter(p =>
                sameId(p.createdBy) ||
                (p.teamMembers || []).some(m => sameId(m.student) || sameId(m))
            ).length;
        }

        let certCount = 0;
        if (certs.status === 'fulfilled' && certs.value?.success) {
            certCount = (certs.value.data || []).filter(c => sameId(c.owner)).length;
        }

        let eventCount = 0;
        if (participations.status === 'fulfilled' && participations.value?.success) {
            eventCount = (participations.value.data || []).filter(p => sameId(p.student)).length;
        }

        setText('myClubs', clubCount);
        setText('myEvents', eventCount);
        setText('myProjects', projectCount);
        setText('myCertificates', certCount);
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadRecentNotifications() {
    const notificationsList = document.getElementById('recentNotifications');
    
    // Placeholder notifications
    notificationsList.innerHTML = `
        <div class="notification-item">
            <h5>Welcome to the Student Dashboard!</h5>
            <p>Complete your profile to get started</p>
        </div>
        <div class="notification-item">
            <h5>New Features Available</h5>
            <p>You can now manage clubs, events, and projects</p>
        </div>
    `;
    
    // TODO: Load actual notifications when API is ready
}

async function loadUpcomingEvents() {
    const eventsList = document.getElementById('upcomingEvents');
    if (!eventsList) return;
    try {
        const response = await api.getEvents({ status: 'approved' });
        const events = (response.data || [])
            .filter(e => new Date(e.eventDate) >= new Date())
            .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
            .slice(0, 4);
        if (!events.length) {
            eventsList.innerHTML = '<p class="t-text-muted">No upcoming events.</p>';
            return;
        }
        eventsList.innerHTML = events.map(e => `
            <div class="event-item">
                <h5>${UI.escapeHtml(e.title)}</h5>
                <p>${UI.fmtDate(e.eventDate)} · ${UI.escapeHtml(e.venue || '')}</p>
            </div>
        `).join('');
    } catch (err) {
        eventsList.innerHTML = '<p class="form-error">Could not load events.</p>';
    }
}

async function loadProfileInfo() {
    const profileInfo = document.getElementById('profileInfo');
    
    profileInfo.innerHTML = `
        <h3>${currentUser.name}</h3>
        <div class="profile-details">
            <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${currentUser.email}</p>
            <p><i class="fas fa-id-card"></i> <strong>USN:</strong> ${currentUser.usn || currentUser.tempUSN || 'Not provided'}</p>
            <p><i class="fas fa-building"></i> <strong>Department:</strong> ${currentUser.department?.name || 'Not assigned'}</p>
            <p><i class="fas fa-calendar"></i> <strong>Semester:</strong> ${currentUser.semester || 'Not specified'}</p>
            ${currentUser.rollNumber ? `<p><i class="fas fa-hashtag"></i> <strong>Roll Number:</strong> ${currentUser.rollNumber}</p>` : ''}
            ${currentUser.contactNumber ? `<p><i class="fas fa-phone"></i> <strong>Contact:</strong> ${currentUser.contactNumber}</p>` : ''}
            ${currentUser.proctor ? `<p><i class="fas fa-user-tie"></i> <strong>Proctor:</strong> ${currentUser.proctor.name}</p>` : '<p><i class="fas fa-user-tie"></i> <strong>Proctor:</strong> <span class="text-muted">Not assigned</span></p>'}
            ${currentUser.classTeacher ? `<p><i class="fas fa-chalkboard-teacher"></i> <strong>Class Teacher:</strong> ${currentUser.classTeacher.name}</p>` : '<p><i class="fas fa-chalkboard-teacher"></i> <strong>Class Teacher:</strong> <span class="text-muted">Not assigned</span></p>'}
            <p><i class="fas fa-calendar-plus"></i> <strong>Joined:</strong> ${new Date(currentUser.createdAt).toLocaleDateString()}</p>
        </div>
    `;
}

// Placeholder functions for features we'll implement
async function loadMyClubs() {
    document.getElementById('myClubsList').innerHTML = '<p>No clubs joined yet. Join some clubs to see them here!</p>';
}

async function loadAvailableClubs() {
    const target = document.getElementById('availableClubsList');
    target.innerHTML = '<p class="t-text-muted">Loading available clubs...</p>';
    try {
        const response = await api.request('/clubs');
        const clubs = (response.data || []).filter(c => c.status === 'approved' && !c.isMember);
        if (clubs.length === 0) {
            target.innerHTML = '<p class="t-text-muted">No clubs available to join right now.</p>';
            return;
        }
        target.innerHTML = clubs.map(c => `
            <div class="club-card card">
                <div class="card-header">
                    <h5 class="card-title">${UI.escapeHtml(c.name)}</h5>
                    ${UI.statusBadge(c.status)}
                </div>
                ${c.purpose ? `<p>${UI.escapeHtml(c.purpose)}</p>` : ''}
                <p class="t-text-muted">
                    <i class="fas fa-user-tie"></i> ${UI.escapeHtml(c.primaryMentor?.name || 'No mentor')}
                    · <i class="fas fa-users"></i> ${c.memberCount || 0} members
                </p>
                <button class="btn btn-primary btn-sm" data-action="join-club" data-club-id="${c._id}">
                    <i class="fas fa-user-plus"></i> Join Club
                </button>
            </div>
        `).join('');
        target.querySelectorAll('button[data-action="join-club"]').forEach(btn => {
            btn.addEventListener('click', () => requestJoinClub(btn.dataset.clubId));
        });
    } catch (error) {
        console.error('Error loading available clubs:', error);
        target.innerHTML = '<p class="t-text-muted">Could not load clubs.</p>';
    }
}

async function loadPendingClubs() {
    const target = document.getElementById('pendingClubsList');
    target.innerHTML = '<p class="t-text-muted">Loading pending requests...</p>';
    try {
        const response = await api.request('/clubs');
        const myId = String(currentUser?._id || currentUser?.id || '');
        const pending = (response.data || []).filter(c =>
            (c.members || []).some(m => String(m.student?._id || m.student) === myId && m.status === 'pending')
        );
        if (pending.length === 0) {
            target.innerHTML = '<p class="t-text-muted">You have no pending club requests.</p>';
            return;
        }
        target.innerHTML = pending.map(c => `
            <div class="club-card card">
                <h5 class="card-title">${UI.escapeHtml(c.name)}</h5>
                <p class="t-text-muted">Awaiting mentor approval.</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading pending clubs:', error);
        target.innerHTML = '<p class="t-text-muted">Could not load pending requests.</p>';
    }
}

async function requestJoinClub(clubId) {
    try {
        const response = await api.joinClub(clubId);
        if (response.success) {
            UI.toast('Join request submitted! Awaiting mentor approval.', 'success');
            loadAvailableClubs();
            loadMyClubs?.();
            loadDashboardStats?.();
        } else {
            UI.toast('Could not join club: ' + (response.message || 'unknown error'), 'error');
        }
    } catch (error) {
        UI.toast('Could not join club: ' + error.message, 'error');
    }
}

async function loadUpcomingEventsList() {
    try {
        const response = await api.getEvents({ status: 'approved' });
        const events = response.data || [];
        const upcomingEvents = events
            .filter(event => new Date(event.eventDate) >= new Date())
            .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

        if (upcomingEvents.length === 0) {
            document.getElementById('upcomingEventsList').innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-calendar"></i></div><div>No upcoming college events.</div></div>';
            return;
        }

        document.getElementById('upcomingEventsList').innerHTML = upcomingEvents.map(event => `
            <div class="event-item card">
                <div class="card-header">
                    <h5 class="card-title">${UI.escapeHtml(event.title)}</h5>
                    ${UI.statusBadge(event.status)}
                </div>
                <p><strong>Type:</strong> ${UI.escapeHtml(event.eventType.replace(/-/g, ' '))} · <strong>Category:</strong> ${UI.escapeHtml(event.eventCategory)}</p>
                <p><strong>Date:</strong> ${UI.fmtDate(event.eventDate)} · ${UI.escapeHtml(event.startTime)}–${UI.escapeHtml(event.endTime)}</p>
                <p><strong>Venue:</strong> ${UI.escapeHtml(event.venue)}</p>
                ${event.description ? `<p>${UI.escapeHtml(event.description)}</p>` : ''}
                ${event.expectedParticipants ? `<p class="t-text-muted" style="font-size:.85rem"><i class="fas fa-users"></i> ${event.expectedParticipants} expected</p>` : ''}
            </div>
        `).join('');
        
        // Add event listeners for college event actions
        document.querySelectorAll('#upcomingEventsList .event-actions button').forEach(button => {
            button.addEventListener('click', function() {
                const action = this.dataset.action;
                const eventId = this.dataset.eventId;
                
                if (action === 'register') {
                    registerForEvent(eventId);
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading college events:', error);
        document.getElementById('upcomingEventsList').innerHTML = '<p>Error loading events.</p>';
    }
}

async function loadMyEvents() {
    document.getElementById('registeredEventsList').innerHTML = '<p>No events registered yet.</p>';
}

async function loadPastEvents() {
    document.getElementById('pastEventsList').innerHTML = '<p>No past events to show.</p>';
}

async function loadMyProjects() {
    try {
        const response = await api.getProjects();
        const projects = response.data || [];
        
        if (projects.length === 0) {
            document.getElementById('projectsList').innerHTML = '<p>No projects added yet. Add your first project!</p>';
            return;
        }
        
        document.getElementById('projectsList').innerHTML = projects.map(project => `
            <div class="project-card">
                <div class="project-header">
                    <div class="project-title-section">
                        <h4 class="project-title">${project.title}</h4>
                        <div class="project-badges">
                            <span class="project-type-badge ${project.projectType || 'unknown'}">${(project.projectType || 'project').toUpperCase()}</span>
                            ${!project.isCreator ? '<span class="team-project-badge">Team Project</span>' : ''}
                        </div>
                    </div>
                    <div class="project-status-section">
                        <span class="project-status status-${project.approvalStatus}">${(project.approvalStatus || 'pending').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        ${project.progress ? `<div class="progress-bar"><div class="progress-fill" style="width: ${project.progress.percentage || 0}%"></div></div>` : ''}
                    </div>
                </div>
                
                <div class="project-content">
                    <div class="project-details">
                        <div class="detail-row">
                            <span class="detail-label">Domain:</span>
                            <span class="detail-value">${project.domain}</span>
                        </div>
                        ${project.description ? `
                            <div class="detail-row description">
                                <span class="detail-label">Description:</span>
                                <span class="detail-value">${project.description}</span>
                            </div>
                        ` : ''}
                        
                        ${project.technicalDetails && project.technicalDetails.technologies && project.technicalDetails.technologies.length > 0 ? `
                            <div class="detail-row">
                                <span class="detail-label">Technologies:</span>
                                <div class="tech-tags">
                                    ${project.technicalDetails.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${project.teamMembers && project.teamMembers.length > 1 ? `
                            <div class="detail-row">
                                <span class="detail-label">Team Members:</span>
                                <div class="team-members-display">
                                    ${project.teamMembers.map(member => `
                                        <div class="team-member-card ${member.role === 'leader' ? 'leader' : 'member'}">
                                            <span class="member-name">${member.user.name}</span>
                                            <span class="member-role">${member.role === 'leader' ? 'Team Leader' : 'Member'}</span>
                                            ${member.user.usn ? `<span class="member-usn">${member.user.usn}</span>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${project.mentor ? `
                            <div class="detail-row mentor">
                                <span class="detail-label">Mentor:</span>
                                <div class="mentor-info">
                                    <span class="mentor-name">${project.mentor.name}</span>
                                    <span class="mentor-designation">${project.mentor.designation?.title || 'Teacher'}</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${project.approvalStatus && project.approvalStatus !== 'none' ? `
                            <div class="detail-row approval-status">
                                <span class="detail-label">Approval Status:</span>
                                <div class="approval-info">
                                    <span class="approval-status-badge status-${project.approvalStatus}">${project.approvalStatus.toUpperCase()}</span>
                                    ${project.approverName ? `<span class="approver-name">by ${project.approverName}</span>` : ''}
                                    ${project.approvalComments ? `<p class="approval-comments">${project.approvalComments}</p>` : ''}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="project-timeline">
                        <div class="timeline-item">
                            <i class="fas fa-play-circle"></i>
                            <span>Started: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}</span>
                        </div>
                        ${project.expectedEndDate ? `
                            <div class="timeline-item">
                                <i class="fas fa-flag-checkered"></i>
                                <span>Expected: ${new Date(project.expectedEndDate).toLocaleDateString()}</span>
                            </div>
                        ` : ''}
                        ${project.actualEndDate ? `
                            <div class="timeline-item completed">
                                <i class="fas fa-check-circle"></i>
                                <span>Completed: ${new Date(project.actualEndDate).toLocaleDateString()}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${project.githubUrl || project.liveUrl ? `
                        <div class="project-links">
                            ${project.githubUrl ? `<a href="${project.githubUrl}" target="_blank" class="project-link github"><i class="fab fa-github"></i> Repository</a>` : ''}
                            ${project.liveUrl ? `<a href="${project.liveUrl}" target="_blank" class="project-link demo"><i class="fas fa-external-link-alt"></i> Live Demo</a>` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <div class="project-footer">
                    <div class="project-meta">
                        ${!project.isCreator ? `<span class="created-by">Created by ${project.createdBy.name}</span>` : ''}
                        <span class="created-date">Created ${new Date(project.createdAt).toLocaleDateString()}</span>
                        ${project.updatedAt !== project.createdAt ? `<span class="updated-date">Updated ${new Date(project.updatedAt).toLocaleDateString()}</span>` : ''}
                    </div>
                    
                    <div class="project-actions">
                        <button data-action="view" data-project-id="${project._id}" class="btn btn-view">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        ${(project.isCreator && (project.approvalStatus === 'pending-approval' || project.approvalStatus === 'rejected')) ? `
                            <button data-action="edit" data-project-id="${project._id}" class="btn btn-edit">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
                        ${(project.isCreator && (project.approvalStatus === 'pending-approval' || project.approvalStatus === 'rejected')) ? `
                            <button data-action="delete" data-project-id="${project._id}" class="btn btn-delete">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners for project actions
        document.querySelectorAll('.project-actions button').forEach(button => {
            button.addEventListener('click', function() {
                const action = this.dataset.action;
                const projectId = this.dataset.projectId;
                
                switch(action) {
                    case 'view':
                        viewProject(projectId);
                        break;
                    case 'edit':
                        editProject(projectId);
                        break;
                    case 'delete':
                        deleteProject(projectId);
                        break;
                }
            });
        });
        
        // Update dashboard count
        document.getElementById('myProjects').textContent = projects.length;
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projectsList').innerHTML = '<p>Error loading projects.</p>';
    }
}

async function loadMyCertificates() {
    try {
        const response = await api.getCertificates();
        const certificates = response.data || [];
        
        if (certificates.length === 0) {
            document.getElementById('certificatesList').innerHTML = '<p>No certificates uploaded yet.</p>';
            return;
        }
        
        document.getElementById('certificatesList').innerHTML = certificates.map(cert => `
            <div class="certificate-item">
                <h5>${cert.title}</h5>
                <p><strong>Status:</strong> <span class="status-${cert.status}">${cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}</span></p>
                <p><strong>Issuer:</strong> ${cert.issuer?.name || cert.issuer}</p>
                ${cert.organization ? `<p><strong>Organization:</strong> ${cert.organization}</p>` : ''}
                ${cert.platform ? `<p><strong>Platform:</strong> ${cert.platform}</p>` : ''}
                ${cert.category ? `<p><strong>Category:</strong> ${cert.category}</p>` : ''}
                ${cert.startDate ? `<p><strong>Started:</strong> ${new Date(cert.startDate).toLocaleDateString()}</p>` : ''}
                ${cert.completionDate ? `<p><strong>Completed:</strong> ${new Date(cert.completionDate).toLocaleDateString()}</p>` : ''}
                <p><strong>Issue Date:</strong> ${new Date(cert.issueDate).toLocaleDateString()}</p>
                ${cert.expiryDate ? `<p><strong>Expiry Date:</strong> ${new Date(cert.expiryDate).toLocaleDateString()}</p>` : ''}
                ${cert.description ? `<p><strong>Description:</strong> ${cert.description}</p>` : ''}
                ${cert.rejectionReason && cert.status === 'rejected' ? `<p class="rejection-reason"><strong>Rejection Reason:</strong> ${cert.rejectionReason}</p>` : ''}
                <div class="certificate-actions">
                    ${cert.certificateUrl ? `<a href="${cert.certificateUrl}" target="_blank" class="btn-view">View Online</a>` : ''}
                    ${cert.files && cert.files.length > 0 ? `<a href="${cert.files[0].fileUrl}" target="_blank" class="btn-view">View File</a>` : ''}
                    ${cert.status === 'pending' || cert.status === 'rejected' ? `<button data-action="delete" data-cert-id="${cert._id}" class="btn-delete cert-delete">Delete</button>` : ''}
                </div>
            </div>
        `).join('');
        
        // Add event listeners for certificate actions
        document.querySelectorAll('.cert-delete').forEach(button => {
            button.addEventListener('click', function() {
                const certId = this.dataset.certId;
                deleteCertificate(certId);
            });
        });
        
        // Update dashboard count
        document.getElementById('myCertificates').textContent = certificates.length;
    } catch (error) {
        console.error('Error loading certificates:', error);
        document.getElementById('certificatesList').innerHTML = '<p>Error loading certificates.</p>';
    }
}

async function loadMyInternships() {
    try {
        const response = await api.getInternships();
        const internships = response.data || [];
        
        if (internships.length === 0) {
            document.getElementById('internshipsList').innerHTML = '<p>No internships recorded yet.</p>';
            return;
        }
        
        document.getElementById('internshipsList').innerHTML = internships.map(internship => `
            <div class="internship-item">
                <h5>${internship.role || internship.title}</h5>
                <p><strong>Approval Status:</strong> <span class="status-${internship.status}">${internship.status.charAt(0).toUpperCase() + internship.status.slice(1)}</span></p>
                <p><strong>Company:</strong> ${internship.company?.name}</p>
                <p><strong>Duration:</strong> ${new Date(internship.joiningDate).toLocaleDateString()} - 
                    ${internship.actualEndDate ? new Date(internship.actualEndDate).toLocaleDateString() : 'Present'}</p>
                ${internship.company?.location?.city ? `<p><strong>Location:</strong> ${internship.company.location.city}</p>` : ''}
                ${internship.progress?.status ? `<p><strong>Progress:</strong> <span class="progress-${internship.progress.status}">${internship.progress.status.charAt(0).toUpperCase() + internship.progress.status.slice(1)}</span></p>` : ''}
                ${internship.description ? `<p><strong>Description:</strong> ${internship.description}</p>` : ''}
                ${internship.skillsGained && internship.skillsGained.length > 0 ? 
                    `<p><strong>Skills:</strong> ${internship.skillsGained.join(', ')}</p>` : ''}
                ${internship.compensation?.stipend?.amount > 0 ? 
                    `<p><strong>Stipend:</strong> ${internship.compensation.stipend.currency} ${internship.compensation.stipend.amount} ${internship.compensation.stipend.frequency}</p>` : ''}
                ${internship.rejectionReason && internship.status === 'rejected' ? `<p class="rejection-reason"><strong>Rejection Reason:</strong> ${internship.rejectionReason}</p>` : ''}
                
                ${internship.documents ? `
                    <div class="internship-documents-display">
                        <h6>Documents:</h6>
                        ${internship.documents.offerLetter ? `
                            <p><i class="fas fa-file-pdf"></i> <a href="${internship.documents.offerLetter.fileUrl}" target="_blank">Offer Letter</a></p>
                        ` : ''}
                        ${internship.documents.joiningLetter ? `
                            <p><i class="fas fa-file-pdf"></i> <a href="${internship.documents.joiningLetter.fileUrl}" target="_blank">Joining Letter</a></p>
                        ` : ''}
                        ${internship.documents.completionCertificate ? `
                            <p><i class="fas fa-file-pdf"></i> <a href="${internship.documents.completionCertificate.fileUrl}" target="_blank">Completion Certificate</a></p>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="internship-actions">
                    ${internship.status === 'pending' || internship.status === 'rejected' ? `<button data-action="edit" data-internship-id="${internship._id}" class="btn-edit internship-edit">Edit</button>` : ''}
                    ${internship.status === 'pending' || internship.status === 'rejected' ? `<button data-action="delete" data-internship-id="${internship._id}" class="btn-delete internship-delete">Delete</button>` : ''}
                </div>
            </div>
        `).join('');
        
        // Add event listeners for internship actions
        document.querySelectorAll('.internship-edit').forEach(button => {
            button.addEventListener('click', function() {
                const internshipId = this.dataset.internshipId;
                editInternship(internshipId);
            });
        });
        
        document.querySelectorAll('.internship-delete').forEach(button => {
            button.addEventListener('click', function() {
                const internshipId = this.dataset.internshipId;
                deleteInternship(internshipId);
            });
        });
        
    } catch (error) {
        console.error('Error loading internships:', error);
        document.getElementById('internshipsList').innerHTML = '<p>Error loading internships.</p>';
    }
}

// Profile Modal Functions
async function showEditProfileModal() {
    // Populate form with current user data
    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profileContact').value = currentUser.contactNumber || '';
    document.getElementById('profileSemester').value = currentUser.semester || '';
    
    // Load teachers for proctor and class teacher dropdowns
    try {
        const response = await api.getDepartmentTeachers();
        
        if (response.success) {
            const proctorSelect = document.getElementById('profileProctor');
            const classTeacherSelect = document.getElementById('profileClassTeacher');
            
            // Clear existing options (keep the default "Select" option)
            proctorSelect.innerHTML = '<option value="">Select Proctor</option>';
            classTeacherSelect.innerHTML = '<option value="">Select Class Teacher</option>';
            
            // Populate with teachers
            response.data.forEach(teacher => {
                const teacherLabel = `${teacher.name} (${teacher.department?.name || 'Unknown Dept'})`;
                const proctorOption = new Option(teacherLabel, teacher._id);
                const classTeacherOption = new Option(teacherLabel, teacher._id);
                
                proctorSelect.add(proctorOption);
                classTeacherSelect.add(classTeacherOption);
            });
            
            // Set current values if they exist
            if (currentUser.proctor) {
                proctorSelect.value = currentUser.proctor._id;
            }
            if (currentUser.classTeacher) {
                classTeacherSelect.value = currentUser.classTeacher._id;
            }
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
    }
    
    // Show current profile image if exists
    const imagePreview = document.getElementById('imagePreview');
    if (currentUser.profileImage) {
        imagePreview.innerHTML = `<img src="/uploads/profiles/${currentUser.profileImage}" alt="Current profile">`;
        imagePreview.classList.add('has-image');
    } else {
        imagePreview.innerHTML = '<p>No image uploaded</p>';
        imagePreview.classList.remove('has-image');
    }
    
    document.getElementById('editProfileModal').style.display = 'block';
}

function closeEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'none';
    document.getElementById('editProfileForm').reset();
    document.getElementById('imagePreview').innerHTML = '<p>No image selected</p>';
    document.getElementById('imagePreview').classList.remove('has-image');
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        
        // Only include fields that have values
        const updateData = {};
        const name = formData.get('name');
        const email = formData.get('email');
        const contactNumber = formData.get('contactNumber');
        const semester = formData.get('semester');
        const proctor = formData.get('proctor');
        const classTeacher = formData.get('classTeacher');
        
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (contactNumber) updateData.contactNumber = contactNumber;
        if (semester) updateData.semester = parseInt(semester);
        if (proctor) updateData.proctor = proctor;
        if (classTeacher) updateData.classTeacher = classTeacher;
        
        // Handle profile image upload
        const profileImage = formData.get('profileImage');
        if (profileImage && profileImage.size > 0) {
            const imageFormData = new FormData();
            imageFormData.append('profileImage', profileImage);
            
            // Upload image first
            const imageResponse = await api.uploadProfileImage(imageFormData);
            if (imageResponse.success) {
                updateData.profileImage = imageResponse.filename;
            }
        }
        
        // Update profile
        await api.updateProfile(updateData);
        
        // Refresh user data
        const response = await api.getMe();
        currentUser = response.data;
        
        closeEditProfileModal();
        loadProfileInfo();
        showNotification('Profile updated successfully!', 'success');
        
        // Update header info
        const studentName = currentUser.name;
        const semesterText = currentUser.semester ? `Semester ${currentUser.semester}` : '';
        const usn = currentUser.usn || currentUser.tempUSN || '';
        
        document.getElementById('studentInfo').textContent = 
            `${studentName} ${semesterText ? '| ' + semesterText : ''} ${usn ? '| ' + usn : ''}`;
            
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile: ' + error.message, 'error');
    }
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showNotification('Image size must be less than 5MB', 'error');
            e.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            preview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '<p>No image selected</p>';
        preview.classList.remove('has-image');
    }
}

// Certificate Modal Functions
function showUploadCertificateModal() {
    document.getElementById('uploadCertificateModal').style.display = 'block';
}

function closeCertificateModal() {
    document.getElementById('uploadCertificateModal').style.display = 'none';
    document.getElementById('uploadCertificateForm').reset();
}

async function handleCertificateUpload(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const certificateFile = formData.get('certificateFile');
        const certificateUrl = formData.get('certificateUrl');
        
        // Check if either URL or file is provided
        if ((!certificateFile || certificateFile.size === 0) && !certificateUrl) {
            showNotification('Please provide either a certificate URL or upload a file', 'error');
            return;
        }
        
        // Validate file if provided
        if (certificateFile && certificateFile.size > 0) {
            if (certificateFile.size > 5 * 1024 * 1024) { // 5MB limit
                showNotification('File size must be less than 5MB', 'error');
                return;
            }
        }
        
        const response = await api.uploadCertificate(formData);
        
        closeCertificateModal();
        loadMyCertificates();
        loadDashboardStats();
        showNotification('Certificate uploaded successfully!', 'success');
        
    } catch (error) {
        console.error('Error uploading certificate:', error);
        showNotification('Error uploading certificate: ' + error.message, 'error');
    }
}

// Internship Modal Functions
function showAddInternshipModal() {
    document.getElementById('addInternshipModal').style.display = 'block';
}

function closeInternshipModal() {
    document.getElementById('addInternshipModal').style.display = 'none';
    document.getElementById('addInternshipForm').reset();
    document.getElementById('endDate').disabled = false;
}

function handleCurrentlyWorkingChange(e) {
    const endDateField = document.getElementById('endDate');
    if (e.target.checked) {
        endDateField.disabled = true;
        endDateField.value = '';
    } else {
        endDateField.disabled = false;
    }
}

async function handleInternshipAdd(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        
        // Check if offer letter is provided
        const offerLetter = formData.get('offerLetter');
        if (!offerLetter || offerLetter.size === 0) {
            showNotification('Please upload an offer letter', 'error');
            return;
        }
        
        // Validate file size
        if (offerLetter.size > 5 * 1024 * 1024) { // 5MB limit
            showNotification('Offer letter file size must be less than 5MB', 'error');
            return;
        }
        
        // Check joining letter if provided
        const joiningLetter = formData.get('joiningLetter');
        if (joiningLetter && joiningLetter.size > 5 * 1024 * 1024) {
            showNotification('Joining letter file size must be less than 5MB', 'error');
            return;
        }
        
        // Pass FormData directly to API (don't convert to object)
        await api.addInternship(formData);
        
        closeInternshipModal();
        loadMyInternships();
        loadDashboardStats();
        showNotification('Internship added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding internship:', error);
        showNotification('Error adding internship: ' + error.message, 'error');
    }
}

// External Event Participation Modal
function showAddEventModal() {
    document.getElementById('addEventModal').style.display = 'block';
}

function closeEventModal() {
    document.getElementById('addEventModal').style.display = 'none';
    document.getElementById('addEventForm').reset();
}

async function handleEventAdd(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        
        // Debug: Log all form data entries
        console.log('🔍 FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}: "${value}"`);
        }
        
        // Convert FormData to JSON object with proper nested structure
        const eventData = {};
        
        // Basic fields
        eventData.eventName = formData.get('eventName');
        eventData.eventType = formData.get('eventType');
        eventData.startDate = formData.get('startDate');
        eventData.endDate = formData.get('endDate') || null;
        eventData.durationDays = parseInt(formData.get('durationDays')) || 1;
        eventData.participationType = formData.get('participationType');
        eventData.description = formData.get('description') || '';
        
        // Nested organizer object
        eventData.organizer = {
            name: formData.get('organizer[name]') || ''
        };
        
        // Nested location object
        eventData.location = {
            venue: formData.get('location[venue]') || ''
        };
        
        // Team details if team participation
        if (eventData.participationType === 'team') {
            eventData.teamDetails = {
                teamName: formData.get('teamDetails[teamName]') || '',
                teamSize: parseInt(formData.get('teamDetails[teamSize]')) || 2,
                teamRole: formData.get('teamDetails[teamRole]') || ''
            };
        }
        
        // Outcome details
        const achievement = formData.get('outcome[achievement]');
        const rank = formData.get('outcome[rank]');
        if (achievement || rank) {
            eventData.outcome = {};
            if (achievement) eventData.outcome.achievement = achievement;
            if (rank) eventData.outcome.rank = parseInt(rank);
        }
        
        // Debug: Log the structured event data
        console.log('🔍 Structured eventData:', JSON.stringify(eventData, null, 2));
        
        // Validate required fields
        if (!eventData.eventName || !eventData.eventType || !eventData.startDate) {
            showNotification('Please fill all required fields (name, type, date)', 'error');
            return;
        }
        
        if (!eventData.organizer.name) {
            showNotification('Please enter organizer name', 'error');
            return;
        }
        
        if (!eventData.participationType) {
            showNotification('Please select participation type', 'error');
            return;
        }
        
        // Debug: Final validation check
        console.log('✅ Validation passed, sending to API...');
        
        // Send as JSON instead of FormData
        const response = await api.addEventParticipationJSON(eventData);
        console.log('✅ API Response:', response);
        
        closeEventModal();
        loadMyEventParticipations();
        loadDashboardStats();
        showNotification('Event participation added successfully! It will be visible once approved by a teacher.', 'success');
        
    } catch (error) {
        console.error('❌ Error adding event participation:', error);
        
        // Try to extract validation errors if they exist
        if (error.message === 'Validation failed' && error.errors) {
            console.error('❌ Validation errors:', error.errors);
        }
        
        showNotification('Error adding event participation: ' + error.message, 'error');
    }
}

// Project Modal Functions
function showAddProjectModal() {
    document.getElementById('addProjectModal').style.display = 'block';
}

function closeProjectModal() {
    document.getElementById('addProjectModal').style.display = 'none';
    document.getElementById('addProjectForm').reset();
}

async function handleProjectAdd(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        
        // Validate required fields
        const title = formData.get('title');
        const projectType = formData.get('projectType');
        const domain = formData.get('domain');
        
        if (!title || !projectType || !domain) {
            showNotification('Please fill all required fields', 'error');
            return;
        }
        
        // Note: Teacher mentor is optional for all project types
        
        // Build project data object
        const projectData = {};
        
        // Basic project fields - only include non-empty string values
        for (let [key, value] of formData.entries()) {
            if (typeof value === 'string' && value.trim() !== '') {
                projectData[key] = value.trim();
            }
            // Skip file inputs and empty values
        }
        
        // Add team member data for all project types
        if (selectedTeamMembers.length > 0) {
            projectData.teamMembers = selectedTeamMembers.map(member => member.id);
            projectData.teamSize = 1 + selectedTeamMembers.length; // Include current student
        } else {
            projectData.teamSize = 1; // Solo project
        }
        
        // Handle files if any
        const projectFiles = formData.getAll('projectFiles');
        const hasFiles = projectFiles && projectFiles.length > 0 && projectFiles[0].size > 0;
        
        const editId = e.target.dataset.editId;

        if (hasFiles) {
            // If files are present, use FormData for file upload
            // Add all the project data to FormData
            Object.keys(projectData).forEach(key => {
                if (key === 'teamMembers') {
                    formData.set('teamMembers', JSON.stringify(projectData[key]));
                } else if (typeof projectData[key] === 'object') {
                    formData.set(key, JSON.stringify(projectData[key]));
                } else {
                    formData.set(key, projectData[key]);
                }
            });
            if (editId) {
                await api.request(`/projects/${editId}`, { method: 'PUT', body: formData, headers: {} });
            } else {
                await api.addProject(formData);
            }
        } else {
            if (editId) {
                await api.request(`/projects/${editId}`, { method: 'PUT', body: projectData });
            } else {
                await api.createProject(projectData);
            }
        }

        // Reset form and close modal
        closeProjectModal();
        resetProjectForm();
        delete e.target.dataset.editId;
        loadMyProjects();
        loadDashboardStats();
        showNotification(editId ? 'Project updated successfully!' : 'Project added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding project:', error);
        showNotification('Error adding project: ' + error.message, 'error');
    }
}

function resetProjectForm() {
    // Clear selected team members
    selectedTeamMembers = [];
    updateSelectedTeamMembersDisplay();
    updateTeamSize();
    
    // Reset radio buttons
    const soloRadio = document.querySelector('input[name="teamChoice"][value="solo"]');
    if (soloRadio) soloRadio.checked = true;
    
    // Hide team list
    const teamMembersList = document.getElementById('teamMembersList');
    if (teamMembersList) teamMembersList.style.display = 'none';
}

// Utility functions
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        api.clearToken();
        window.location.href = '/';
    }
}

async function deleteCertificate(id) {
    if (confirm('Are you sure you want to delete this certificate?')) {
        try {
            await api.request(`/certificates/${id}`, { method: 'DELETE' });
            loadMyCertificates();
            loadDashboardStats();
            showNotification('Certificate deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting certificate:', error);
            showNotification('Error deleting certificate: ' + error.message, 'error');
        }
    }
}

async function deleteInternship(id) {
    if (confirm('Are you sure you want to delete this internship record?')) {
        try {
            await api.request(`/internships/${id}`, { method: 'DELETE' });
            loadMyInternships();
            loadDashboardStats();
            showNotification('Internship deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting internship:', error);
            showNotification('Error deleting internship: ' + error.message, 'error');
        }
    }
}

async function editInternship(id) {
    try {
        const response = await api.request(`/internships/${id}`);
        const i = response.data;
        const modal = document.getElementById('addInternshipModal');
        const form = document.getElementById('addInternshipForm');
        form.dataset.editId = id;
        document.getElementById('companyName').value = i.companyName || '';
        document.getElementById('position').value = i.position || '';
        document.getElementById('startDate').value = i.startDate ? new Date(i.startDate).toISOString().slice(0,10) : '';
        document.getElementById('endDate').value = i.endDate ? new Date(i.endDate).toISOString().slice(0,10) : '';
        document.getElementById('currentlyWorking').checked = !!i.currentlyWorking;
        document.getElementById('location').value = i.location || '';
        document.querySelector('#addInternshipModal textarea[name="description"]').value = i.description || '';
        document.getElementById('skills').value = Array.isArray(i.skills) ? i.skills.join(', ') : (i.skills || '');
        const title = modal.querySelector('h3, .modal-title');
        if (title) title.textContent = 'Edit Internship';
        modal.style.display = 'block';
        modal.classList.add('show');
    } catch (error) {
        UI.toast('Could not load internship: ' + error.message, 'error');
    }
}

async function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project?')) {
        try {
            await api.request(`/projects/${id}`, { method: 'DELETE' });
            loadMyProjects();
            loadDashboardStats();
            showNotification('Project deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting project:', error);
            showNotification('Error deleting project: ' + error.message, 'error');
        }
    }
}

function viewProject(id) {
    // Show detailed project view modal
    showProjectDetails(id);
}

async function editProject(id) {
    try {
        const response = await api.getProject(id);
        const p = response.data;
        const modal = document.getElementById('addProjectModal');
        const form = document.getElementById('addProjectForm');
        form.dataset.editId = id;
        const setIfExists = (selector, value) => {
            const el = modal.querySelector(selector);
            if (el) el.value = value ?? '';
        };
        setIfExists('#projectTitle', p.title);
        setIfExists('#projectType', p.projectType);
        setIfExists('#projectDomain', p.domain);
        setIfExists('#projectStatus', p.status);
        setIfExists('textarea[name="description"]', p.description);
        setIfExists('#projectTechnologies', Array.isArray(p.technologies) ? p.technologies.join(', ') : p.technologies);
        setIfExists('#projectTeamSize', p.teamSize);
        setIfExists('#projectStartDate', p.startDate ? new Date(p.startDate).toISOString().slice(0,10) : '');
        setIfExists('#projectEndDate', p.endDate ? new Date(p.endDate).toISOString().slice(0,10) : '');
        setIfExists('#projectGithub', p.githubUrl);
        setIfExists('#projectLive', p.liveUrl);
        setIfExists('#driveLink', p.driveLink);
        setIfExists('#youtubeLink', p.youtubeLink);
        setIfExists('#documentationUrl', p.documentationUrl);
        const title = modal.querySelector('h3, .modal-title');
        if (title) title.textContent = 'Edit Project';
        modal.style.display = 'block';
        modal.classList.add('show');
    } catch (error) {
        UI.toast('Could not load project: ' + error.message, 'error');
    }
}

async function showProjectDetails(projectId) {
    try {
        const response = await api.getProject(projectId);
        const project = response.data;
        
        // Create and show detailed project modal
        const modal = document.createElement('div');
        modal.className = 'modal project-details-modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <span class="close">&times;</span>
                <div class="project-details-header">
                    <h2>${project.title}</h2>
                    <div class="project-status-badges">
                        <span class="project-type-badge ${project.studentProjectType}">${project.studentProjectType.toUpperCase()}</span>
                        <span class="project-status status-${project.approvalStatus}">${(project.approvalStatus || 'pending').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                </div>
                
                <div class="project-details-content">
                    <div class="details-section">
                        <h4>Project Information</h4>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Domain:</label>
                                <span>${project.domain}</span>
                            </div>
                            ${project.abstract ? `
                                <div class="info-item full-width">
                                    <label>Description:</label>
                                    <p>${project.abstract}</p>
                                </div>
                            ` : ''}
                            ${project.technicalDetails?.technologies?.length > 0 ? `
                                <div class="info-item full-width">
                                    <label>Technologies:</label>
                                    <div class="tech-tags">
                                        ${project.technicalDetails.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${project.teamMembers?.length > 0 ? `
                        <div class="details-section">
                            <h4>Team Members</h4>
                            <div class="team-grid">
                                ${project.teamMembers.map(member => `
                                    <div class="team-member-detail ${member.role === 'leader' ? 'leader' : 'member'}">
                                        <div class="member-info">
                                            <h5>${member.user.name}</h5>
                                            <span class="role">${member.role === 'leader' ? 'Team Leader' : 'Member'}</span>
                                            ${member.user.usn ? `<span class="usn">${member.user.usn}</span>` : ''}
                                            <span class="email">${member.user.email}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${project.primaryMentor ? `
                        <div class="details-section">
                            <h4>Project Mentor</h4>
                            <div class="mentor-detail">
                                <h5>${project.primaryMentor.name}</h5>
                                <span class="designation">${project.primaryMentor.designation?.title || 'Teacher'}</span>
                                <span class="email">${project.primaryMentor.email}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="details-section">
                        <h4>Timeline & Progress</h4>
                        <div class="timeline-detail">
                            <div class="timeline-row">
                                <i class="fas fa-play-circle"></i>
                                <span>Started: ${new Date(project.startDate).toLocaleDateString()}</span>
                            </div>
                            ${project.expectedEndDate ? `
                                <div class="timeline-row">
                                    <i class="fas fa-flag-checkered"></i>
                                    <span>Expected End: ${new Date(project.expectedEndDate).toLocaleDateString()}</span>
                                </div>
                            ` : ''}
                            ${project.actualEndDate ? `
                                <div class="timeline-row completed">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Completed: ${new Date(project.actualEndDate).toLocaleDateString()}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${project.progress ? `
                            <div class="progress-detail">
                                <label>Progress: ${project.progress.percentage || 0}%</label>
                                <div class="progress-bar large">
                                    <div class="progress-fill" style="width: ${project.progress.percentage || 0}%"></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${project.budget && project.budget.totalRequested > 0 ? `
                        <div class="details-section">
                            <h4>Budget Request</h4>
                            <div class="budget-display">
                                <div class="budget-summary">
                                    <div class="budget-item">
                                        <label>Requested Amount:</label>
                                        <span class="budget-amount">₹${project.budget.totalRequested.toLocaleString()}</span>
                                    </div>
                                    <div class="budget-item">
                                        <label>Approved Amount:</label>
                                        <span class="budget-amount ${project.budget.totalApproved > 0 ? 'approved' : 'pending'}">
                                            ₹${project.budget.totalApproved.toLocaleString()}
                                        </span>
                                    </div>
                                    <div class="budget-item">
                                        <label>Status:</label>
                                        <span class="budget-status ${project.budget.totalApproved > 0 ? 'approved' : 'pending'}">
                                            ${project.budget.totalApproved > 0 ? 'Approved' : 'Pending Review'}
                                        </span>
                                    </div>
                                </div>
                                
                                ${project.budget.categories?.length > 0 ? `
                                    <div class="budget-breakdown">
                                        <h5>Budget Breakdown:</h5>
                                        ${project.budget.categories.map(category => `
                                            <div class="budget-category">
                                                <span class="category-name">${category.category.charAt(0).toUpperCase() + category.category.slice(1)}</span>
                                                <span class="category-amount">₹${category.requested.toLocaleString()}</span>
                                                <p class="category-description">${category.description}</p>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${project.outcomes?.length > 0 || project.technicalDetails?.githubUrl || project.technicalDetails?.liveUrl ? `
                        <div class="details-section">
                            <h4>Project Files & Links</h4>
                            <div class="files-grid">
                                ${project.technicalDetails?.githubUrl ? `
                                    <div class="file-item">
                                        <a href="${project.technicalDetails.githubUrl}" target="_blank" class="file-link github">
                                            <i class="fab fa-github"></i> GitHub Repository
                                        </a>
                                    </div>
                                ` : ''}
                                ${project.technicalDetails?.liveUrl ? `
                                    <div class="file-item">
                                        <a href="${project.technicalDetails.liveUrl}" target="_blank" class="file-link demo">
                                            <i class="fas fa-external-link-alt"></i> Live Demo
                                        </a>
                                    </div>
                                ` : ''}
                                ${project.technicalDetails?.driveLink ? `
                                    <div class="file-item">
                                        <a href="${project.technicalDetails.driveLink}" target="_blank" class="file-link drive">
                                            <i class="fab fa-google-drive"></i> Google Drive
                                        </a>
                                    </div>
                                ` : ''}
                                ${project.technicalDetails?.youtubeLink ? `
                                    <div class="file-item">
                                        <a href="${project.technicalDetails.youtubeLink}" target="_blank" class="file-link youtube">
                                            <i class="fab fa-youtube"></i> YouTube Demo
                                        </a>
                                    </div>
                                ` : ''}
                                ${project.technicalDetails?.documentationUrl ? `
                                    <div class="file-item">
                                        <a href="${project.technicalDetails.documentationUrl}" target="_blank" class="file-link docs">
                                            <i class="fas fa-book"></i> Documentation
                                        </a>
                                    </div>
                                ` : ''}
                                ${project.outcomes?.map(outcome => `
                                    ${outcome.evidenceFiles?.map(file => `
                                        <div class="file-item">
                                            <a href="${file.fileUrl}" target="_blank" class="file-link document">
                                                <i class="fas fa-file-${getFileIcon(file.fileName)}"></i> ${file.fileName}
                                            </a>
                                            <small class="file-info">
                                                Uploaded: ${new Date(file.uploadDate).toLocaleDateString()}
                                            </small>
                                        </div>
                                    `).join('') || ''}
                                `).join('') || ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-secondary close-modal">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Add event listeners for modal close
        const closeBtn = modal.querySelector('.close');
        const closeModalBtn = modal.querySelector('.close-modal');
        
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });
        
        closeModalBtn.addEventListener('click', function() {
            modal.remove();
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
    } catch (error) {
        console.error('Error loading project details:', error);
        showNotification('Error loading project details: ' + error.message, 'error');
    }
}

function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    const iconMap = {
        // Documents
        'pdf': 'pdf',
        'doc': 'word',
        'docx': 'word',
        'ppt': 'powerpoint',
        'pptx': 'powerpoint',
        
        // Images
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image',
        'gif': 'image',
        
        // Videos
        'mp4': 'video',
        'avi': 'video',
        'mov': 'video',
        
        // Archives
        'zip': 'archive',
        'rar': 'archive',
        
        // Code
        'html': 'code',
        'css': 'code',
        'js': 'code',
        'py': 'code',
        'java': 'code'
    };
    
    return iconMap[extension] || 'alt';
}

// Event participation functions - loads ALL events student participated in
async function loadMyEventParticipations() {
    try {
        // For now, only load external event participations since college event system isn't ready
        const externalEventsResponse = await api.getEventParticipations();
        const externalEvents = externalEventsResponse.data || [];
        
        // Placeholder for college events until teacher system is ready
        const collegeEvents = [];
        
        // Combine and format all events
        const allEvents = [
            // External events (hackathons, conferences, etc.)
            ...externalEvents.map(event => ({
                ...event,
                eventSource: 'external',
                displayTitle: event.eventName,
                displayType: `External ${event.eventType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
                displayDate: new Date(event.startDate).toLocaleDateString() + (event.endDate ? ` - ${new Date(event.endDate).toLocaleDateString()}` : ''),
                displayLocation: event.location?.venue || 'Online',
                displayOrganizer: event.organizer?.name || 'Unknown',
                hasApprovalStatus: true
            })),
            // College events (where student is participant)
            ...collegeEvents.map(event => ({
                ...event,
                eventSource: 'college',
                displayTitle: event.title,
                displayType: `College ${event.eventType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Event'}`,
                displayDate: new Date(event.startDate).toLocaleDateString() + (event.endDate ? ` - ${new Date(event.endDate).toLocaleDateString()}` : ''),
                displayLocation: event.venue || event.location || 'TBD',
                displayOrganizer: event.organizerType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'College',
                hasApprovalStatus: false, // College events don't need approval status for participants
                participationStatus: event.participationStatus || 'registered' // registered, attended, completed, etc.
            }))
        ];
        
        // Sort by date (newest first)
        allEvents.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        
        if (allEvents.length === 0) {
            document.getElementById('myEventsList').innerHTML = `
                <div class="empty-state">
                    <h4>No Event Participations Yet</h4>
                    <p>Submit your external event participations to track your achievements!</p>
                    <p><strong>What you can add:</strong></p>
                    <ul>
                        <li>Hackathons you participated in</li>
                        <li>Coding competitions</li>
                        <li>Conferences and workshops attended</li>
                        <li>Webinars and online events</li>
                    </ul>
                    <p><small><strong>Note:</strong> All submissions require teacher approval to verify authenticity.</small></p>
                </div>
            `;
            return;
        }
        
        document.getElementById('myEventsList').innerHTML = allEvents.map(event => `
            <div class="event-item ${event.eventSource}-event">
                <div class="event-source-badge">
                    <span class="badge badge-${event.eventSource}">${event.eventSource === 'external' ? 'External' : 'College'}</span>
                </div>
                <h5>${event.displayTitle}</h5>
                
                ${event.hasApprovalStatus ? 
                    `<p><strong>Approval Status:</strong> <span class="status-${event.status}">${event.status.charAt(0).toUpperCase() + event.status.slice(1)}</span></p>` :
                    `<p><strong>Participation:</strong> <span class="status-${event.participationStatus}">${event.participationStatus.charAt(0).toUpperCase() + event.participationStatus.slice(1)}</span></p>`
                }
                
                <p><strong>Type:</strong> ${event.displayType}</p>
                <p><strong>Date:</strong> ${event.displayDate}</p>
                <p><strong>Location:</strong> ${event.displayLocation}</p>
                <p><strong>Organizer:</strong> ${event.displayOrganizer}</p>
                
                ${event.eventSource === 'external' ? `
                    ${event.durationDays ? `<p><strong>Duration:</strong> ${event.durationDays} day(s)</p>` : ''}
                    ${event.outcome?.achievement ? `<p><strong>Achievement:</strong> ${event.outcome.achievement.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>` : ''}
                    ${event.outcome?.rank ? `<p><strong>Rank:</strong> ${event.outcome.rank}</p>` : ''}
                ` : `
                    ${event.role ? `<p><strong>Role:</strong> ${event.role}</p>` : ''}
                    ${event.attendance ? `<p><strong>Attendance:</strong> ${event.attendance}</p>` : ''}
                `}
                
                ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ''}
                ${event.rejectionReason && event.status === 'rejected' ? `<p class="rejection-reason"><strong>Rejection Reason:</strong> ${event.rejectionReason}</p>` : ''}
                
                <div class="event-actions">
                    ${event.eventSource === 'external' && (event.status === 'pending' || event.status === 'rejected') ? 
                        `<button data-action="delete" data-event-id="${event._id}" class="btn-delete event-participation-delete">Delete</button>` : ''
                    }
                    ${event.eventSource === 'college' ? 
                        `<button data-action="view" data-event-id="${event._id}" class="btn btn-info college-event-view">View Details</button>` : ''
                    }
                </div>
            </div>
        `).join('');
        
        // Add event listeners for event participation actions
        document.querySelectorAll('.event-participation-delete').forEach(button => {
            button.addEventListener('click', function() {
                const eventId = this.dataset.eventId;
                deleteEventParticipation(eventId);
            });
        });
        
        document.querySelectorAll('.college-event-view').forEach(button => {
            button.addEventListener('click', function() {
                const eventId = this.dataset.eventId;
                viewCollegeEventDetails(eventId);
            });
        });
        
    } catch (error) {
        console.error('Error loading event participations:', error);
        document.getElementById('myEventsList').innerHTML = '<p>Error loading events.</p>';
    }
}

async function deleteEventParticipation(id) {
    if (confirm('Are you sure you want to delete this event participation?')) {
        try {
            await api.request(`/event-participations/${id}`, { method: 'DELETE' });
            loadMyEventParticipations();
            showNotification('Event participation deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting event participation:', error);
            showNotification('Error deleting event participation: ' + error.message, 'error');
        }
    }
}

function registerForEvent(eventId) {
    UI.toast('Event registration functionality will be implemented when teacher system is ready!', 'info');
    // TODO: Implement when teacher/event management is ready
}

function viewCollegeEventDetails(eventId) {
    UI.toast('View college event details functionality will be implemented when teacher system is ready!', 'info');
    // TODO: Implement when teacher/event management is ready
}

function showNotification(message, type = 'info') {
    if (window.UI && window.UI.toast) return UI.toast(message, type);
    const n = document.createElement('div');
    n.textContent = message;
    n.style.cssText = 'position:fixed;top:20px;right:20px;padding:1rem;background:#333;color:#fff;border-radius:8px;z-index:99999';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}