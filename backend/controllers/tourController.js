const Tour = require('../models/Tour');
const { excludeDeleted, excludeDeletedFromFilter } = require('../utils/softDeleteHelper');

exports.createTour = async (req, res) => {
    try {
        const newTour = await Tour.create(req.body);
        res.status(201).json({
            status: 'success',
            data: {
                tour: newTour
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

exports.getAllTours = async (req, res) => {
    try {
        // Xử lý filtering
        const queryObj = { ...req.query };
        const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'startDate', 'endDate', 'guests', 'destination'];
        excludedFields.forEach(el => delete queryObj[el]);

        // Advanced filtering (price, duration, etc.)
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

        const basicFilter = JSON.parse(queryStr);

        // Text search: name, destination, description via `search` query param
        let mongoFilter = excludeDeletedFromFilter(basicFilter);
        if (req.query.search) {
            const regex = new RegExp(req.query.search, 'i');
            mongoFilter = {
                ...mongoFilter,
                $or: [
                    { name: regex },
                    { destination: regex },
                    { description: regex }
                ]
            };
        }

        // Filter by start date (tìm tour có ngày khởi hành trong startDates >= ngày tìm kiếm)
        if (req.query.startDate) {
            let searchDate = new Date(req.query.startDate);
            if (!isNaN(searchDate.getTime())) {
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                // Đảm bảo ngày tìm kiếm không ở quá khứ
                if (searchDate < startOfToday) {
                    searchDate = startOfToday;
                }
                
                // Reset thời gian về 00:00:00 để so sánh chỉ ngày (không tính giờ/phút/giây)
                searchDate.setHours(0, 0, 0, 0);
                
                // Tìm tour có startDates chứa ít nhất một ngày khởi hành >= ngày tìm kiếm
                // Sử dụng $elemMatch để tìm trong mảng startDates
                mongoFilter.startDates = {
                    $elemMatch: { 
                        $gte: searchDate
                    }
                };
            }
        }

        // Filter by number of guests (maxGroupSize >= số khách)
        if (req.query.guests) {
            const guestCount = parseInt(req.query.guests);
            if (!isNaN(guestCount)) {
                mongoFilter.maxGroupSize = { $gte: guestCount };
            }
        }

        let query = Tour.find(mongoFilter);

        // Sorting
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            // Default sort by createdAt descending
            query = query.sort('-createdAt');
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 9; // 9 tours per page (3x3 grid)
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalTours = await Tour.countDocuments(mongoFilter);
        const totalPages = Math.ceil(totalTours / limit);

        query = query.skip(skip).limit(limit);

        // Execute query
        let tours = await query;

        // Tính toán bookingsCount từ database cho mỗi tour
        const Booking = require('../models/Booking');
        tours = await Promise.all(tours.map(async (tour) => {
            const bookingsCount = await Booking.countDocuments({ tour: tour._id });
            tour.bookingsCount = bookingsCount;
            return tour;
        }));

        res.status(200).json({
            status: 'success',
            results: tours.length,
            totalResults: totalTours,
            currentPage: page,
            totalPages: totalPages,
            data: {
                tours
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message
        });
    }
};

exports.getTour = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Fetching tour detail for id:', id);
        let tour = await excludeDeleted(Tour.findById(id));
        if (!tour) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy tour'
            });
        }

        // Tính toán bookingsCount từ database
        const Booking = require('../models/Booking');
        const bookingsCount = await Booking.countDocuments({ tour: id });
        tour.bookingsCount = bookingsCount;

        res.status(200).json({
            status: 'success',
            data: {
                tour
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: 'Không tìm thấy tour'
        });
    }
};

exports.updateTour = async (req, res) => {
    try {
        // Debug: Log dữ liệu nhận được
        console.log('Updating tour:', req.params.id);
        console.log('Received data:', {
            mapCenter: req.body.mapCenter,
            hotspots: req.body.hotspots,
            hotspotsCount: req.body.hotspots?.length || 0
        });
        
        // Lấy tour cũ để so sánh giá
        const oldTour = await Tour.findById(req.params.id);
        if (!oldTour) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy tour'
            });
        }

        // Cập nhật tour
        const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        
        // Debug: Log dữ liệu sau khi cập nhật
        console.log('Tour updated:', {
            mapCenter: tour.mapCenter,
            hotspots: tour.hotspots,
            hotspotsCount: tour.hotspots?.length || 0
        });

        if (!tour) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy tour'
            });
        }

        // Nếu giá tour thay đổi, cập nhật giá trong các booking chưa thanh toán
        if (req.body.price && req.body.price !== oldTour.price) {
            const Booking = require('../models/Booking');
            
            // Tìm tất cả booking của tour này chưa thanh toán (pending hoặc confirmed nhưng paid = false)
            const bookingsToUpdate = await Booking.find({
                tour: tour._id,
                $or: [
                    { status: 'pending' },
                    { status: 'confirmed', paid: false }
                ]
            });

            // Cập nhật giá cho từng booking (price mới = giá tour mới * số người)
            for (const booking of bookingsToUpdate) {
                const newPrice = tour.price * booking.numberOfPeople;
                await Booking.findByIdAndUpdate(booking._id, {
                    price: newPrice
                });
            }

            console.log(`Đã cập nhật giá cho ${bookingsToUpdate.length} booking chưa thanh toán của tour ${tour._id}`);
        }

        res.status(200).json({
            status: 'success',
            data: {
                tour
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message
        });
    }
};

