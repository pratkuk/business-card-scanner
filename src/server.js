require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const pool = require('./database');
const { Anthropic } = require('@anthropic-ai/sdk');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        cb(null, 'card-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Upload endpoint
app.post('/upload', upload.single('card'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');

        const message = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            messages: [{
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Extract these fields from the business card image in JSON format: full_name, title, company, email, phone, website. Use empty string if field not found."
                    },
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: req.file.mimetype,
                            data: base64Image
                        }
                    }
                ]
            }]
        });

        const extractedInfo = JSON.parse(message.content[0].text);
        const nameParts = extractedInfo.full_name.split(' ');
        
        const result = await pool.query(
            `INSERT INTO contacts (
                first_name, last_name, title, company, 
                email, phone, website, source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [
                nameParts[0],
                nameParts.slice(1).join(' '),
                extractedInfo.title,
                extractedInfo.company,
                extractedInfo.email,
                extractedInfo.phone,
                extractedInfo.website,
                'business_card'
            ]
        );

        res.json({
            extracted: extractedInfo,
            saved: result.rows[0]
        });

        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
        });

    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get contacts endpoint
app.get('/api/contacts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));