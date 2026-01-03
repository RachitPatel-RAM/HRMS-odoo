const userService = require('../services/userService');
const Joi = require('joi');

const employeeSchema = Joi.object({
    company: Joi.string().required(), // Form sends 'company' (name)
    name: Joi.string().required(),    // Form sends 'name' (Full Name)
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    role: Joi.string().valid('ADMIN', 'HR', 'EMPLOYEE').default('EMPLOYEE')
});

exports.createEmployee = async (req, res, next) => {
    try {
        // Map form fields if necessary
        // Frontend sends 'name', business logic expects firstName, lastName
        const { name, company, email, phone, role } = req.body; // Adapt to frontend payload

        // Split name
        const parts = name.trim().split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ') || 'User'; // Fallback if single name

        const data = {
            companyName: company,
            firstName,
            lastName,
            email,
            phone,
            role
        };

        const result = await userService.createEmployeeUser(data);
        res.status(201).json({
            message: 'Employee created successfully',
            employeeId: result.employee.id
        });
    } catch (error) {
        // Handle uniqueness errors etc
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Email or ID already exists' });
        }
        next(error);
    }
};

const User = require('../models/User');
const Employee = require('../models/Employee');

exports.getAdminStats = async (req, res) => {
    try {
        const totalEmployees = await Employee.count({ where: { status: 'Active' } });
        const totalHR = await User.count({ where: { role: 'HR' } });
        const totalUsers = await User.count();

        res.json({
            employees: totalEmployees,
            hrs: totalHR,
            total_users: totalUsers
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server Error' });
    }
};
