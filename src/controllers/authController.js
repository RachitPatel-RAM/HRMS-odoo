const authService = require('../services/authService');
const Joi = require('joi');

const loginSchema = Joi.object({
    identifier: Joi.string().required(), // Email or Employee ID
    password: Joi.string().required()
});

const resetSchema = Joi.object({
    newPassword: Joi.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).required()
});

exports.login = async (req, res, next) => {
    try {
        // Allow 'email' field for backward/legacy compatibility if frontend hasn't updated field name yet
        const data = {
            identifier: req.body.identifier || req.body.email,
            password: req.body.password
        };

        const { error } = loginSchema.validate(data);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const ipAddress = req.ip || req.connection.remoteAddress;
        const result = await authService.login(data.identifier, data.password, ipAddress);

        if (result.is_first_login) {
            return res.status(423).json({
                message: 'First login - Password reset required',
                ...result
            });
        }

        res.json(result);
    } catch (error) {
        if (error.message === 'Invalid Credentials') {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (error.message.includes('not verified')) {
            return res.status(403).json({ message: error.message });
        }
        next(error);
    }
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

exports.resetPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        // Assuming user is authenticated via middleware for this route (First Login flow)
        // Or it's a public forgot password? 
        // Prompt: "If is_first_login = true → redirect user to password reset flow."
        // "POST /auth/reset-password - First-login password change"
        // So user SHOULD be logged in (with maybe restricted access?) OR use a temporary token.
        // Simplest: User logs in, gets Token. Token has is_first_login.
        // Frontend sees this, redirects to Reset Page.
        // User sends Reset Request WITH Token.

        const { error } = resetSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        await authService.resetPassword(req.user.id, newPassword);
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};

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
