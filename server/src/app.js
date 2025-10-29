const express = require('express');
const cors = require('cors');
const session = require('express-session');

const app = express();

// CORS configuration - must allow credentials for session cookies
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://127.0.0.1:5173',
  credentials: true
}));

app.use(express.json());

// Session middleware - must come before routes
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production (requires HTTPS)
    httpOnly: true, // prevents JavaScript access to cookie
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', require('./routes'));

module.exports = app;
