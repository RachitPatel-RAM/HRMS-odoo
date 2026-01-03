const sequelize = require('../config/db');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const { generateEmployeeId } = require('../utils/idGenerator');
const { generateTempPassword, hashPassword, verifyPassword } = require('../utils/passwordService');
const { sendTempPasswordEmail, sendVerificationEmail, sendPurpleTempPasswordEmail } = require('../utils/emailService');
const jwt = require('jsonwebtoken');

class UserService {
    async initSignup(data) {
        // Check if user exists
        const existingUser = await User.findOne({ where: { email: data.email } });
        if (existingUser) {
            throw new Error('Email already registered');
        }

        const tempPassword = generateTempPassword(); // e.g. "X7z9P2"
        const passwordHash = await hashPassword(tempPassword); // We hash it to verify later? 
        // Actually, for stateless init, we can put the HASH in the token, 
        // and when user sends the Plain Text temp password in step 2, we verify it matches the hash in the token.
        // Wait, verifying: hash(input) === hash_in_token? Yes.

        // Generate Init Token
        const payload = {
            ...data, // companyName, fullName, email, phone
            tempHash: passwordHash
        };
        const signupToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Send Email
        // Assuming fullName is "John Doe"
        await sendPurpleTempPasswordEmail(data.email, data.fullName, tempPassword);

        return { signupToken };
    }

    async completeSignup(data) {
        const { signupToken, tempPassword, newPassword } = data;

        // Verify Token
        let decoded;
        try {
            decoded = jwt.verify(signupToken, process.env.JWT_SECRET);
        } catch (e) {
            throw new Error('Invalid or expired verification code session');
        }

        // Verify Temp Password
        // Note: We stored the HASH in the token. We need to verify `tempPassword` (input) against `decoded.tempHash`.
        const isValid = await verifyPassword(tempPassword, decoded.tempHash);
        if (!isValid) {
            throw new Error('Incorrect Verification Code');
        }

        // Proceed to Create User
        const transaction = await sequelize.transaction();

        try {
            const { companyName, fullName, email, phone } = decoded;

            // Name Parsing & UpperCase
            // User requested: "user eneter in any formate in name then it auto convert it into capital uppercase"
            const upperFullName = fullName.toUpperCase().trim();
            const names = upperFullName.split(' ');
            const firstName = names[0];
            const lastName = names.slice(1).join(' ') || '';

            // 1. Find or Create Company
            // Logic: Code = First 2 chars of companyName
            let company = await Company.findOne({ where: { name: companyName }, transaction });
            if (!company) {
                const code = companyName.substring(0, 2).toUpperCase();
                company = await Company.create({ name: companyName, code }, { transaction });
            }

            // 2. Generate Employee ID
            const employeeId = await generateEmployeeId(company.id, firstName, lastName);

            // 3. Create Employee Record
            const employee = await Employee.create({
                id: employeeId,
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                company_id: company.id
            }, { transaction });

            // 4. Hash New Password
            const newPasswordHash = await hashPassword(newPassword);

            // 5. Create User Record
            const user = await User.create({
                email,
                login_id: employeeId, // Store generated ID as login_id
                password_hash: newPasswordHash,
                role: 'EMPLOYEE',
                employee_id: employee.id,
                is_email_verified: true, // They verified via this flow
                is_first_login: false // They just set their password
            }, { transaction });

            await transaction.commit();

            // 6. Send Welcome Email
            await require('../utils/emailService').sendWelcomeEmail(email, upperFullName, employeeId);

            return { user, employeeId };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new UserService();
