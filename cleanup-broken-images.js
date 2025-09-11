// Quick script to clean up broken image references
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models (assuming the connection setup)
require('dotenv').config();

const teacherEventSchema = new mongoose.Schema({}, { strict: false });
const TeacherEvent = mongoose.model('TeacherEvent', teacherEventSchema);

async function cleanupBrokenImages() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/department_management');
        console.log('Connected to MongoDB');

        const events = await TeacherEvent.find({ images: { $exists: true, $ne: [] } });
        console.log(`Found ${events.length} events with images`);

        for (const event of events) {
            if (event.images && event.images.length > 0) {
                const validImages = [];
                
                for (const image of event.images) {
                    // Check if file exists
                    const filePath = path.join(__dirname, image.fileUrl.replace('/', ''));
                    if (fs.existsSync(filePath)) {
                        validImages.push(image);
                        console.log(`✅ Valid image: ${image.fileName}`);
                    } else {
                        console.log(`❌ Broken image: ${image.fileName} at ${image.fileUrl}`);
                    }
                }
                
                if (validImages.length !== event.images.length) {
                    console.log(`Updating event ${event._id}: ${event.images.length} -> ${validImages.length} images`);
                    await TeacherEvent.updateOne(
                        { _id: event._id },
                        { $set: { images: validImages } }
                    );
                }
            }
        }

        console.log('Cleanup completed!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanupBrokenImages();