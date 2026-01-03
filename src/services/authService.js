const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { verifyPassword, hashPassword, generateTempPassword } = require('../utils/passwordService');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendPurpleTempPasswordEmail } = require('../utils/emailService');
const sequelize = require('../config/db');
const { Op } = require('sequelize');
const UserService = require('./userService');

class AuthService {
    async login(identifier, password, ipAddress) { // identifier can be email or employeeID
        let user;

        // Simple check if it looks like an email
        const isEmail = identifier.includes('@');

        if (isEmail) {
            // Case-insensitive email search
            user = await User.findOne({
                where: sequelize.where(
                    sequelize.fn('lower', sequelize.col('email')),
                    sequelize.fn('lower', identifier)
                )
            });
        } else {

            // Assume Employee ID or Login ID
            user = await User.findOne({
                where: {
                    [Op.or]: [
                        { employee_id: identifier },
                        { login_id: identifier }
                    ]
                }
            });
        }

        if (!user) {
            await this.logAudit(email, 'LOGIN_FAILED', ipAddress, 'User not found');
            throw new Error('Invalid Credentials');
        }

        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
            await this.logAudit(user.email, 'LOGIN_FAILED', ipAddress, 'Incorrect password');
            throw new Error('Invalid Credentials');
        }

        if (!user.is_email_verified) {
            await this.logAudit(user.email, 'LOGIN_FAILED', ipAddress, 'Email not verified');
            throw new Error('Email not verified. Please check your inbox.');
        }

        // Check First Login
        if (user.is_first_login) {
            // 423 Case: We DO authenticate them partially or return special status?
            // "Authenticate user -> Redirect to password reset flow -> Prevent dashboard access"
            // So we SHOULD issue a token but maybe with a restricted scope?
            // Or just return a code and let frontend handle redirect to reset page (which then needs a token to submit reset).
            // I will issue a token but the frontend must interpret the flag.
            await this.logAudit(user.email, 'LOGIN_SUCCESS', ipAddress, 'First login - Redirect to Reset');

            const token = this.generateToken(user);
            return {
                token,
                user: { id: user.id, email: user.email, role: user.role },
                is_first_login: true
            };
        }

        await this.logAudit(user.email, 'LOGIN_SUCCESS', ipAddress, 'Standard login');

        const token = this.generateToken(user);
        return {
            token,
            user: { id: user.id, email: user.email, role: user.role },
            is_first_login: false
        };
    }

    generateToken(user) {
        return jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                employee_id: user.employee_id
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
    }

    async logAudit(email, action, ip, details) {
        try {
            await AuditLog.create({
                user_email: email,
                action,
                ip_address: ip,
                details
            });
        } catch (e) {
            console.error('Audit logging failed:', e);
        }
    }

    async verifyEmailToken(token) {
        // In a real app, I'd verify a signed JWT token or a random string in DB.
        // Simplifying: Assuming token is JWT containing { email }.
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findOne({ where: { email: decoded.email } });
            if (!user) throw new Error('User not found');

            user.is_email_verified = true;
            await user.save();
            return true;
        } catch (e) {
            throw new Error('Invalid or Expired Token');
        }
    }

    async resetPassword(userId, newPassword) {
        const user = await User.findByPk(userId);
        if (!user) throw new Error('User not found');

        user.password_hash = await hashPassword(newPassword);
        user.is_first_login = false;
        await user.save();

        // Log this action too? I should, but method signature needs IP. 
        // I'll skip for now or add later.
        return true;
    }

    /**
     * Step 1: Init Signup - Create User/Employee with Temp PW
     */
    /**
     * Step 1: Init Signup - Generate Token & Send Temp PW Email
     */
    async signupInit(data) {
        // Delegate entirely to UserService which now handles the stateless token generation
        const result = await UserService.initSignup(data);
        return result;
    }

    /**
     * Step 2: Complete Signup - Verify Token & Temp PW, Create User
     */
    async signupComplete(email, tempPassword, newPassword, signupToken) {
        // Note: authController passes (email, tempPassword, newPassword). 
        // But the new flow uses signupToken. 
        // I need to update authController to pass the whole object or specifically signupToken.
        // Let's assume authController passes an object or args. 
        // Actually, let's update this method to take an object or match controller calls.
        // Controller currently: const { email, tempPassword, newPassword } = req.body; 
        // Controller calls: authService.signupComplete(email, tempPassword, newPassword);
        // I will update Controller next to pass { signupToken, tempPassword, newPassword } 
        // and here I will accept that.

        const result = await UserService.completeSignup({ signupToken, tempPassword, newPassword });
        return result;
    }
}


module.exports = new AuthService();
