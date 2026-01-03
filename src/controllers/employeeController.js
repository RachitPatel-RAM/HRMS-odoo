const Employee = require('../models/Employee');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { uploadToCloudinary } = require('../utils/storageService');

const EmployeeExperience = require('../models/EmployeeExperience');
const EmployeeEducation = require('../models/EmployeeEducation');
const EmployeeSkill = require('../models/EmployeeSkill');
const EmployeeCertification = require('../models/EmployeeCertification');
const EmployeeResume = require('../models/EmployeeResume');

exports.getEmployeeProfile = async (req, res) => {
    try {
        const { id } = req.params; // Target Employee ID
        const requestingUser = req.user; // From JWT

        const targetEmployee = await Employee.findByPk(id, {
            include: [
                { model: User, attributes: ['email'] },
                { model: EmployeeExperience },
                { model: EmployeeEducation },
                { model: EmployeeSkill },
                { model: EmployeeCertification },
                { model: EmployeeResume }
            ]
        });
        if (!targetEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // --- RBAC LOGIC ---
        // 1. Admin/HR/Manager: Read Only or Edit? Requirements say Edit.
        // 2. Employee:
        //    - If requesting SELF: Redirect instruction (frontend handles) or return data?
        //      Plan says: "redirect to /my-profile". 
        //      We return a flag "is_self: true" so frontend can redirect.
        //    - If requesting OTHER: Read Only.

        let permission = 'read_only';
        let isSelf = false;

        if (requestingUser.employee_id === id) {
            isSelf = true;
            // Even if self, the "Admin Profile View" is read-only for employees.
            // But usually self-profile is editable via My Profile. 
            // Requirement: "Employee accessing THEIR OWN profile -> Must be redirected to “My Profile” page"
        }

        if (['ADMIN', 'HR', 'MANAGER'].includes(requestingUser.role)) {
            permission = 'edit';
        }

        // Fetch Audit Logs if Admin/HR
        let history = [];
        if (['ADMIN', 'HR'].includes(requestingUser.role)) {
            history = await AuditLog.findAll({
                where: { entity_id: id, entity_type: 'Employee' },
                order: [['createdAt', 'DESC']],
                include: [{ model: User, attributes: ['email', 'role'] }],
                limit: 10
            });
        }

        res.json({
            employee: targetEmployee,
            meta: {
                permission,
                is_self: isSelf,
                role: requestingUser.role
            },
            history
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateEmployeeProfile = async (req, res) => {
    const transaction = await Employee.sequelize.transaction();
    try {
        const { id } = req.params;
        const requestingUser = req.user;
        const updates = req.body;

        // --- STRICT RBAC ENFORCEMENT ---
        // Only ADMIN, HR, MANAGER can update.
        // EMPLOYEE cannot update via this route (Self updates go to /my-profile logic usually, but here request says "Admin Control Panel Acts as...").
        // Requirement: "EMPLOYEE: Save actions disabled entirely" on this page.

        if (!['ADMIN', 'HR', 'MANAGER'].includes(requestingUser.role)) {
            await transaction.rollback();
            return res.status(403).json({ message: 'Forbidden: You do not have permission to edit this profile.' });
        }

        const employee = await Employee.findByPk(id);
        if (!employee) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Employee not found' });
        }

        // --- AUDIT LOGGING ---
        // Compare updates with current values
        for (const [key, newValue] of Object.entries(updates)) {
            if (employee.dataValues.hasOwnProperty(key) && JSON.stringify(employee[key]) !== JSON.stringify(newValue)) {
                await AuditLog.create({
                    entity_type: 'Employee',
                    entity_id: id,
                    action: 'UPDATE',
                    field_name: key,
                    old_value: JSON.stringify(employee[key]),
                    new_value: JSON.stringify(newValue),
                    performed_by: requestingUser.id
                }, { transaction });
            }
        }

        // Perform Update
        await employee.update(updates, { transaction });

        await transaction.commit();
        res.json({ message: 'Profile updated successfully', employee });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.uploadProfilePicture = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUser = req.user;

        // RBAC: Only Admin/HR? Or Manager too? Requirement: "ADMIN / HR: Can upload / replace profile picture"
        if (!['ADMIN', 'HR'].includes(requestingUser.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const url = await uploadToCloudinary(req.file.buffer);

        const employee = await Employee.findByPk(id);
        if (employee) {
            await AuditLog.create({
                entity_type: 'Employee',
                entity_id: id,
                action: 'UPDATE',
                field_name: 'profile_picture',
                old_value: employee.profile_picture,
                new_value: url,
                performed_by: requestingUser.id
            });
            await employee.update({ profile_picture: url });
        }

        res.json({ url });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
}
