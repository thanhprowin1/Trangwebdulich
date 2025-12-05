const User = require('../models/User');
const jwt = require('jsonwebtoken');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

exports.protect = async (req, res, next) => {
    try {
        // 1) Check if token exists
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: 'You are not logged in! Please log in to get access.'
            });
        }

        // 2) Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3) Check if user still exists
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                status: 'fail',
                message: 'The user belonging to this token no longer exists.'
            });
        }

        // Grant access to protected route
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({
            status: 'fail',
            message: 'Invalid token or authorization error'
        });
    }
};

exports.signup = async (req, res) => {
    try {
        console.log('Signup request received:', req.body);

        const newUser = await User.create({
            name: req.body.name,
            email: req.body.email.toLowerCase(),
            password: req.body.password,
            phoneNumber: req.body.phoneNumber,
            address: req.body.address
        });

        console.log('User created:', newUser);

        const token = signToken(newUser._id);

        // Không gửi password về client
        newUser.password = undefined;

        res.status(201).json({
            status: 'success',
            token,
            data: {
                user: newUser
            }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        console.log('Login attempt for:', req.body.email);
        const { email, password } = req.body;

        // 1) Kiểm tra email và password có tồn tại
        if (!email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng nhập email và mật khẩu'
            });
        }

        // 2) Tìm user
        const user = await User.findOne({ email: email.toLowerCase() });
        console.log('Found user:', user ? 'Yes' : 'No');

        if (!user) {
            return res.status(401).json({
                status: 'fail',
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // 3) Kiểm tra password
        const isPasswordCorrect = await user.correctPassword(password);
        console.log('Password check result:', isPasswordCorrect);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                status: 'fail',
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // 4) Nếu mọi thứ ok, gửi token về client
        const token = signToken(user._id);

        res.status(200).json({
            status: 'success',
            token,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(400).json({
            status: 'fail',
            message: 'Đã có lỗi xảy ra khi đăng nhập'
        });
    }
};

// Role-based authorization
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'fail',
                message: 'Bạn không có quyền truy cập.'
            });
        }
        next();
    };
};