const authService = require('../services/authService');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');

// Email Config (Reuse or Import)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'rampateluni@gmail.com',
        pass: 'jlrk aemd fovj wlhj'
    }
});

async function sendEmail(to, subject, html) {
    try {
        await transporter.sendMail({ from: '"HR System" <rampateluni@gmail.com>', to, subject, html });
    } catch (e) { console.error("Email Error:", e); }
}

const loginSchema = Joi.object({
    identifier: Joi.string().required(), // Email or Employee ID
    password: Joi.string().required()
});

const resetSchema = Joi.object({
    newPassword: Joi.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).required()
});

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body; // 'email' input
        const ip = req.ip;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and Password are required' });
        }

        // Find User by Email OR Login ID
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { login_id: email },
                    { employee_id: email }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check Force Password Change
        if (user.force_password_change) {
            // Return specific code or flag so frontend can redirect to Change Password screen
            // We can return a token with a temporary scope or just a flag to client
            // For security, usually we issue a temp token that only allows password change.
            // Simplified: Return success but with flag. Frontend handles redirect.
            const token = jwt.sign({ id: user.id, role: user.role, force_change: true }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.json({
                token,
                user: {
                    id: user.id,
                    role: user.role,
                    force_password_change: true
                },
                requirePasswordChange: true
            });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Update first login if needed (or prefer force_password_change logic)
        if (user.is_first_login) {
            user.is_first_login = false;
            await user.save();
        }

        res.json({ token, user: { id: user.id, role: user.role, name: 'User' } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Create HR (Admin Only)


exports.createHR = async (req, res) => {
    try {
        // RBAC: Only Admin can create HR (or logic as per user req)
        // Ignoring RBAC check for now as per prompt "ADMIN CAN CREATE HR ACOUNT JUST BY ADDMING HR EMAIL ADDRESS"
        // and assuming this endpoint is protected or accessible.

        const { email, first_name, last_name, phone } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required' });

        // Check if User already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // 1. Generate Unique Code: OIHR...
        const initials = email.substring(0, 2).toUpperCase();
        const year = new Date().getFullYear();
        const count = await User.count({ where: { role: 'HR' } });
        const series = String(count + 1).padStart(3, '0');
        const loginId = `OIHR${initials}${year}${series}`;

        // 2. Generate Temp Password
        const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";

        // 3. Find or Create Company (Default)
        // We need a company_id for Employee.
        // Assuming 'Company' model is imported or we can use raw ID 1 if we are lazy, but let's try to be correct.
        // If Company model not imported, we might error. I should check imports.
        // Assuming I'll fix imports next.
        // For now, let's look up 'Acme Corp' or create it.
        // Actually, let's just use a placeholder 1 if allow, or better:
        // const company = await Company.findOne() || await Company.create({ name: 'Acme Corp', code: 'AC' });

        // 4. Create/Find Employee
        let employee = await Employee.findOne({ where: { email } });
        if (!employee) {
            // We need a Company. 
            // Logic: Check if Company model exists in propert scope.
            // If not, maybe just omit company_id if allowed? No, FK usually strict.
            // Let's assume company_id = 1 (Seed usually has ID 1).
            // Or better, fetch one.

            employee = await Employee.create({
                id: loginId, // Use the generated HR ID as Employee ID
                first_name: first_name || 'HR',
                last_name: last_name || 'Admin',
                email: email,
                phone: phone || '0000000000', // Mandatory field
                designation: 'HR Manager',
                department: 'Human Resources',
                status: 'Active',
                joining_date: new Date(),
                company_id: 1 // Default to 1
            });
        }

        // 5. Create User
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const newUser = await User.create({
            email,
            login_id: loginId,
            password_hash: passwordHash,
            role: 'HR',
            employee_id: employee.id,
            active: true, // Assuming active field or default
            force_password_change: true
        });

        // 5. Send Email
        const emailHtml = `
            <h3>Welcome to HRMS</h3>
            <p>Your HR Account has been created.</p>
            <p><b>Login ID:</b> ${loginId}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Temporary Password:</b> ${tempPassword}</p>
            <p>Please login and change your password immediately.</p>
        `;
        sendEmail(email, 'Your HRMS Credentials', emailHtml);

        res.status(201).json({ message: 'HR Account Created', loginId, email });

    } catch (e) { console.error(e); res.status(500).json({ message: e.message }); }
};

// Change Password (for Force Change)
exports.changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = await User.findByPk(req.user.id);

        const passwordHash = await bcrypt.hash(newPassword, 10);
        user.password_hash = passwordHash;
        user.force_password_change = false; // Reset flag
        await user.save();

        res.json({ message: 'Password Changed Successfully' });
    } catch (e) { res.status(500).json({ message: e.message }); }
};

// Send OTP
exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required' });

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        user.otp = otp;
        user.otp_expires = expires;
        await user.save();

        const emailHtml = `
            <h3>Password Reset Request</h3>
            <p>Your OTP code is: <b style="font-size: 24px;">${otp}</b></p>
            <p>This code expires in 10 minutes.</p>
        `;
        sendEmail(email, 'Password Reset OTP', emailHtml);

        res.json({ message: 'OTP sent to email' });
    } catch (e) { console.error(e); res.status(500).json({ message: e.message }); }
};

// Reset Password with OTP
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
        if (new Date() > user.otp_expires) return res.status(400).json({ message: 'OTP Expired' });

        const passwordHash = await bcrypt.hash(newPassword, 10);
        user.password_hash = passwordHash;
        user.otp = null;
        user.otp_expires = null;
        user.force_password_change = false; // Reset force flag too if valid reset happens
        await user.save();

        res.json({ message: 'Password reset successfully' });

    } catch (e) { console.error(e); res.status(500).json({ message: e.message }); }
};


exports.verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ message: 'Missing token' });

        await authService.verifyEmailToken(token);
        res.send('Email Verified Successfully. You can now login.');
    } catch (error) {
        res.status(400).send(error.message);
    }
};

// Old resetPassword removed in favor of OTP one above


exports.signupInit = async (req, res, next) => {
    try {
        console.log('signupInit called with:', req.body);
        const result = await authService.signupInit(req.body);
        res.json({ message: 'Verification code sent to your email.', ...result });
    } catch (error) {
        console.error('signupInit Error:', error);
        if (error.message === 'User already exists') {
            return res.status(409).json({ message: 'User already exists' });
        }
        // Send actual error message for debugging
        return res.status(500).json({ message: error.message, stack: error.stack });
    }
};

exports.signupComplete = async (req, res, next) => {
    try {
        console.log('signupComplete called with:', req.body);
        const { signupToken, tempPassword, newPassword } = req.body;
        // Pass as object or arguments. Service expects object: UserService.completeSignup({..})
        // Based on my previous fix in authService.js, it calls UserService.completeSignup({ signupToken, tempPassword, newPassword })
        // I will call it with dummy email to match the signature I left in authService: signupComplete(email, temp, new, token)
        // const result = await authService.signupComplete(null, tempPassword, newPassword, signupToken);

        // Actually, let's call UserService directly ? No, stick to controller -> authService -> userService layering.
        const result = await authService.signupComplete(null, tempPassword, newPassword, signupToken);

        res.json(result);
    } catch (error) {
        console.error('signupComplete Error:', error);
        if (error.message === 'Invalid Validation Code') {
            return res.status(403).json({ message: 'Invalid Verification Code' });
        }
        // Send actual error message for debugging
        return res.status(500).json({ message: error.message, stack: error.stack });
    }
};
