const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Lấy thông tin profile của user hiện tại
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy người dùng'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Upload avatar
exports.uploadAvatar = async (req, res) => {
    try {
        // Kiểm tra multer errors trước
        if (req.fileValidationError) {
            return res.status(400).json({
                status: 'fail',
                message: req.fileValidationError
            });
        }

        if (!req.file) {
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng chọn file ảnh!'
            });
        }

        const avatarUrl = `/uploads/${req.file.filename}`;
        
        // Cập nhật avatar trong database
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: avatarUrl },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy người dùng'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                user,
                avatarUrl
            }
        });
    } catch (err) {
        console.error('Error uploading avatar:', err);
        res.status(500).json({
            status: 'fail',
            message: err.message || 'Có lỗi xảy ra khi cập nhật ảnh đại diện'
        });
    }
};

// Cập nhật thông tin profile (bao gồm email, không bao gồm password và role)
exports.updateProfile = async (req, res) => {
    try {
        // Chỉ cho phép cập nhật các field: name, email, phoneNumber, address
        // Bỏ qua tất cả các field khác (password, role, avatar, etc.)
        const allowedFields = {};
        
        // Cập nhật name nếu có
        if (req.body.name !== undefined && req.body.name !== null) {
            allowedFields.name = req.body.name;
        }
        
        // Cập nhật email nếu có
        if (req.body.email !== undefined && req.body.email !== null && req.body.email !== '') {
            allowedFields.email = req.body.email.toLowerCase();
        }
        
        // Cập nhật phoneNumber nếu có
        if (req.body.phoneNumber !== undefined && req.body.phoneNumber !== null) {
            allowedFields.phoneNumber = req.body.phoneNumber;
        }
        
        // Cập nhật address nếu có
        if (req.body.address !== undefined && req.body.address !== null) {
            allowedFields.address = req.body.address;
        }
        
        // Kiểm tra xem có field nào để cập nhật không
        if (Object.keys(allowedFields).length === 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'Không có thông tin nào để cập nhật'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy người dùng'
            });
        }

        // Nếu có thay đổi email, kiểm tra email mới
        if (allowedFields.email && allowedFields.email !== user.email.toLowerCase()) {
            // Kiểm tra format email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(allowedFields.email)) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Địa chỉ email không hợp lệ'
                });
            }

            // Kiểm tra email mới đã được sử dụng chưa
            const existingUser = await User.findOne({ email: allowedFields.email });
            if (existingUser && existingUser._id.toString() !== user._id.toString()) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Địa chỉ email này đã được sử dụng'
                });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            allowedFields,
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};


// Đổi mật khẩu
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Kiểm tra input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng nhập đầy đủ thông tin'
            });
        }

        // Kiểm tra mật khẩu mới và xác nhận mật khẩu
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                status: 'fail',
                message: 'Mật khẩu mới và xác nhận mật khẩu không khớp'
            });
        }

        // Kiểm tra độ dài mật khẩu mới
        if (newPassword.length < 6) {
            return res.status(400).json({
                status: 'fail',
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
            });
        }

        // Lấy user với password
        const user = await User.findById(req.user._id);

        // Kiểm tra mật khẩu hiện tại
        const isPasswordCorrect = await user.correctPassword(currentPassword);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                status: 'fail',
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        // Cập nhật mật khẩu mới
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Đổi mật khẩu thành công'
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Xóa tài khoản (soft delete - có thể thêm field isActive vào User model)
exports.deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng nhập mật khẩu để xác nhận xóa tài khoản'
            });
        }

        // Lấy user với password
        const user = await User.findById(req.user._id);

        // Kiểm tra mật khẩu
        const isPasswordCorrect = await user.correctPassword(password);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                status: 'fail',
                message: 'Mật khẩu không đúng'
            });
        }

        // Xóa tài khoản
        await User.findByIdAndDelete(req.user._id);

        res.status(200).json({
            status: 'success',
            message: 'Tài khoản đã được xóa thành công'
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Lấy thống kê hoạt động của user
exports.getUserStats = async (req, res) => {
    try {
        const Booking = require('../models/Booking');
        const Review = require('../models/Review');

        // Đếm số booking
        const bookingsCount = await Booking.countDocuments({ user: req.user._id });

        // Đếm số review
        const reviewsCount = await Review.countDocuments({ user: req.user._id });

        // Lấy booking gần nhất
        const recentBookings = await Booking.find({ user: req.user._id })
            .sort('-createdAt')
            .limit(5)
            .populate('tour', 'name destination');

        res.status(200).json({
            status: 'success',
            data: {
                stats: {
                    totalBookings: bookingsCount,
                    totalReviews: reviewsCount
                },
                recentBookings
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// ============ ADMIN ONLY ============

// Lấy danh sách tất cả users (Admin only)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort('-createdAt');

        res.status(200).json({
            status: 'success',
            results: users.length,
            data: {
                users
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Cập nhật thông tin user (Admin only)
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Không cho phép cập nhật password qua route này
        if (req.body.password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Không thể cập nhật mật khẩu qua route này'
            });
        }

        // Chỉ cho phép cập nhật các field: name, email, phoneNumber, address, role
        const allowedFields = {
            name: req.body.name,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            address: req.body.address,
            role: req.body.role
        };

        // Loại bỏ các field undefined
        Object.keys(allowedFields).forEach(key =>
            allowedFields[key] === undefined && delete allowedFields[key]
        );

        const updatedUser = await User.findByIdAndUpdate(
            id,
            allowedFields,
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy người dùng'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                user: updatedUser
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Xóa user (Admin only)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy người dùng'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Xóa người dùng thành công'
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

