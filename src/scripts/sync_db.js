const sequelize = require('../config/db');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Company = require('../models/Company');
const EmployeeSkill = require('../models/EmployeeSkill');
const EmployeeCertification = require('../models/EmployeeCertification');
const ProfileEditHistory = require('../models/ProfileEditHistory');
const Attendance = require('../models/Attendance'); // Added
const Leave = require('../models/Leave'); // Added
const AuditLog = require('../models/AuditLog');
const SalaryDetails = require('../models/SalaryDetails');

const sync = async () => {
    try {
        await sequelize.authenticate();
        console.log('DB Connection OK');

        // Sync Models
        // Use alter: true carefully. For new models, it's safer.
        await Company.sync({ alter: true });
        await User.sync({ alter: true });
        await Employee.sync({ alter: true });

        const EmployeeExperience = require('../models/EmployeeExperience');
        await EmployeeExperience.sync({ alter: true });
        console.log('EmployeeExperience model synced.');

        const EmployeeEducation = require('../models/EmployeeEducation');
        await EmployeeEducation.sync({ alter: true });
        console.log('EmployeeEducation model synced.');

        const EmployeeResume = require('../models/EmployeeResume');
        await EmployeeResume.sync({ alter: true });
        console.log('EmployeeResume model synced.');

        await Attendance.sync({ alter: true });
        console.log('Attendance model synced.');

        await Leave.sync({ alter: true }); // Ensure Leave is also synced
        console.log('Leave model synced.');

        await User.sync({ alter: true });
        console.log('User model synced.');

        await ProfileEditHistory.sync({ alter: true });
        console.log('ProfileEditHistory model synced.');

        await SalaryDetails.sync({ alter: true });
        console.log('SalaryDetails model synced.');

        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

sync();
