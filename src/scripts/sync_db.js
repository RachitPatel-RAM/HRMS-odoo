const sequelize = require('../config/db');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Company = require('../models/Company');
const EmployeeSkill = require('../models/EmployeeSkill');
const EmployeeCertification = require('../models/EmployeeCertification');
const ProfileEditHistory = require('../models/ProfileEditHistory');
const Attendance = require('../models/Attendance'); // Added
const Leave = require('../models/Leave'); // Added

async function sync() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Sync specific models to avoid issues with others
        await Employee.sync({ alter: true });
        console.log('Employee model synced.');

        const BankDetail = require('../models/BankDetail');
        await BankDetail.sync({ alter: true });
        console.log('BankDetail model synced.');

        await EmployeeSkill.sync({ alter: true });
        console.log('EmployeeSkill model synced.');

        await EmployeeCertification.sync({ alter: true });
        console.log('EmployeeCertification model synced.');

        const EmployeeSalary = require('../models/EmployeeSalary');
        await EmployeeSalary.sync({ alter: true });
        console.log('EmployeeSalary model synced.');

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

        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

sync();
