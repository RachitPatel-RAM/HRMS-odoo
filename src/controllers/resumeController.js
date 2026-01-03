const resumeService = require('../services/resumeService');
const User = require('../models/User');
const { upload } = require('../utils/storageService'); // Reusing existing upload (needs check if it supports pdf?)
const multer = require('multer');

// Configure Multer for Resume (since storageService might be img only)
// Actually storageService.upload is just memoryStorage, so it's fine.
// We will filter in the controller.

exports.getResume = async (req, res) => {
    try {
        // Always Force Refresh ID
        const user = await User.findByPk(req.user.id);
        const employeeId = user ? user.employee_id : null;
        if (!employeeId) return res.status(404).json({ message: 'No employee record linked.' });

        const data = await resumeService.getResume(employeeId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateResume = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const employeeId = user ? user.employee_id : null;
        if (!employeeId) return res.status(404).json({ message: 'No employee record linked.' });

        const { summary, experiences, educations, skills, certifications } = req.body;

        if (summary !== undefined) await resumeService.updateSummary(employeeId, summary);
        if (experiences) await resumeService.updateExperiences(employeeId, experiences);
        if (educations) await resumeService.updateEducations(employeeId, educations);
        if (skills) await resumeService.updateSkills(employeeId, skills);
        if (certifications) await resumeService.updateCertifications(employeeId, certifications);

        // Return updated data
        const data = await resumeService.getResume(employeeId);
        res.json(data);
    } catch (error) {
        console.error("Update Resume Error", error);
        res.status(500).json({ message: error.message });
    }
};

exports.uploadResumeFile = [
    multer({ storage: multer.memoryStorage() }).single('resume'),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

            // Validate PDF/DOC
            const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedMimes.includes(req.file.mimetype)) {
                return res.status(400).json({ message: 'Invalid file type. Only PDF and DOC/DOCX allowed.' });
            }

            const user = await User.findByPk(req.user.id);
            const employeeId = user ? user.employee_id : null;
            if (!employeeId) return res.status(404).json({ message: 'No employee record linked.' });

            const result = await resumeService.saveResumeFile(employeeId, req.file);
            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: error.message });
        }
    }
];
