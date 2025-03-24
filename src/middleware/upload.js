const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create upload directories if they don't exist
const uploadDir = path.join(__dirname, '../../uploads');
const productDir = path.join(uploadDir, 'products');
const farmDir = path.join(uploadDir, 'farms');
const profileDir = path.join(uploadDir, 'profiles');

// Ensure directories exist
for (const dir of [uploadDir, productDir, farmDir, profileDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Define storage strategy
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const type = req.body.type || 'product';
    let destinationPath;
    
    switch (type) {
      case 'farm':
        destinationPath = farmDir;
        break;
      case 'profile':
        destinationPath = profileDir;
        break;
      case 'product':
      default:
        destinationPath = productDir;
        break;
    }
    
    cb(null, destinationPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const originalExt = path.extname(file.originalname);
    const filename = `${uuidv4()}${originalExt}`;
    cb(null, filename);
  }
});

// Define file filter to only accept images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, GIF, and WebP are allowed.'), false);
  }
};

// Initialize multer with configured options
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

module.exports = upload;
