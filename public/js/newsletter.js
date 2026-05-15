// Newsletter functionality
let currentNewsletter = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadDepartments();
    loadYears();
    
    // Handle form submission
    document.getElementById('newsletterForm').addEventListener('submit', handleFormSubmit);
});

async function loadDepartments() {
    try {
        const response = await fetch('/newsletter/api/departments/public');
        const data = await response.json();
        
        const departmentSelect = document.getElementById('department');
        departmentSelect.innerHTML = '<option value="">Select Department</option>';
        
        if (data.success && data.data) {
            data.data.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept._id;
                option.textContent = dept.name;
                departmentSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

function loadYears() {
    const yearSelect = document.getElementById('year');
    const currentYear = new Date().getFullYear();
    
    yearSelect.innerHTML = '<option value="">Select Year</option>';
    
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const departmentId = document.getElementById('department').value;
    const month = parseInt(document.getElementById('month').value);
    const year = parseInt(document.getElementById('year').value);
    
    if (!departmentId || month === '' || !year) {
        UI.toast('Please select all fields', 'warning');
        return;
    }
    
    // Show loading
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('newsletterContent').innerHTML = '';
    document.getElementById('newsletterActions').style.display = 'none';
    
    try {
        await generateNewsletter(departmentId, month, year);
    } catch (error) {
        console.error('Error generating newsletter:', error);
        UI.toast('Failed to generate newsletter. Please try again.', 'error');
    } finally {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

async function generateNewsletter(departmentId, month, year) {
    try {
        // Prefer the curated newsletter; the endpoint falls back to auto-generated when none exists.
        const response = await fetch(`/api/newsletters/published/${departmentId}/${year}/${month}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch newsletter');
        }

        let newsletterHTML;
        let departmentName;

        if (data.source === 'curated') {
            const n = data.data;
            departmentName = n.department?.name || 'Department';
            newsletterHTML = generateCuratedNewsletter(n);
        } else {
            // auto-generated fallback (teacher events feed)
            const events = data.data?.teacherEvents || [];
            departmentName = data.data?.department?.name || 'Department';
            const startDate = new Date(year, month, 1);
            const endDate   = new Date(year, month + 1, 0);
            newsletterHTML  = generateTeacherEventsNewsletter(events, departmentName, startDate, endDate);
        }

        // Display newsletter
        document.getElementById('newsletterContent').innerHTML = newsletterHTML;
        document.getElementById('newsletterActions').style.display = 'block';

        currentNewsletter = { departmentId, departmentName, month, year, html: newsletterHTML };
        document.getElementById('newsletterContent').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Render an HOD-composed (curated) newsletter: cover + masthead + byline + sections.
function generateCuratedNewsletter(n) {
    const escape = (s) => String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthLabel = months[n.month] || '';
    const yearLabel  = n.year || '';
    const author = n.publishedBy?.name || n.createdBy?.name || '';
    const publishedAt = n.publishedAt ? new Date(n.publishedAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : '';
    const dept = n.department?.name || '';

    const sectionsHtml = (n.sections || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(s => `
            <section class="curated-section">
                <h2 class="curated-section-heading">${escape(s.heading)}</h2>
                <div class="curated-section-body">${s.body || ''}</div>
            </section>
        `).join('');

    const coverHtml = n.coverImage
        ? `<div class="curated-cover"><img src="${escape(n.coverImage)}" alt="Cover image"></div>`
        : '';

    return `
        <div class="curated-newsletter">
            ${coverHtml}
            <header class="curated-masthead">
                <div class="curated-rainbow"></div>
                <h1 class="curated-title">${escape(n.title)}</h1>
                <p class="curated-subtitle">${escape(dept)} · ${escape(monthLabel)} ${escape(yearLabel)}</p>
                ${author || publishedAt ? `<p class="curated-byline">${author ? 'By ' + escape(author) : ''}${author && publishedAt ? ' · ' : ''}${publishedAt ? 'Published ' + escape(publishedAt) : ''}</p>` : ''}
                ${n.summary ? `<p class="curated-summary">${escape(n.summary)}</p>` : ''}
            </header>
            ${sectionsHtml || '<p class="t-text-muted" style="text-align:center;padding:2rem;">No sections published yet.</p>'}
        </div>
    `;
}

// Exact same newsletter generation logic as HOD version
function generateTeacherEventsNewsletter(teacherEvents, departmentName, startDate, endDate) {
    console.log('📋 Newsletter generation started with', teacherEvents.length, 'events');
    teacherEvents.forEach((event, idx) => {
        console.log(`Event ${idx + 1}: ${event.title}`);
        if (event.documentContent) {
            console.log('  documentContent items:', event.documentContent.length);
            event.documentContent.forEach((content, cIdx) => {
                if (content.type === 'image') {
                    console.log(`    Content ${cIdx + 1} (image):`, content.imageUrls || content.imageUrl);
                }
            });
        }
    });
    
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
                                                                    console.log('🔍 Processing imageUrl:', imgUrl, 'Type:', typeof imgUrl);
                                                                    // Handle both full paths and filenames
                                                                    const imageSrc = (imgUrl.startsWith('/uploads/') || imgUrl.includes('/uploads/')) ? imgUrl : `/uploads/teacher-events/${imgUrl}`;
                                                                    console.log('🔗 Final imageSrc:', imageSrc);
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
                                                            console.log('🔍 Processing single imageUrl:', content.imageUrl, 'Type:', typeof content.imageUrl);
                                                            // Handle both full paths and filenames
                                                            const imageSrc = (content.imageUrl.startsWith('/uploads/') || content.imageUrl.includes('/uploads/')) ? content.imageUrl : `/uploads/teacher-events/${content.imageUrl}`;
                                                            console.log('🔗 Final single imageSrc:', imageSrc);
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

function downloadNewsletter() {
    if (!currentNewsletter) {
        UI.toast('No newsletter to download', 'info');
        return;
    }
    
    const blob = new Blob([currentNewsletter.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentNewsletter.departmentName}_Newsletter_${currentNewsletter.month + 1}_${currentNewsletter.year}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function shareNewsletter() {
    if (!currentNewsletter) {
        UI.toast('No newsletter to share', 'info');
        return;
    }
    
    const url = `${window.location.origin}/newsletter?dept=${currentNewsletter.departmentId}&month=${currentNewsletter.month}&year=${currentNewsletter.year}`;
    
    if (navigator.share) {
        navigator.share({
            title: `${currentNewsletter.departmentName} Newsletter`,
            text: `Faculty Events Newsletter for ${currentNewsletter.departmentName}`,
            url: url
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            UI.toast('Newsletter link copied to clipboard!', 'info');
        });
    }
}