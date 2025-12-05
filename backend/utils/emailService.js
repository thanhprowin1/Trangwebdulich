const nodemailer = require('nodemailer');

// Tạo transporter (có thể cấu hình cho Gmail, SendGrid, etc.)
const createTransporter = () => {
    // Nếu có cấu hình SMTP trong env, dùng nó
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    
    // Nếu không có cấu hình, dùng Gmail (cần app password)
    // Hoặc có thể dùng service như SendGrid, Mailgun, etc.
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || '',
            pass: process.env.EMAIL_PASS || ''
        }
    });
};

// Gửi email xác thực
exports.sendVerificationEmail = async (email, verificationToken) => {
    try {
        const transporter = createTransporter();
        
        // Tạo link xác thực
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@travelbooking.com',
            to: email,
            subject: 'Xác thực địa chỉ email mới - Travel Booking',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Xác thực địa chỉ email mới</h2>
                    <p>Xin chào,</p>
                    <p>Bạn đã yêu cầu thay đổi địa chỉ email trên tài khoản Travel Booking của mình.</p>
                    <p>Vui lòng nhấp vào link bên dưới để xác thực địa chỉ email mới:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Xác thực email
                        </a>
                    </div>
                    <p>Hoặc copy và dán link sau vào trình duyệt:</p>
                    <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                    <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 24 giờ.</p>
                    <p>Nếu bạn không yêu cầu thay đổi email này, vui lòng bỏ qua email này.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">Email này được gửi tự động, vui lòng không trả lời.</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Không thể gửi email xác thực. Vui lòng kiểm tra cấu hình email.');
    }
};

