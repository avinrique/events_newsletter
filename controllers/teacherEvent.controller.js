const TeacherEvent = require('../models/TeacherEvent');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// Get all teacher events (department-scoped)
const getAllTeacherEvents = async (req, res) => {
    try {
        let query = { department: req.user.department };
        
        // If regular teacher, only show their own events
        if (req.user.role === 'teacher' && req.user.position !== 'HOD') {
            query.createdBy = req.user._id;
        }

        const events = await TeacherEvent.find(query)
            .populate('createdBy', 'name email')
            .populate('studentsInvolved', 'name email usn rollNumber')
            .populate('teachersInvolved', 'name email')
            .populate('department', 'name')
            .sort({ eventDate: -1 });

        res.status(200).json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (error) {
        console.error('Error fetching teacher events:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teacher events'
        });
    }
};

// Get single teacher event
const getTeacherEvent = async (req, res) => {
    try {
        const event = await TeacherEvent.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('studentsInvolved', 'name email usn rollNumber')
            .populate('teachersInvolved', 'name email')
            .populate('department', 'name');

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Teacher event not found'
            });
        }

        // Check department access (except for admin)
        if (req.user.role !== 'admin' && event.department._id.toString() !== req.user.department.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view events from another department'
            });
        }

        // Check permissions - regular teachers can only see their own events, HODs can see all department events
        if (req.user.role === 'teacher' && req.user.position !== 'HOD' && 
            event.createdBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this event'
            });
        }

        res.status(200).json({
            success: true,
            data: event
        });
    } catch (error) {
        console.error('Error fetching teacher event:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teacher event'
        });
    }
};