exports.deleteTour = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra tour có tồn tại không (chỉ tour chưa bị xóa)
        const tour = await Tour.findOne({ _id: id, deletedAt: null });
        if (!tour) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy tour'
            });
        }

        // Thực hiện soft delete - chỉ cập nhật deletedAt
        // Sử dụng findOneAndUpdate với điều kiện deletedAt: null để đảm bảo chỉ soft delete tour chưa xóa
        const deletedTour = await Tour.findOneAndUpdate(
            { _id: id, deletedAt: null },
            { deletedAt: new Date() },
            { new: true }
        );

        res.status(200).json({
            status: 'success',
            message: 'Tour đã được xóa thành công',
            data: {
                tour: deletedTour
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Lấy tours theo destination
exports.getToursByDestination = async (req, res) => {
    try {
        const { destination } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 6;

        if (!destination) {
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng cung cấp điểm đến'
            });
        }

        const tours = await excludeDeleted(Tour.find({
            destination: new RegExp(destination, 'i')
        }))
        .limit(limit)
        .sort('-createdAt');

        // Tính bookingsCount cho mỗi tour
        const Booking = require('../models/Booking');
        const toursWithBookings = await Promise.all(tours.map(async (tour) => {
            const bookingsCount = await Booking.countDocuments({ tour: tour._id });
            const tourObj = tour.toObject();
            tourObj.bookingsCount = bookingsCount;
            return tourObj;
        }));

        res.status(200).json({
            status: 'success',
            results: toursWithBookings.length,
            data: {
                tours: toursWithBookings
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Lấy danh sách các destination có tour (chỉ tour chưa bị xóa)
exports.getDestinations = async (req, res) => {
    try {
        const destinations = await Tour.distinct('destination', { deletedAt: null });

        res.status(200).json({
            status: 'success',
            results: destinations.length,
            data: {
                destinations: destinations.filter(d => d && d.trim() !== '')
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Khôi phục tour đã bị xóa (soft delete)
exports.restoreTour = async (req, res) => {
    try {
        const { id } = req.params;

        // Tìm tour đã bị xóa (bỏ qua filter soft delete bằng cách truy cập trực tiếp database)
        const mongoose = require('mongoose');

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'fail',
                message: 'ID tour không hợp lệ'
            });
        }

        const tour = await Tour.collection.findOne({
            _id: new mongoose.Types.ObjectId(id),
            deletedAt: { $ne: null }
        });

        if (!tour) {
            return res.status(404).json({
                status: 'fail',
                message: 'Không tìm thấy tour đã bị xóa'
            });
        }

        // Khôi phục tour - đặt deletedAt về null
        const restoredTour = await Tour.findByIdAndUpdate(
            id,
            { deletedAt: null },
            { new: true, runValidators: false }
        );

        res.status(200).json({
            status: 'success',
            message: 'Tour đã được khôi phục thành công',
            data: {
                tour: restoredTour
            }
        });
    } catch (err) {
        res.status(500).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Lấy danh sách tour đã bị xóa (chỉ cho admin)
exports.getDeletedTours = async (req, res) => {
    try {
        // Lấy tất cả tour có deletedAt không null
        // Sử dụng collection để bypass middleware soft delete
        const deletedTours = await Tour.collection
            .find({ deletedAt: { $ne: null } })
            .sort({ deletedAt: -1 })
            .toArray();

        res.status(200).json({
            status: 'success',
            results: deletedTours.length,
            data: {
                tours: deletedTours
            }
        });
    } catch (err) {
        console.error('Error in getDeletedTours:', err);
        res.status(500).json({
            status: 'fail',
            message: err.message || 'Có lỗi xảy ra khi lấy danh sách tour đã xóa'
        });
    }
};