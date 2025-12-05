const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên']
    },
    email: {
        type: String,
        required: [true, 'Vui lòng nhập email'],
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Vui lòng nhập mật khẩu'],
        minlength: 6
    },
    phoneNumber: String,
    address: String,
    avatar: String,
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    // Email verification fields
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    pendingEmail: String, // Email mới đang chờ xác thực
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.correctPassword = async function(candidatePassword) {
    try {
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        return isMatch;
    } catch (error) {
        throw new Error('Error checking password');
    }
};

const User = mongoose.model('User', userSchema);
module.exports = User;
