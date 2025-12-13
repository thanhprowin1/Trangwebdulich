# Tour Extension API Documentation

## Tính năng Mở rộng Tour

Cho phép người dùng mở rộng tour đã đặt bằng cách:
- **Tăng số ngày** của tour
- **Tăng số người** tham gia
- **Tính giá tự động** dựa trên số ngày và số người mở rộng

---

## Công thức tính giá

```
Giá mỗi ngày = Giá tour / Số ngày tour
Giá mỗi người = Giá tour / Số người tối đa

Giá mở rộng = (Giá mỗi ngày × Số ngày mở rộng) + (Giá mỗi người × Số người mở rộng)
```

**Ví dụ:**
- Tour: 10 ngày, 20 người, giá 2,000,000 VND
- Giá mỗi ngày = 2,000,000 / 10 = 200,000 VND
- Giá mỗi người = 2,000,000 / 20 = 100,000 VND
- Mở rộng: +2 ngày, +5 người
- Giá mở rộng = (200,000 × 2) + (100,000 × 5) = 400,000 + 500,000 = 900,000 VND

---

## API Endpoints

### 1. Yêu cầu mở rộng tour
**POST** `/api/v1/extensions/:bookingId/request`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "additionalDays": 2,
  "additionalPeople": 5
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "extension": {
      "_id": "...",
      "booking": "...",
      "tour": "...",
      "user": "...",
      "additionalDays": 2,
      "additionalPeople": 5,
      "pricePerDay": 200000,
      "pricePerPerson": 100000,
      "extensionPrice": 900000,
      "status": "pending",
      "requestedAt": "2024-12-12T15:02:25.488Z"
    }
  }
}
```

---

### 2. Lấy danh sách mở rộng của user
**GET** `/api/v1/extensions/my-extensions`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "results": 2,
  "data": {
    "extensions": [...]
  }
}
```

---

### 3. Admin: Lấy tất cả yêu cầu mở rộng
**GET** `/api/v1/extensions?status=pending`

**Query Parameters:**
- `status` (optional): pending, approved, rejected, cancelled

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "status": "success",
  "results": 5,
  "data": {
    "extensions": [...]
  }
}
```

---

### 4. Admin: Phê duyệt mở rộng
**PATCH** `/api/v1/extensions/:extensionId/approve`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body (optional):**
```json
{
  "adminNote": "Đã phê duyệt. Vui lòng thanh toán thêm."
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Yêu cầu mở rộng đã được phê duyệt",
  "data": {
    "extension": {
      "status": "approved",
      "approvedAt": "2024-12-12T15:02:25.488Z"
    }
  }
}
```

**Tác dụng:**
- Cập nhật extension status → "approved"
- Cập nhật booking:
  - numberOfPeople += additionalPeople
  - price += extensionPrice
  - extension.extensionStatus = "approved"

---

### 5. Admin: Từ chối mở rộng
**PATCH** `/api/v1/extensions/:extensionId/reject`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body (optional):**
```json
{
  "adminNote": "Không đủ chỗ trống cho số người mở rộng."
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Yêu cầu mở rộng đã bị từ chối",
  "data": {
    "extension": {
      "status": "rejected",
      "rejectedAt": "2024-12-12T15:02:25.488Z"
    }
  }
}
```

---

### 6. Hủy yêu cầu mở rộng (User)
**DELETE** `/api/v1/extensions/:extensionId/cancel`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Yêu cầu mở rộng đã được hủy",
  "data": {
    "extension": {
      "status": "cancelled"
    }
  }
}
```

---

## Booking Model - Extension Fields

```javascript
extension: {
  additionalDays: Number,        // Số ngày mở rộng
  additionalPeople: Number,      // Số người mở rộng
  extensionPrice: Number,        // Giá mở rộng
  totalPrice: Number,            // Giá gốc + giá mở rộng
  extensionStatus: String,       // none, pending, approved, rejected
  requestedAt: Date,             // Thời gian yêu cầu
  approvedAt: Date               // Thời gian phê duyệt
}
```

---

## Quy trình Mở rộng Tour

```
1. User yêu cầu mở rộng
   ↓
2. Extension tạo với status = "pending"
   Booking.extension.extensionStatus = "pending"
   ↓
3. Admin phê duyệt hoặc từ chối
   ↓
   [Phê duyệt]                    [Từ chối]
   ↓                              ↓
   Status = "approved"            Status = "rejected"
   Cập nhật booking:              Cập nhật booking:
   - numberOfPeople += ...        - extensionStatus = "rejected"
   - price += ...                 ↓
   ↓                              User thấy yêu cầu bị từ chối
   User thanh toán thêm           (có thể yêu cầu lại)
   ↓
   Booking hoàn tất
```

---

## Validation Rules

1. **additionalDays**: >= 0
2. **additionalPeople**: >= 0
3. **Tổng số người**: numberOfPeople + additionalPeople <= tour.maxGroupSize
4. **Booking status**: Không thể mở rộng nếu status = "cancelled"
5. **Extension status**: Chỉ có 1 yêu cầu pending tại một thời điểm

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "fail",
  "message": "Vui lòng nhập số ngày hoặc số người mở rộng"
}
```

### 403 Forbidden
```json
{
  "status": "fail",
  "message": "Bạn không có quyền mở rộng đơn đặt này"
}
```

### 404 Not Found
```json
{
  "status": "fail",
  "message": "Không tìm thấy đơn đặt tour"
}
```

---

## Frontend Integration Example

```javascript
// Yêu cầu mở rộng
async function requestExtension(bookingId, additionalDays, additionalPeople) {
  const response = await fetch(
    `/api/v1/extensions/${bookingId}/request`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        additionalDays,
        additionalPeople
      })
    }
  );
  return response.json();
}

// Lấy danh sách mở rộng
async function getMyExtensions() {
  const response = await fetch(
    '/api/v1/extensions/my-extensions',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
}
```

