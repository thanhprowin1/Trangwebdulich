# Hướng dẫn Soft Delete cho Tour

## Giới thiệu

Soft Delete (xóa mềm) là một kỹ thuật lưu giữ dữ liệu trong cơ sở dữ liệu nhưng đánh dấu nó là đã bị xóa. Thay vì xóa vĩnh viễn, chúng ta chỉ cập nhật trường `deletedAt` với thời gian xóa.

## Lợi ích

- ✅ Khôi phục dữ liệu nếu xóa nhầm
- ✅ Giữ lại lịch sử dữ liệu
- ✅ Không ảnh hưởng đến các booking liên quan
- ✅ Dễ dàng kiểm toán và theo dõi

## Cách hoạt động

### 1. Xóa Tour (Soft Delete)

**Endpoint:** `DELETE /api/v1/tours/:id`

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/v1/tours/123abc \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Tour đã được xóa thành công",
  "data": {
    "tour": {
      "_id": "123abc",
      "name": "Tour Hà Nội",
      "deletedAt": "2024-12-12T19:19:28.239Z"
    }
  }
}
```

**Điều gì xảy ra:**
- Tour được đánh dấu là đã xóa (deletedAt được set)
- Tour không còn xuất hiện trong danh sách getAllTours
- Dữ liệu vẫn được lưu giữ trong database

### 2. Khôi phục Tour

**Endpoint:** `PATCH /api/v1/tours/:id/restore`

**Request:**
```bash
curl -X PATCH http://localhost:3000/api/v1/tours/123abc/restore \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Tour đã được khôi phục thành công",
  "data": {
    "tour": {
      "_id": "123abc",
      "name": "Tour Hà Nội",
      "deletedAt": null
    }
  }
}
```

### 3. Xem danh sách Tour đã xóa

**Endpoint:** `GET /api/v1/tours/admin/deleted`

**Request:**
```bash
curl http://localhost:3000/api/v1/tours/admin/deleted \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "status": "success",
  "results": 2,
  "data": {
    "tours": [
      {
        "_id": "123abc",
        "name": "Tour Hà Nội",
        "deletedAt": "2024-12-12T19:19:28.239Z"
      },
      {
        "_id": "456def",
        "name": "Tour Sapa",
        "deletedAt": "2024-12-11T10:30:00.000Z"
      }
    ]
  }
}
```

## Các thay đổi trong mô hình

### Tour Schema
```javascript
{
  // ... các field khác
  deletedAt: {
    type: Date,
    default: null
  }
}
```

## Các thay đổi trong Controller

### deleteTour
- Thay vì xóa vĩnh viễn, chỉ cập nhật `deletedAt`
- Trả về status 200 thay vì 204

### restoreTour (Mới)
- Khôi phục tour bằng cách set `deletedAt` về `null`
- Chỉ có admin mới có quyền

### getDeletedTours (Mới)
- Lấy danh sách tất cả tour đã bị xóa
- Chỉ có admin mới có quyền

## Các thay đổi trong Query

### Middleware tự động lọc
Tất cả query `find()` sẽ tự động lọc tour có `deletedAt = null`:

```javascript
// Tự động lọc tour đã xóa
const tours = await Tour.find(); // Chỉ lấy tour chưa xóa

// Lấy cả tour đã xóa (nếu cần)
const allTours = await Tour.find({ deletedAt: { $ne: null } });
```

### getDestinations
- Chỉ lấy destination từ tour chưa bị xóa

## Quy trình xóa Tour

```
1. Admin gọi DELETE /api/v1/tours/:id
   ↓
2. Controller kiểm tra tour có tồn tại
   ↓
3. Cập nhật deletedAt = new Date()
   ↓
4. Tour không còn xuất hiện trong danh sách
   ↓
5. Dữ liệu vẫn được lưu giữ
```

## Quy trình khôi phục Tour

```
1. Admin gọi PATCH /api/v1/tours/:id/restore
   ↓
2. Controller kiểm tra tour đã bị xóa
   ↓
3. Cập nhật deletedAt = null
   ↓
4. Tour lại xuất hiện trong danh sách
```

## Lưu ý quan trọng

- ⚠️ Chỉ admin mới có quyền xóa/khôi phục tour
- ⚠️ Xóa mềm không ảnh hưởng đến booking hiện tại
- ⚠️ Tour đã xóa không xuất hiện trong danh sách công khai
- ⚠️ Có thể khôi phục tour bất cứ lúc nào

## Ví dụ sử dụng trong Frontend

### Xóa tour
```javascript
async function deleteTour(tourId) {
  const response = await fetch(`/api/v1/tours/${tourId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}
```

### Khôi phục tour
```javascript
async function restoreTour(tourId) {
  const response = await fetch(`/api/v1/tours/${tourId}/restore`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}
```

### Xem tour đã xóa
```javascript
async function getDeletedTours() {
  const response = await fetch('/api/v1/tours/admin/deleted', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}
```

