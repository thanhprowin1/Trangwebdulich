const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const tourRoutes = require('./routes/tourRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const userRoutes = require('./routes/userRoutes');
const extensionRoutes = require('./routes/extensionRoutes');

dotenv.config({ path: path.join(__dirname, 'config.env') });

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Log requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    if (req.path.includes('/avatar')) {
        console.log('Avatar route detected:', req.method, req.path);
    }
    next();
});

// Routes
app.use('/api/v1/tours', tourRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/extensions', extensionRoutes);

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Connect to Database
console.log('Connecting to MongoDB...');
console.log('Database URL:', process.env.DATABASE_URL);

mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB connection successful!');
})
.catch((err) => {
    console.error('MongoDB connection error:', err);
});

const port = process.env.PORT || 5001;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
