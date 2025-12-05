const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Upload file lên Cloudinary
const uploadToCloudinary = async (file, folder = '360-images') => {
    // Cấu hình Cloudinary mỗi lần upload để đảm bảo env đã được load
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Kiểm tra và log để debug
    if (!cloudName || !apiKey || !apiSecret) {
        console.error('Cloudinary config missing:');
        console.error('CLOUDINARY_CLOUD_NAME:', cloudName ? '✓' : '✗');
        console.error('CLOUDINARY_API_KEY:', apiKey ? '✓' : '✗');
        console.error('CLOUDINARY_API_SECRET:', apiSecret ? '✓' : '✗');
        throw new Error('Cloudinary credentials are missing. Please check config.env and restart the server.');
    }

    // Cấu hình Cloudinary
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    });

    return new Promise((resolve, reject) => {
        // Tạo stream từ buffer
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'image',
                // Tối ưu cho ảnh 360° - giữ nguyên chất lượng
                quality: 'auto',
                fetch_format: 'auto',
                // Cho phép file lớn (ảnh 360 thường lớn)
                chunk_size: 6000000
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(new Error('Failed to upload to Cloudinary: ' + error.message));
                } else {
                    resolve(result.secure_url); // Trả về secure URL
                }
            }
        );

        // Pipe buffer vào stream
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
};

// Xóa ảnh từ Cloudinary dựa trên URL
const deleteFromCloudinary = async (imageUrl) => {
    // Cấu hình Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary credentials are missing. Please check config.env and restart the server.');
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    });

    try {
        const uploadSegment = '/upload/';
        const uploadIndex = imageUrl.indexOf(uploadSegment);

        if (uploadIndex === -1) {
            throw new Error('Invalid Cloudinary URL format');
        }

        // Lấy phần sau '/upload/'
        let publicIdPath = imageUrl.substring(uploadIndex + uploadSegment.length);

        // Bỏ query parameters nếu có
        if (publicIdPath.includes('?')) {
            publicIdPath = publicIdPath.split('?')[0];
        }

        let publicIdParts = publicIdPath.split('/');

        // Bỏ các transformation segment (thường chứa dấu phẩy) ở đầu
        while (publicIdParts.length > 0 && publicIdParts[0].includes(',')) {
            publicIdParts = publicIdParts.slice(1);
        }

        // Bỏ version (ví dụ: v1234567890)
        if (publicIdParts.length > 0 && /^v\d+$/.test(publicIdParts[0])) {
            publicIdParts = publicIdParts.slice(1);
        }

        if (publicIdParts.length === 0) {
            throw new Error('Could not extract public_id from URL');
        }

        // Bỏ extension ở phần cuối
        const lastIndex = publicIdParts.length - 1;
        const lastPart = publicIdParts[lastIndex];
        if (lastPart.includes('.')) {
            publicIdParts[lastIndex] = lastPart.substring(0, lastPart.lastIndexOf('.'));
        }

        const publicId = publicIdParts.join('/');
        
        console.log('Original URL:', imageUrl);
        console.log('Extracted public_id:', publicId);

        // Xóa ảnh từ Cloudinary
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
            invalidate: true
        });

        console.log('Cloudinary destroy result:', result);

        if (result.result === 'ok' || result.result === 'not found') {
            return { success: true, message: 'Image deleted successfully', result: result.result };
        } else {
            throw new Error('Failed to delete image from Cloudinary: ' + result.result);
        }
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw new Error('Failed to delete image from Cloudinary: ' + error.message);
    }
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary
};

