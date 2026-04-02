import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateToken } from '../middleware/auth.js';
import { update } from '../db/database.js';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload avatar image
router.post('/avatar', authenticateToken, async (req, res) => {
  try {
    const { image } = req.body; // base64 data URL

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Validate it's an image data URL
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Limit size: base64 ~1.37x actual size, 2MB image → ~2.74MB base64
    if (image.length > 3 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image must be less than 2MB' });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: 'PharmaDesk',
      public_id: `avatar_user_${req.user.id}_${Date.now()}`,
      overwrite: true,
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
    });

    // Save avatar URL to user record
    await update('UPDATE users SET avatar = ? WHERE id = ?', [result.secure_url, req.user.id]);

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;
