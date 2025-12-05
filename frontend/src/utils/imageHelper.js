/**
 * Helper function để xử lý URL ảnh
 * Nếu ảnh là đường dẫn /uploads thì thêm base URL của backend
 * Nếu là URL đầy đủ thì giữ nguyên
 */

const BACKEND_URL = 'http://localhost:5001';

export const getImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return '/logo192.png'; // Ảnh mặc định
  }

  // Nếu là đường dẫn /uploads thì thêm base URL
  if (imageUrl.startsWith('/uploads')) {
    return `${BACKEND_URL}${imageUrl}`;
  }

  // Nếu là URL đầy đủ (http/https) thì giữ nguyên
  return imageUrl;
};

export default getImageUrl;
