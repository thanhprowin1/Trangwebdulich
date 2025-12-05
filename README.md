# Trang Web Đặt Tour Du Lịch

Website đặt tour du lịch với đầy đủ tính năng đặt tour, thanh toán, và xem tour 360 độ.

## Tính năng

- 🔐 Xác thực người dùng (Đăng ký, Đăng nhập)
- 🗺️ Xem danh sách tour và tìm kiếm
- 📅 Đặt tour với lịch chọn ngày
- 💳 Thanh toán qua VNPay và MoMo
- 🌐 Xem tour 360 độ
- ⭐ Đánh giá và bình luận tour
- 👤 Quản lý profile và đặt tour của người dùng
- 🛠️ Dashboard quản trị

## Công nghệ sử dụng

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Cloudinary (lưu trữ ảnh 360)
- VNPay & MoMo Payment Integration

### Frontend
- React.js
- Material-UI
- React Router
- Pannellum (360 viewer)
- Axios

## Cài đặt

### Yêu cầu
- Node.js (v14 trở lên)
- MongoDB
- Tài khoản Cloudinary (cho ảnh 360)

### Backend

```bash
# Cài đặt dependencies
npm install

# Tạo file config.env trong thư mục backend
# Copy nội dung từ config.env.example và điền thông tin của bạn

# Chạy server
npm start
# hoặc
npm run dev  # với nodemon
```

### Frontend

```bash
cd frontend

# Cài đặt dependencies
npm install

# Chạy ứng dụng
npm start
```

Ứng dụng sẽ chạy tại:
- Backend: http://localhost:5001
- Frontend: http://localhost:3000

## Cấu hình

Tạo file `backend/config.env` với các thông tin sau:

```env
NODE_ENV=development
PORT=5001
DATABASE_URL=mongodb://localhost:27017/travel-booking
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=90d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# VNPay Configuration
VNPAY_TMN_CODE=your-tmn-code
VNPAY_HASH_SECRET=your-hash-secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# MoMo Payment Configuration
MOMO_PARTNER_CODE=your-partner-code
MOMO_ACCESS_KEY=your-access-key
MOMO_SECRET_KEY=your-secret-key
```

## API Documentation

Xem file `docs/api-endpoints.html` hoặc truy cập Swagger UI khi server đang chạy.

## License

ISC

