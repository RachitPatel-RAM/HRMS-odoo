// src/scripts/seed_admin.js
const sequelize = require('../config/db');
const User = require('../models/User');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const { hashPassword } = require('../utils/passwordService');
const { generateEmployeeId } = require('../utils/idGenerator');

async function seed() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true }); // Update schema structure

        // Check if admin exists
        const adminEmail = 'admin@hrms.com';
        const exists = await User.findOne({ where: { email: adminEmail } });
        if (exists) {
            console.log('Admin already exists.');
            process.exit(0);
        }

        // Create Default Company
        let company = await Company.findOne({ where: { code: 'OI' } });
        if (!company) {
            company = await Company.create({
                code: 'OI',
                name: 'Odoo Inc'
            });
            console.log('Company created.');
        }

        // Create Admin Employee
        // Manually generating ID or using util? The util needs FName/LName.
        const fName = 'Super';
        const lName = 'Admin';
        const empId = await generateEmployeeId(company.id, fName, lName);

        const employee = await Employee.create({
            id: empId,
            first_name: fName,
            last_name: lName,
            phone: '0000000000',
            company_id: company.id
        });

        // Create Admin User
        const password = 'Admin@123'; // Known password for initial login
        const hashedPassword = await hashPassword(password);

        await User.create({
            email: adminEmail,
            password_hash: hashedPassword,
            role: 'ADMIN',
            is_email_verified: true,
            is_first_login: false, // Skip reset for this seed user
            employee_id: employee.id
        });

        console.log(`Admin created successfully.`);
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${password}`);

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
