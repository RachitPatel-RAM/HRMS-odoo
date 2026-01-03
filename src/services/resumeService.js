const Employee = require('../models/Employee');
const EmployeeExperience = require('../models/EmployeeExperience');
const EmployeeEducation = require('../models/EmployeeEducation');
const EmployeeSkill = require('../models/EmployeeSkill');
const EmployeeCertification = require('../models/EmployeeCertification');
const EmployeeResume = require('../models/EmployeeResume');
const { upload } = require('../utils/storageService');
const fs = require('fs');
const path = require('path');

exports.getResume = async (employeeId) => {
    try {
        const employee = await Employee.findByPk(employeeId, {
            include: [
                { model: EmployeeExperience },
                { model: EmployeeEducation },
                { model: EmployeeSkill },
                { model: EmployeeCertification },
                { model: EmployeeResume }
            ]
        });

        if (!employee) return null;

        return {
            summary: employee.about, // Assuming 'about' maps to Professional Summary
            experiences: employee.EmployeeExperiences || [],
            educations: employee.EmployeeEducations || [],
            skills: employee.EmployeeSkills || [],
            certifications: employee.EmployeeCertifications || [],
            resume_file: employee.EmployeeResume || null
        };
    } catch (error) {
        throw error;
    }
};

exports.updateSummary = async (employeeId, summary) => {
    return await Employee.update({ about: summary }, { where: { id: employeeId } });
};

exports.updateExperiences = async (employeeId, experiences) => {
    // Strategy: Replace all (simplest for this scale) or Upsert
    // Let's do a transactonal replacement to handle deletions easily
    // But for now, simple Delete All + Create All is safest for integrity if not too much data

    // Deleting old
    await EmployeeExperience.destroy({ where: { employee_id: employeeId } });

    // Creating new
    const newExps = experiences.map(exp => ({ ...exp, employee_id: employeeId }));
    return await EmployeeExperience.bulkCreate(newExps);
};

exports.updateEducations = async (employeeId, educations) => {
    await EmployeeEducation.destroy({ where: { employee_id: employeeId } });
    const newEdus = educations.map(edu => ({ ...edu, employee_id: employeeId }));
    return await EmployeeEducation.bulkCreate(newEdus);
};

exports.updateSkills = async (employeeId, skills) => {
    // skills input expected as array of objects { skill_name, proficiency }
    await EmployeeSkill.destroy({ where: { employee_id: employeeId } });
    const newSkills = skills.map(s => ({ ...s, employee_id: employeeId }));
    return await EmployeeSkill.bulkCreate(newSkills);
};

exports.updateCertifications = async (employeeId, certifications) => {
    await EmployeeCertification.destroy({ where: { employee_id: employeeId } });
    const newCerts = certifications.map(c => ({ ...c, employee_id: employeeId }));
    return await EmployeeCertification.bulkCreate(newCerts);
};

exports.saveResumeFile = async (employeeId, file) => {
    // Local storage logic (similar to avatar)
    const folder = 'resume_uploads';
    const uploadDir = path.join(__dirname, '../../public/uploads/resumes');

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `resume_${employeeId}_${Date.now()}${path.extname(file.originalname)}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);
    const fileUrl = `/uploads/resumes/${fileName}`;

    // Update DB
    const existing = await EmployeeResume.findOne({ where: { employee_id: employeeId } });
    if (existing) {
        // delete old file? maybe later
        existing.file_url = fileUrl;
        existing.file_name = file.originalname;
        existing.uploaded_at = new Date();
        await existing.save();
        return existing;
    } else {
        return await EmployeeResume.create({
            employee_id: employeeId,
            file_url: fileUrl,
            file_name: file.originalname
        });
    }
};
