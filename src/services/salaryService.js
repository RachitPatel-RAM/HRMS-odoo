const EmployeeSalary = require('../models/EmployeeSalary');

exports.getSalaryByEmployeeId = async (employeeId) => {
    let salary = await EmployeeSalary.findOne({ where: { employee_id: employeeId } });

    // Self-Healing: If no record, create a default structure for demo/onboarding
    if (!salary) {
        console.log(`[Salary] No record found for ${employeeId}. Auto-creating default structure.`);
        salary = await this.createDefaultSalary(employeeId, 50000.00); // Default 50k
    }
    return salary;
};

exports.createDefaultSalary = async (employeeId, wage) => {
    // Logic:
    // Basic = 50% of Wage
    // HRA = 50% of Basic
    // Standard Deduction = Fixed 0 (or some value)
    // PF = 12% of Basic
    // PT = 200
    // Rest goes to Fixed Allowance

    const basic = wage * 0.50;
    const hra = basic * 0.50;
    const pf = basic * 0.12;
    const pt = 200.00;

    // Standard Allowance/Bonus - let's say 0 for simple default
    // Calculate Fixed Allowance (Balancing Figure)
    // Wage includes everything usually (CTC style) OR Wage is Gross? 
    // User request: "Fixed Allowance = Wage - Sum of all other components"

    const fixedAllowance = wage - (basic + hra);

    const newSalary = await EmployeeSalary.create({
        employee_id: employeeId,
        wage: wage,
        basic_salary: basic,
        hra: hra,
        standard_allowance: 0,
        performance_bonus: 0,
        lta: 0,
        fixed_allowance: fixedAllowance > 0 ? fixedAllowance : 0,
        pf_employee: pf,
        pf_employer: pf, // Usually equal
        professional_tax: pt
    });

    return newSalary;
};
