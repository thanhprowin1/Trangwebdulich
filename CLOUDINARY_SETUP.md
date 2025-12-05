# Hướng dẫn cấu hình Cloudinary cho ảnh 360°

## Bước 1: Đăng ký tài khoản Cloudinary

1. Truy cập https://cloudinary.com/users/register/free
2. Đăng ký tài khoản miễn phí (có 25GB storage và 25GB bandwidth/tháng)
3. Xác nhận email và đăng nhập

## Bước 2: Lấy thông tin API

1. Sau khi đăng nhập, vào **Dashboard** (https://cloudinary.com/console)
2. Ở trang Dashboard, bạn sẽ thấy:
   - **Cloud name**: Tên cloud của bạn
   - **API Key**: Khóa API
   - **API Secret**: Secret key (bấm "Reveal" để hiện)

## Bước 3: Cấu hình trong backend

1. Mở file `backend/config.env`
2. Tìm phần **Cloudinary Configuration**
3. Điền thông tin của bạn:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Lưu ý**: Thay `your-cloud-name`, `your-api-key`, `your-api-secret` bằng giá trị thực từ Dashboard của bạn.

## Bước 4: Khởi động lại backend

Sau khi cấu hình xong, khởi động lại server backend:

```bash
npm run dev
```

## Bước 5: Test upload

1. Đăng nhập vào Admin Dashboard
2. Tạo hoặc chỉnh sửa tour
3. Ở phần "Ảnh 360°", chọn file ảnh panorama (tối đa 20MB)
4. Upload và kiểm tra xem có thành công không

## Lợi ích của Cloudinary

- ✅ **Miễn phí**: 25GB storage và 25GB bandwidth/tháng
- ✅ **CDN tự động**: Ảnh được phân phối qua CDN toàn cầu, load nhanh
- ✅ **Tối ưu tự động**: Cloudinary tự động tối ưu ảnh
- ✅ **Transformations**: Có thể resize, crop, filter ảnh qua URL
- ✅ **Dễ scale**: Khi cần có thể nâng cấp plan

## Troubleshooting

### Lỗi "Cloudinary chưa được cấu hình"
- Kiểm tra lại file `backend/config.env` đã điền đầy đủ 3 biến chưa
- Đảm bảo không có khoảng trắng thừa hoặc dấu ngoặc kép
- Khởi động lại backend sau khi sửa config

### Lỗi "Invalid API credentials"
- Kiểm tra lại Cloud name, API Key, API Secret từ Dashboard
- Đảm bảo copy đúng, không thiếu ký tự

### Upload bị lỗi
- Kiểm tra file size (tối đa 20MB)
- Kiểm tra định dạng file (chỉ chấp nhận jpeg, jpg, png)
- Xem console log của backend để biết lỗi chi tiết

