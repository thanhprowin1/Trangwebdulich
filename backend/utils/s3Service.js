const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// Khởi tạo S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Upload file lên S3
const uploadToS3 = async (file, folder = '360-images') => {
    try {
        // Tạo tên file unique
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(file.originalname);
        const fileName = `${folder}/${timestamp}-${randomString}${extension}`;

        // Upload lên S3
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read' // Cho phép public access
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        // Trả về URL của file đã upload
        const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${fileName}`;
        
        return fileUrl;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error('Failed to upload file to S3: ' + error.message);
    }
};

module.exports = {
    uploadToS3
};








