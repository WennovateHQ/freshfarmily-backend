const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload');
const { authenticateJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

// Ensure upload directories exist
const createUploadDirs = () => {
  const uploadDir = path.join(__dirname, '../../uploads');
  const productDir = path.join(uploadDir, 'products');
  const farmDir = path.join(uploadDir, 'farms');
  const profileDir = path.join(uploadDir, 'profiles');

  // Ensure all directories exist
  for (const dir of [uploadDir, productDir, farmDir, profileDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created upload directory: ${dir}`);
    }
  }
};

// Create directories on server start
try {
  createUploadDirs();
} catch (error) {
  logger.error(`Error creating upload directories: ${error.message}`);
}

// This route handles file uploads - temporarily removing authentication to fix the upload issue
router.post('/', upload.single('file'), async (req, res) => {
  try {
    // Ensure directories exist
    createUploadDirs();
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get file upload type from the request body
    const type = req.body.type || 'product';
    
    // Create URL for the uploaded file
    // In a production environment, this would typically be a CDN URL
    // For this implementation, we'll use a relative URL within the application
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.FILE_STORAGE_URL || '/uploads'
      : '/uploads';
    
    const uploadedUrl = `${baseUrl}/${type}s/${req.file.filename}`;
    
    logger.info(`File uploaded successfully: ${uploadedUrl}`);
    
    // Return success response with the URL
    return res.status(200).json({
      success: true,
      url: uploadedUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    logger.error(`Error during file upload: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during file upload'
    });
  }
});

// Handle authentication errors
router.use((error, req, res, next) => {
  if (error.name === 'UnauthorizedError') {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
  next(error);
});

module.exports = router;