// Create teacher event
const createTeacherEvent = async (req, res) => {
    try {
        const { title, description, eventDate, studentsInvolved, teachersInvolved, outcome } = req.body;

        // Debug: Log what we received
        console.log('🔍 CREATE DEBUG - Received data:');
        console.log('  studentsInvolved:', studentsInvolved, 'Type:', typeof studentsInvolved, 'IsArray:', Array.isArray(studentsInvolved));
        console.log('  teachersInvolved:', teachersInvolved, 'Type:', typeof teachersInvolved, 'IsArray:', Array.isArray(teachersInvolved));

        // Ensure participants are arrays (fix for single participant issue)
        const studentsArray = studentsInvolved ? (Array.isArray(studentsInvolved) ? studentsInvolved : [studentsInvolved]) : [];
        const teachersArray = teachersInvolved ? (Array.isArray(teachersInvolved) ? teachersInvolved : [teachersInvolved]) : [];
        
        console.log('  After normalization - studentsArray:', studentsArray, 'teachersArray:', teachersArray);

        // Validate students exist and are active
        if (studentsArray.length > 0) {
            const students = await User.find({ 
                _id: { $in: studentsArray }, 
                role: 'student',
                isActive: true
            });
            
            if (students.length !== studentsArray.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Some selected students are not found or inactive'
                });
            }
        }

        // Validate teachers exist and are active
        if (teachersArray.length > 0) {
            const teachers = await User.find({ 
                _id: { $in: teachersArray }, 
                role: 'teacher',
                isActive: true
            });
            
            if (teachers.length !== teachersArray.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Some selected teachers are not found or inactive'
                });
            }
        }

        const eventData = {
            title,
            description,
            eventDate,
            studentsInvolved: studentsArray,
            teachersInvolved: teachersArray,
            outcome,
            createdBy: req.user._id,
            department: req.user.department
        };

        // Handle structured document content
        if (req.body.documentContent) {
            try {
                const documentContent = JSON.parse(req.body.documentContent);
                eventData.documentContent = documentContent.map((item, index) => ({
                    ...item,
                    order: index
                }));
            } catch (error) {
                console.error('Error parsing document content:', error);
            }
        }

        // Handle regular image uploads
        const regularImages = [];
        const documentImages = [];
        
        console.log('📷 Debug - Files received:', req.files);
        console.log('📷 Debug - Request body keys:', Object.keys(req.body));
        console.log('📷 Debug - Document content:', req.body.documentContent);
        
        if (req.files) {
            // Handle regular images
            if (req.files.images) {
                console.log('📷 Regular images count:', req.files.images.length);
                req.files.images.forEach(file => {
                    regularImages.push({
                        fileName: file.originalname,
                        fileUrl: `/uploads/teacher-events/${file.filename}`,
                        fileType: file.mimetype,
                        fileSize: file.size,
                        uploadDate: new Date()
                    });
                });
            }
            
            // Handle document images
            if (req.files.documentImages) {
                req.files.documentImages.forEach(file => {
                    documentImages.push({
                        fileName: file.originalname,
                        fileUrl: `/uploads/teacher-events/${file.filename}`,
                        fileType: file.mimetype,
                        fileSize: file.size,
                        uploadDate: new Date(),
                        originalName: file.originalname
                    });
                });
            }
            
            // Combine regular images and document images for the images array
            const allImages = [...regularImages, ...documentImages];
            if (allImages.length > 0) {
                eventData.images = allImages;
            }
            
            // Update document content with actual image URLs
            if (documentImages.length > 0 && eventData.documentContent) {
                eventData.documentContent.forEach(item => {
                    if (item.type === 'image') {
                        // Handle multiple imageUrls (new format)
                        if (item.imageUrls && Array.isArray(item.imageUrls)) {
                            const mappedUrls = [];
                            item.imageUrls.forEach(originalName => {
                                const matchingImage = documentImages.find(img => 
                                    img.originalName.includes(originalName.replace(/\.(png|jpg|jpeg|gif|webp)$/i, ''))
                                );
                                if (matchingImage) {
                                    mappedUrls.push(matchingImage.fileUrl);
                                }
                            });
                            item.imageUrls = mappedUrls;
                            // Set first image as imageUrl for backward compatibility
                            if (mappedUrls.length > 0) {
                                item.imageUrl = mappedUrls[0];
                            }
                        }
                        // Handle single imageUrl (legacy format)
                        else if (item.imageUrl) {
                            const matchingImage = documentImages.find(img => 
                                img.originalName.includes(item.imageUrl.replace(/\.(png|jpg|jpeg|gif|webp)$/i, ''))
                            );
                            if (matchingImage) {
                                item.imageUrl = matchingImage.fileUrl;
                                item.imageUrls = [matchingImage.fileUrl]; // Also populate imageUrls array
                            }
                        }
                    }
                });
            }
        }

        const event = await TeacherEvent.create(eventData);
        
        const populatedEvent = await TeacherEvent.findById(event._id)
            .populate('createdBy', 'name email')
            .populate('studentsInvolved', 'name email usn rollNumber')
            .populate('teachersInvolved', 'name email')
            .populate('department', 'name');

        res.status(201).json({
            success: true,
            message: 'Teacher event created successfully',
            data: populatedEvent
        });
    } catch (error) {
        console.error('Error creating teacher event:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.values(error.errors).map(e => ({
                    msg: e.message, path: e.path, type: 'field'
                }))
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error creating teacher event',
            error: error.message
        });
    }
};

