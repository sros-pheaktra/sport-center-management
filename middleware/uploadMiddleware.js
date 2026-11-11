
const multer = require('multer')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Folder where uploaded images are stored
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2 MB

// Only JPEG and PNG are accepted. The extension is derived from the
// mimetype we verified — the client's original filename is never used.
const ALLOWED_IMAGE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png'
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR)
    },
    filename: (req, file, cb) => {
        // Server-generated filename: a random UUID plus a safe extension
        const extension = ALLOWED_IMAGE_TYPES[file.mimetype]
        cb(null, crypto.randomUUID() + extension)
    }
})

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_IMAGE_SIZE
    },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES[file.mimetype]) {
            cb(null, true)
        } else {
            cb(new Error('ONLY_JPEG_OR_PNG'))
        }
    }
})

// Wraps multer so file-type and size problems come back as clean
// JSON error messages instead of a crash.
const uploadFacilityImage = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (!err) {
            return next()
        }

        // Never keep a partially written file around
        if (req.file) {
            fs.unlink(req.file.path, () => {})
        }

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'Image must be 2 MB or smaller'
            })
        }

        if (err.message === 'ONLY_JPEG_OR_PNG') {
            return res.status(400).json({
                message: 'Image must be a JPEG or PNG file'
            })
        }

        return res.status(400).json({
            message: 'Image upload failed. Please try again'
        })
    })
}

module.exports = {
    uploadFacilityImage,
    UPLOADS_DIR
}
