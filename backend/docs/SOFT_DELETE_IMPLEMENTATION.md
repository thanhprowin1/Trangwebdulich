# Soft Delete Implementation - Tóm tắt các thay đổi

## [object Object]ổng quan

Đã triển khai tính năng **Soft Delete (xóa mềm)** cho Tour model. Thay vì xóa vĩnh viễn, tour sẽ được đánh dấu là đã xóa bằng cách cập nhật trường `deletedAt`.

## 🔄 Các thay đổi thực hiện

### 1. **Tour Model** (`backend/models/Tour.js`)

**Thêm trường:**
```javascript
deletedAt: {
    type: Date,
    default: null
}
```

**Lợi ích:**
- Lưu giữ dữ liệu lịch sử
- Có thể khôi phục tour bất cứ lúc nào
- Không ảnh hưởng đến booking hiện tại

### 2. **Soft Delete Helper** (`backend/utils/softDeleteHelper.js`) - NEW

Tạo utility functions để lọc tour đã xóa:

```javascript
// Thêm điều kiện lọc vào query
excludeDeleted(query)

// Thêm điều kiện lọc vào filter object
excludeDeletedFromFilter(filter)
```

### 3. **Tour Controller** (`backend/controllers/tourController.js`)

#### Hàm `deleteTour` - Cập nhật
- Thay vì xóa vĩnh viễn, chỉ cập nhật `deletedAt`
- Trả về status 200 thay vì 204
- Trả về tour đã xóa trong response

#### Hàm `restoreTour` - NEW
- Khôi phục tour bằng cách set `deletedAt = null`
- Chỉ có admin mới có quyền
- Kiểm tra tour đã bị xóa trước khi khôi phục

#### Hàm `getDeletedTours` - NEW
- Lấy danh sách tất cả tour đã bị xóa
- Sắp xếp theo `deletedAt` giảm dần
- Chỉ có admin mới có quyền

#### Các hàm khác - Cập nhật
- `getAllTours`: Sử dụng `excludeDeletedFromFilter()` để lọc tour đã xóa
- `getTour`: Sử dụng `excludeDeleted()` để lọc tour đã xóa
- `getToursByDestination`: Sử dụng `excludeDeleted()` để lọc tour đã xóa
- `getDestinations`: Chỉ lấy destination từ tour chưa bị xóa

### 4. **Tour Routes** (`backend/routes/tourRoutes.js`)

**Thêm routes mới:**

```javascript
// Lấy danh sách tour đã xóa (admin only)
GET /api/v1/tours/admin/deleted

// Khôi phục tour đã xóa (admin only)
PATCH /api/v1/tours/:id/restore
```

## [object Object]uy trình hoạt động

### Xóa Tour
```
DELETE /api/v1/tours/:id
    ↓
Kiểm tra tour có tồn tại
    ↓
Cập nhật deletedAt = new Date()
    ↓
Tour không xuất hiện trong danh sách
    ↓
Dữ liệu vẫn được lưu giữ
```

### Khôi phục Tour
```
PATCH /api/v1/tours/:id/restore
    ↓
Kiểm tra tour đã bị xóa
    ↓
Cập nhật deletedAt = null
    ↓
Tour lại xuất hiện trong danh sách
```

### Lấy Tour Đã Xóa
```
GET /api/v1/tours/admin/deleted
    ↓
Lấy tất cả tour có deletedAt !== null
    ↓
Sắp xếp theo deletedAt giảm dần
```

## 🧪 Test

**File test:** `backend/testSoftDelete.js`

**Chạy test:**
```bash
cd backend
node testSoftDelete.js
```

**Kết quả test:**
- ✅ Tạo tour
- ✅ Lấy tour chưa xóa
- ✅ Soft delete tour
- ✅ Tour không tìm thấy khi lọc
- ✅ Tìm thấy tour đã xóa khi bỏ qua filter
- ✅ Khôi phục tour
- ✅ Tour lại xuất hiện
- ✅ getDestinations chỉ lấy tour chưa xóa

## [object Object] Endpoints

### 1. Xóa Tour (Soft Delete)
```
DELETE /api/v1/tours/:id
Authorization: Bearer <admin_token>

Response (200 OK):
{
  "status": "success",
  "message": "Tour đã được xóa thành công",
  "data": {
    "tour": {
      "_id": "...",
      "name": "...",
      "deletedAt": "2024-12-13T02:22:27.000Z"
    }
  }
}
```

### 2. Khôi phục Tour
```
PATCH /api/v1/tours/:id/restore
Authorization: Bearer <admin_token>

Response (200 OK):
{
  "status": "success",
  "message": "Tour đã được khôi phục thành công",
  "data": {
    "tour": {
      "_id": "...",
      "name": "...",
      "deletedAt": null
    }
  }
}
```

### 3. Lấy Danh sách Tour Đã Xóa
```
GET /api/v1/tours/admin/deleted
Authorization: Bearer <admin_token>

Response (200 OK):
{
  "status": "success",
  "results": 2,
  "data": {
    "tours": [
      {
        "_id": "...",
        "name": "...",
        "deletedAt": "2024-12-13T02:22:27.000Z"
      }
    ]
  }
}
```

## 🔐 Quyền truy cập

- **Xóa tour**: Admin only
- **Khôi phục tour**: Admin only
- **Xem tour đã xóa**: Admin only
- **Lấy tour**: Public (chỉ tour chưa xóa)

## ⚠️ Lưu ý quan trọng

1. **Xóa mềm không ảnh hưởng đến booking**: Các booking liên quan vẫn tồn tại
2. **Tour đã xóa không xuất hiện công khai**: Chỉ admin mới thấy
3. **Có thể khôi phục bất cứ lúc nào**: Không mất dữ liệu
4. **Xóa vĩnh viễn**: Sử dụng `findByIdAndDelete()` nếu cần xóa hoàn toàn

## 📚 Tài liệu liên quan

- `backend/docs/SOFT_DELETE_GUIDE.md` - Hướng dẫn chi tiết sử dụng
- `backend/utils/softDeleteHelper.js` - Helper functions
- `backend/testSoftDelete.js` - Test file

## ✅ Checklist

- [x] Thêm trường `deletedAt` vào Tour model
- [x] Tạo helper functions để lọc tour đã xóa
- [x] Cập nhật hàm `deleteTour` để soft delete
- [x] Tạo hàm `restoreTour` để khôi phục
- [x] Tạo hàm `getDeletedTours` để lấy danh sách xóa
- [x] Cập nhật các query để lọc tour đã xóa
- [x] Thêm routes mới
- [x] Tạo test file
- [x] Tạo tài liệu hướng dẫn