// Update teacher event
const updateTeacherEvent = async (req, res) => {
    try {
        let event = await TeacherEvent.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Teacher event not found'
            });
        }

        // Check department access (except for admin)
        if (req.user.role !== 'admin' && event.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update events from another department'
            });
        }

        // Check permissions - regular teachers can only update their own events, HODs can update all department events
        if (req.user.role === 'teacher' && req.user.position !== 'HOD' && 
            event.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this event'
            });
        }

        console.log('📷 PUT Debug - Files received:', req.files);
        console.log('📷 PUT Debug - Request body keys:', Object.keys(req.body));
        console.log('📷 PUT Debug - Document content:', req.body.documentContent);

        // Process document content if provided (new document editor approach)
        let { title, description, eventDate, studentsInvolved, teachersInvolved, outcome } = req.body;
        
        // Handle structured document content (same logic as create)
        if (req.body.documentContent) {
            try {
                const documentContent = JSON.parse(req.body.documentContent);
                
                // Extract title and description from document content
                documentContent.forEach(item => {
                    if (item.type === 'title' && item.content && !title) {
                        title = item.content;
                    } else if (item.type === 'description' && item.content && !description) {
                        description = item.content;
                    }
                });
                
                console.log('📷 PUT Debug - Extracted from doc content - title:', title, 'description:', description?.substring(0, 50) + '...');
            } catch (error) {
                console.error('Error parsing document content:', error);
            }
        }

        // Ensure participants are arrays (fix for single participant issue)
        const studentsArray = studentsInvolved ? (Array.isArray(studentsInvolved) ? studentsInvolved : [studentsInvolved]) : [];
        const teachersArray = teachersInvolved ? (Array.isArray(teachersInvolved) ? teachersInvolved : [teachersInvolved]) : [];
        
        console.log('🔍 UPDATE DEBUG - Normalized arrays - studentsArray:', studentsArray, 'teachersArray:', teachersArray);

        // Validate students exist and are active
        if (studentsArray.length > 0) {
            const students = await User.find({ 
                _id: { $in: studentsArray }, 
                role: 'student',
                isActive: true
            });
            
            if (students.length !== studentsArray.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Some selected students are not found or inactive'
                });
            }
        }

        // Validate teachers exist and are active
        if (teachersArray.length > 0) {
            const teachers = await User.find({ 
                _id: { $in: teachersArray }, 
                role: 'teacher',
                isActive: true
            });
            
            if (teachers.length !== teachersArray.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Some selected teachers are not found or inactive'
                });
            }
        }

        const updateData = {
            title: title || event.title,
            description: description || event.description,
            eventDate: eventDate || event.eventDate,
            studentsInvolved: studentsArray.length > 0 ? studentsArray : event.studentsInvolved,
            teachersInvolved: teachersArray.length > 0 ? teachersArray : event.teachersInvolved,
            outcome: outcome || event.outcome
        };

        // Handle structured document content
        if (req.body.documentContent) {
            try {
                const documentContent = JSON.parse(req.body.documentContent);
                updateData.documentContent = documentContent.map((item, index) => ({
                    ...item,
                    order: index
                }));
            } catch (error) {
                console.error('Error parsing document content for update:', error);
            }
        }

        // Handle regular image uploads and document images (same as create)
        const regularImages = [];
        const documentImages = [];
        
        if (req.files) {
            // Handle regular images
            if (req.files.images) {
                console.log('📷 PUT - Regular images count:', req.files.images.length);
                req.files.images.forEach(file => {
                    regularImages.push({
                        fileName: file.originalname,
                        fileUrl: `/uploads/teacher-events/${file.filename}`,
                        fileType: file.mimetype,
                        fileSize: file.size,
                        uploadDate: new Date()
                    });
                });
            }
            
            // Handle document images
            if (req.files.documentImages) {
                console.log('📷 PUT - Document images count:', req.files.documentImages.length);
                req.files.documentImages.forEach(file => {
                    documentImages.push({
                        fileName: file.originalname,
                        fileUrl: `/uploads/teacher-events/${file.filename}`,
                        fileType: file.mimetype,
                        fileSize: file.size,
                        uploadDate: new Date(),
                        originalName: file.originalname
                    });
                });
            }
            
            // Combine regular images and document images for the images array
            const allImages = [...regularImages, ...documentImages];
            if (allImages.length > 0) {
                updateData.images = [...(event.images || []), ...allImages];
            }
            
            // Update document content with actual image URLs
            if (documentImages.length > 0 && updateData.documentContent) {
                updateData.documentContent.forEach(item => {
                    if (item.type === 'image') {
                        // Handle multiple imageUrls (new format)
                        if (item.imageUrls && Array.isArray(item.imageUrls)) {
                            const mappedUrls = [];
                            item.imageUrls.forEach(originalName => {
                                const matchingImage = documentImages.find(img => 
                                    img.originalName.includes(originalName.replace(/\.(png|jpg|jpeg|gif|webp)$/i, ''))
                                );
                                if (matchingImage) {
                                    mappedUrls.push(matchingImage.fileUrl);
                                }
                            });
                            item.imageUrls = mappedUrls;
                            // Set first image as imageUrl for backward compatibility
                            if (mappedUrls.length > 0) {
                                item.imageUrl = mappedUrls[0];
                            }
                        }
                        // Handle single imageUrl (legacy format)
                        else if (item.imageUrl) {
                            const matchingImage = documentImages.find(img => 
                                img.originalName.includes(item.imageUrl.replace(/\.(png|jpg|jpeg|gif|webp)$/i, ''))
                            );
                            if (matchingImage) {
                                item.imageUrl = matchingImage.fileUrl;
                                item.imageUrls = [matchingImage.fileUrl]; // Also populate imageUrls array
                            }
                        }
                    }
                });
            }
        }

        event = await TeacherEvent.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });

        const populatedEvent = await TeacherEvent.findById(event._id)
            .populate('createdBy', 'name email')
            .populate('studentsInvolved', 'name email usn rollNumber')
            .populate('teachersInvolved', 'name email')
            .populate('department', 'name');

        res.status(200).json({
            success: true,
            message: 'Teacher event updated successfully',
            data: populatedEvent
        });
    } catch (error) {
        console.error('Error updating teacher event:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating teacher event'
        });
    }
};

