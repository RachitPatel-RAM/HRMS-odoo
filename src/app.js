const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Security Middleware
// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com"],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"], // Allow local devtools/API connections
        },
    },
}));
app.use(cors()); // Configure origin in production
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Static Files - Serve the HTML provided by user
// Assuming the user's index.html is in the root or a 'public' folder. 
// I'll assume root for now based on file list, or I will move it to public.
// Based on "Serve Static Files (HTML/CSS)" task, I will create a public dir later or serve from root.
// For now, let's serve 'public' and I will move the html there in a later step.
app.use(express.static(path.join(__dirname, '../public')));

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);


// Routes Placeholder
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// app.use('/api/auth', authRoutes);
// app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;
