const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE, // 'gmail'
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

async function sendEmail(to, subject, html) {
    const mailOptions = {
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to,
        subject,
        html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't crash app if email fails, but maybe throw if critical?
        // For user creation, if email fails, user can't login.
        throw error;
    }
}

async function sendVerificationEmail(to, token) {
    // Assuming frontend route for verification: /verify-email.html?token=...
    // Or API direct link. User requirement: GET /auth/verify-email?token=
    // Let's assume the link points to the API which then redirects to a success page.
    const link = `http://localhost:${process.env.PORT || 3000}/api/auth/verify-email?token=${token}`;
    const html = `
    <h3>Welcome to HRMS</h3>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${link}">Verify Email</a>
  `;
    await sendEmail(to, 'Verify your Email', html);
}

async function sendTempPasswordEmail(to, password) {
    const html = `
    <h3>Account Created</h3>
    <p>Your account has been created.</p>
    <p>Your Temporary Password is: <strong>${password}</strong></p>
    <p>Please login and change your password immediately.</p>
  `;
    await sendEmail(to, 'Your Temporary Password', html);
}

async function sendPurpleTempPasswordEmail(to, name, tempPassword) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap');
            body { font-family: 'Gochi Hand', cursive; background-color: #f3e8ff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background-color: #9C27B0; padding: 40px; text-align: center; }
            .content { padding: 40px; text-align: center; color: #333; }
            .code-box { background-color: #f8f6f8; border: 2px dashed #9C27B0; border-radius: 8px; padding: 20px; font-size: 32px; letter-spacing: 5px; color: #9C27B0; margin: 20px 0; font-weight: bold; }
            .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .logo { height: 80px; object-fit: contain; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                 <h1 style="color: white; margin: 0; font-family: 'Gochi Hand', cursive; font-size: 32px;">ODOO HRMS</h1>
            </div>
            <div class="content">
                <h2 style="font-size: 28px;">Hello, ${name}!</h2>
                <p style="font-size: 18px;">Your account creation has been initiated.</p>
                <p>Here is your Verification Code / Temporary Password:</p>
                
                <div class="code-box">
                    ${tempPassword}
                </div>

                <p>Please enter this code to complete your registration and set your new password.</p>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} Odoo HRMS. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;
    await sendEmail(to, 'HRMS Verification Code', html);
}

async function sendWelcomeEmail(to, name, employeeId) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap');
            body { font-family: 'Gochi Hand', cursive; background-color: #f3e8ff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background-color: #9C27B0; padding: 40px; text-align: center; }
            .content { padding: 40px; text-align: center; color: #333; }
            .id-box { background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 8px; padding: 20px; font-size: 28px; color: #15803d; margin: 20px 0; font-weight: bold; }
            .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                 <h1 style="color: white; margin: 0; font-family: 'Gochi Hand', cursive; font-size: 32px;">ODOO HRMS</h1>
            </div>
            <div class="content">
                <h2 style="font-size: 28px;">Hello, ${name}!</h2>
                <p style="font-size: 18px;">Congratulations! Your registration is complete.</p>
                <p>Here is your unique Employee ID:</p>
                
                <div class="id-box">
                    ${employeeId}
                </div>

                <p>You can now login to the portal using your email and the password you just set.</p>
                <p>Please keep your Employee ID safe as it may be required for official purposes.</p>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} Odoo HRMS. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;
    await sendEmail(to, 'Welcome to HRMS - Registration Successful', html);
}

module.exports = { sendEmail, sendVerificationEmail, sendTempPasswordEmail, sendPurpleTempPasswordEmail, sendWelcomeEmail };
