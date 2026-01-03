const SalaryDetails = require('../models/SalaryDetails');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User'); // Added for getMe

// Helper to calculate components for server-side validation
const calculateStructure = (wage, details) => {
    const WAGE = parseFloat(wage);

    // 1. Basic
    let basic = 0;
    if (details.basic_mode === 'Percentage') {
        basic = WAGE * (parseFloat(details.basic_value) / 100);
    } else {
        basic = parseFloat(details.basic_value);
    }

    // 2. HRA (Percentage of Basic usually, but keeping generic if needed. Ref says % of Basic)
    let hra = 0;
    if (details.hra_mode === 'Percentage') {
        hra = basic * (parseFloat(details.hra_value) / 100);
    } else {
        hra = parseFloat(details.hra_value);
    }

    // 3. Standard Allowance
    let std = 0;
    if (details.std_allowance_mode === 'Percentage') {
        std = basic * (parseFloat(details.std_allowance_value) / 100);
    } else {
        std = parseFloat(details.std_allowance_value);
    }

    // 4. Bonus
    let bonus = 0;
    if (details.bonus_mode === 'Percentage') {
        bonus = basic * (parseFloat(details.bonus_value) / 100);
    } else {
        bonus = parseFloat(details.bonus_value);
    }

    // 5. LTA
    let lta = 0;
    if (details.lta_mode === 'Percentage') {
        lta = basic * (parseFloat(details.lta_value) / 100);
    } else {
        lta = parseFloat(details.lta_value);
    }

    const totalUsed = basic + hra + std + bonus + lta;
    const fixedAllowance = WAGE - totalUsed;

    return { basic, hra, std, bonus, lta, fixedAllowance, totalUsed };
};

exports.getSalaryDetails = async (req, res) => {
    try {
        const { employeeId } = req.params;

        // RBAC: Only Admin/HR
        if (!['ADMIN', 'HR'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied: Restricted to HR/Admin' });
        }

        const salary = await SalaryDetails.findOne({ where: { employee_id: employeeId } });

        if (!salary) {
            // Return default structure if not found
            return res.json({
                exists: false,
                monthly_wage: 0,
                // Defaults
                basic_mode: 'Percentage', basic_value: 50,
                hra_mode: 'Percentage', hra_value: 50,
                // ... others default via frontend
            });
        }

        res.json({ exists: true, data: salary });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateSalaryDetails = async (req, res) => {
    const transaction = await SalaryDetails.sequelize.transaction();
    try {
        const { employeeId } = req.params;
        const updates = req.body;

        // RBAC: Only Admin/HR
        if (!['ADMIN', 'HR'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        // 1. Validation Logic
        const wage = parseFloat(updates.monthly_wage);
        if (isNaN(wage) || wage < 0) return res.status(400).json({ message: 'Invalid Wage Amount' });

        const calc = calculateStructure(wage, updates);

        if (calc.fixedAllowance < 0) {
            return res.status(400).json({
                message: 'Invalid Salary Structure: Total components exceed Monthly Wage.',
                details: { wage, totalUsed: calc.totalUsed, deficit: calc.fixedAllowance }
            });
        }

        // 2. Find or Create
        let salary = await SalaryDetails.findOne({ where: { employee_id: employeeId } });

        if (salary) {
            // Audit Log
            await AuditLog.create({
                entity_type: 'Salary',
                entity_id: salary.id,
                action: 'UPDATE',
                field_name: 'Full Structure',
                old_value: JSON.stringify(salary.toJSON()),
                new_value: JSON.stringify(updates),
                performed_by: req.user.id
            }, { transaction });

            await salary.update({ ...updates, last_updated_by: req.user.id }, { transaction });
        } else {
            // Create
            salary = await SalaryDetails.create({
                ...updates,
                employee_id: employeeId,
                last_updated_by: req.user.id
            }, { transaction });

            await AuditLog.create({
                entity_type: 'Salary',
                entity_id: salary.id,
                action: 'CREATE',
                field_name: 'Initial Setup',
                new_value: JSON.stringify(updates),
                performed_by: req.user.id
            }, { transaction });
        }

        await transaction.commit();
        res.json({ message: 'Salary Details Saved Successfully', data: salary });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId);
        if (!user || !user.employee_id) return res.status(404).json({ message: 'Employee not linked' });

        const salary = await SalaryDetails.findOne({ where: { employee_id: user.employee_id } });
        if (!salary) return res.json({ exists: false, message: 'Salary not configured' });

        res.json({ exists: true, data: salary });
    } catch (e) { res.status(500).json({ message: e.message }); }
};
