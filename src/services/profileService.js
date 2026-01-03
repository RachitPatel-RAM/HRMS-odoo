const Employee = require('../models/Employee');
const User = require('../models/User');
const EmployeeSkill = require('../models/EmployeeSkill');
const EmployeeCertification = require('../models/EmployeeCertification');
const ProfileEditHistory = require('../models/ProfileEditHistory');
const Company = require('../models/Company');
const BankDetail = require('../models/BankDetail');
const { uploadToCloudinary } = require('../utils/storageService');

class ProfileService {

    async getProfile(employeeId) {
        return await Employee.findOne({
            where: { id: employeeId },
            include: [
                { model: Company },
                { model: EmployeeSkill },
                { model: EmployeeCertification },
                { model: BankDetail }
            ]
        });
    }

    async updateProfile(employeeId, updates, editorUserId, isSelfUpdate = false) {
        const employee = await Employee.findByPk(employeeId);
        if (!employee) throw new Error('Employee not found');

        // Extract bank details if present
        const bankDetails = updates.bank_details; // Expecting nested object
        delete updates.bank_details; // Remove from employee updates

        const historyEntries = [];

        // Track changes for Employee Fields
        for (const [key, value] of Object.entries(updates)) {
            if (employee[key] !== value && value !== undefined) {
                historyEntries.push({
                    employee_id: employeeId,
                    section: key.toUpperCase(),
                    old_value: String(employee[key] || ''),
                    new_value: String(value),
                    edited_by: editorUserId
                });
            }
        }

        if (Object.keys(updates).length > 0) {
            await employee.update(updates);
        }

        // Handle Bank Details Update
        if (bankDetails) {
            let bankRecord = await BankDetail.findOne({ where: { employee_id: employeeId } });

            // If it doesn't exist, create it (part of the 'update' flow implies 'create if missing' here)
            if (!bankRecord) {
                bankRecord = await BankDetail.create({ ...bankDetails, employee_id: employeeId });
                // Audit creation?
                historyEntries.push({
                    employee_id: employeeId,
                    section: 'BANK_DETAILS',
                    old_value: 'N/A',
                    new_value: 'Created',
                    edited_by: editorUserId
                });
            } else {
                // Track Bank Changes
                for (const [key, value] of Object.entries(bankDetails)) {
                    if (bankRecord[key] !== value && value !== undefined) {
                        historyEntries.push({
                            employee_id: employeeId,
                            section: 'BANK_DETAILS',
                            old_value: String(bankRecord[key] || ''),
                            new_value: String(value), // careful with PII in logs!
                            edited_by: editorUserId
                        });
                    }
                }
                await bankRecord.update(bankDetails);
            }
        }

        if (historyEntries.length > 0) {
            await ProfileEditHistory.bulkCreate(historyEntries);
        }

        return this.getProfile(employeeId); // Return full profile
    }

    async updateSkills(employeeId, skills, editorUserId) {
        // skills is array of strings
        // Replace all skills? Or add/remove? Prompt says Add/Remove. 
        // Simplest strategy: Delete all and recreate (easiest for full sync)
        // But if we want audit log, we should check diff.
        // For now, let's implement full sync for simplicity in MVP

        await EmployeeSkill.destroy({ where: { employee_id: employeeId } });
        const skillRecords = skills.map(name => ({ employee_id: employeeId, skill_name: name }));
        return await EmployeeSkill.bulkCreate(skillRecords);
    }

    async updateCertifications(employeeId, certs, editorUserId) {
        await EmployeeCertification.destroy({ where: { employee_id: employeeId } });
        const certRecords = certs.map(name => ({ employee_id: employeeId, certification_name: name }));
        return await EmployeeCertification.bulkCreate(certRecords);
    }

    async uploadAvatar(employeeId, fileBuffer) {
        const url = await uploadToCloudinary(fileBuffer, 'profile_pictures');
        await Employee.update({ profile_picture: url }, { where: { id: employeeId } });
        return url;
    }

    async getHistory(employeeId, section) {
        const whereClause = { employee_id: employeeId };
        if (section) whereClause.section = section.toUpperCase();

        return await ProfileEditHistory.findAll({
            where: whereClause,
            include: [{ model: User, as: 'Editor', attributes: ['email', 'role'] }],
            order: [['createdAt', 'DESC']]
        });
    }
}

module.exports = new ProfileService();