// Delete teacher event
const deleteTeacherEvent = async (req, res) => {
    try {
        const event = await TeacherEvent.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Teacher event not found'
            });
        }

        // Check department access (except for admin)
        if (req.user.role !== 'admin' && event.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete events from another department'
            });
        }

        // Check permissions - regular teachers can only delete their own events, HODs can delete all department events
        if (req.user.role === 'teacher' && req.user.position !== 'HOD' && 
            event.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this event'
            });
        }

        // Delete associated image files
        if (event.images && event.images.length > 0) {
            event.images.forEach(image => {
                // Handle both old and new URL formats
                const fileName = image.fileUrl.includes('/teacher-events/') 
                    ? image.fileUrl.replace('/uploads/teacher-events/', '')
                    : image.fileUrl.replace('/uploads/', '');
                const filePath = path.join(__dirname, '..', 'uploads', 'teacher-events', fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        await TeacherEvent.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Teacher event deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting teacher event:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting teacher event'
        });
    }
};

// Delete specific image from event
const deleteEventImage = async (req, res) => {
    try {
        const { eventId, imageId } = req.params;
        const event = await TeacherEvent.findById(eventId);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Teacher event not found'
            });
        }

        // Check department access (except for admin)
        if (req.user.role !== 'admin' && event.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to modify events from another department'
            });
        }

        // Check permissions - regular teachers can only modify their own events, HODs can modify all department events
        if (req.user.role === 'teacher' && req.user.position !== 'HOD' && 
            event.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to modify this event'
            });
        }

        const imageIndex = event.images.findIndex(img => img._id.toString() === imageId);
        
        if (imageIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        // Delete file from filesystem
        const image = event.images[imageIndex];
        // Handle both old and new URL formats
        const fileName = image.fileUrl.includes('/teacher-events/') 
            ? image.fileUrl.replace('/uploads/teacher-events/', '')
            : image.fileUrl.replace('/uploads/', '');
        const filePath = path.join(__dirname, '..', 'uploads', 'teacher-events', fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Remove from array
        event.images.splice(imageIndex, 1);
        await event.save();

        res.status(200).json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting image'
        });
    }
};

// Get all users for dropdowns (from all departments)
const getDepartmentUsers = async (req, res) => {
    try {
        const students = await User.find({ 
            role: 'student',
            isActive: true
        }).select('name email usn tempUSN rollNumber department')
          .populate('department', 'name code')
          .sort({ name: 1 });

        const teachers = await User.find({ 
            role: 'teacher',
            isActive: true
        }).select('name email department position')
          .populate('department', 'name code')
          .sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: {
                students,
                teachers
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
};

module.exports = {
    getAllTeacherEvents,
    getTeacherEvent,
    createTeacherEvent,
    updateTeacherEvent,
    deleteTeacherEvent,
    deleteEventImage,
    getDepartmentUsers
};