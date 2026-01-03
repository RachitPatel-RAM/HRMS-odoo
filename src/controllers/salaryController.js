const salaryService = require('../services/salaryService');
const User = require('../models/User');

exports.getMe = async (req, res) => {
    try {
        // Always fetch user from DB to handle stale tokens or missing IDs
        const user = await User.findByPk(req.user.id);
        const employeeId = user ? user.employee_id : null;

        if (!employeeId) {
            console.warn(`Salary 404: No employee_id found for User ${req.user.id}`);
            return res.status(404).json({ message: 'Employee record not found. Please complete your profile.' });
        }

        const salary = await salaryService.getSalaryByEmployeeId(employeeId);

        // Calculate Totals for API Response convenience
        const data = salary.toJSON();

        // Gross = Sum of Earnings
        const gross = parseFloat(data.basic_salary) + parseFloat(data.hra) + parseFloat(data.fixed_allowance)
            + parseFloat(data.standard_allowance || 0) + parseFloat(data.performance_bonus || 0)
            + parseFloat(data.lta || 0);

        // Total Deductions
        const deductions = parseFloat(data.pf_employee || 0) + parseFloat(data.professional_tax || 0);

        // Net Pay
        const netPay = gross - deductions;

        res.json({
            ...data,
            calculations: {
                gross: gross.toFixed(2),
                deductions: deductions.toFixed(2),
                net_pay: netPay.toFixed(2),
                yearly_wage: (data.wage * 12).toFixed(2)
            }
        });

    } catch (error) {
        console.error('Salary API Error:', error);
        res.status(500).json({ message: error.message });
    }
};
