const profileService = require('../services/profileService');
const { upload } = require('../utils/storageService');

exports.getMe = async (req, res) => {
    try {
        const User = require('../models/User');
        const Employee = require('../models/Employee');
        const Company = require('../models/Company');
        const { generateEmployeeId } = require('../utils/idGenerator');

        let employeeId = req.user.employee_id;
        let user = null;

        // 1. Try to find via User relation if not in token
        if (!employeeId) {
            user = await User.findByPk(req.user.id);
            employeeId = user ? user.employee_id : null;
        }

        // 2. Check if Profile actually exists
        let profile = null;
        if (employeeId) {
            profile = await profileService.getProfile(employeeId);
        }

        // 3. Self-Healing: Create Employee record if missing
        if (!profile) {
            console.log(`[Auto-Fix] Creating missing employee record for User ${req.user.id}`);

            // Fetch user if not fetched
            if (!user) user = await User.findByPk(req.user.id);

            // Default Data
            const emailParts = user.email.split('@');
            const firstName = emailParts[0].substring(0, 15); // Limit length
            const lastName = 'User';
            const companyName = 'Odoo HRMS';

            // Find/Create Company
            let company = await Company.findOne({ where: { name: companyName } });
            if (!company) {
                company = await Company.create({ name: companyName, code: 'HR' });
            }

            // Generate ID
            const newEmployeeId = await generateEmployeeId(company.id, firstName, lastName);

            // Create Employee
            const newEmployee = await Employee.create({
                id: newEmployeeId,
                first_name: firstName,
                last_name: lastName,
                phone: '0000000000', // Default
                company_id: company.id,
                personal_email: user.email,
                designation: 'Employee',
                department: 'General'
            });

            // Link to User
            user.employee_id = newEmployeeId;
            await user.save();

            // Fetch newly created profile
            profile = await profileService.getProfile(newEmployeeId);
        }

        // Append user email if not in profile (for UI consistency)
        // Check if profile is still null (some database error?)
        if (!profile) {
            throw new Error("Failed to create employee profile");
        }

        const responseData = profile.toJSON();
        responseData.User = { email: req.user.email };

        res.json(responseData);
    } catch (error) {
        console.error('getMe Critical Error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getEmployeeProfile = async (req, res) => {
    try {
        const profile = await profileService.getProfile(req.params.employeeId);
        if (!profile) return res.status(404).json({ message: 'Employee not found' });
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateMe = async (req, res) => {
    try {
        const employeeId = req.user.employee_id;
        // Optimization: if employeeId was missing in token but fixed in getMe, this might still fail if token isn't refreshed.
        // However, updateMe implies they are on the page, so they likely called getMe first. 
        // BUT the Token in localStorage is OLD. 
        // So we MUST also lookup again here if missing.

        // Always fetch latest User from DB to handle stale tokens
        const User = require('../models/User');
        const user = await User.findByPk(req.user.id);
        const targetId = user ? user.employee_id : null;

        if (!targetId) return res.status(404).json({ message: 'User not linked to an employee record' });

        const allowedFields = [
            'phone', 'about', 'interests', 'profile_picture',
            'personal_email', 'nationality', 'gender', 'marital_status', 'address', 'date_of_birth',
            'bank_details'
        ];

        // Filter updates
        const filteredUpdates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredUpdates[key] = req.body[key];
            }
        });

        // Bank Details Validation
        if (filteredUpdates.bank_details) {
            const allowedBankFields = ['account_number', 'bank_name', 'ifsc_code', 'pan_number', 'uan_number'];
            const safeBankDetails = {};
            Object.keys(filteredUpdates.bank_details).forEach(k => {
                if (allowedBankFields.includes(k)) {
                    safeBankDetails[k] = filteredUpdates.bank_details[k];
                }
            });
            filteredUpdates.bank_details = safeBankDetails;
        }

        const updatedProfile = await profileService.updateProfile(targetId, filteredUpdates, req.user.id, true);

        // Skills and Certs special handling
        if (req.body.skills) {
            await profileService.updateSkills(targetId, req.body.skills, req.user.id);
        }
        if (req.body.certifications) {
            await profileService.updateCertifications(targetId, req.body.certifications, req.user.id);
        }

        res.json(updatedProfile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateEmployeeProfile = async (req, res) => {
    try {
        const employeeId = req.params.employeeId;
        // HR/Admin can update all fields logic
        // We pass req.body directly but usually should filter
        const updatedProfile = await profileService.updateProfile(employeeId, req.body, req.user.id, false);

        if (req.body.skills) {
            await profileService.updateSkills(employeeId, req.body.skills, req.user.id);
        }
        if (req.body.certifications) {
            await profileService.updateCertifications(employeeId, req.body.certifications, req.user.id);
        }

        res.json(updatedProfile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.uploadAvatar = [
    upload.single('avatar'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

            // Validate file type? Multer usually handles, but we can check mimetype here
            if (!req.file.mimetype.startsWith('image/')) {
                return res.status(400).json({ message: 'Only images are allowed' });
            }

            // Always fetch latest User from DB to handle stale tokens
            const User = require('../models/User');
            const user = await User.findByPk(req.user.id);
            const targetId = user ? user.employee_id : null;

            if (!targetId) return res.status(404).json({ message: 'No employee record found for user' });

            const url = await profileService.uploadAvatar(targetId, req.file.buffer);
            res.json({ url });
        } catch (error) {
            console.error("Avatar Upload Error:", error);
            res.status(500).json({ message: error.message });
        }
    }
];

exports.getHistory = async (req, res) => {
    try {
        const history = await profileService.getHistory(req.params.employeeId || req.user.employee_id, req.params.section);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
