const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Employee = require('./Employee');

const SalaryDetails = sequelize.define('SalaryDetails', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employee_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // One salary record per employee
        references: {
            model: Employee,
            key: 'id'
        }
    },
    // Wage Configuration
    monthly_wage: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    working_days_per_week: {
        type: DataTypes.INTEGER,
        defaultValue: 5
    },
    break_time: {
        type: DataTypes.FLOAT, // In Hours
        defaultValue: 1.0
    },
    // Salary Components Configuration
    // Basic
    basic_mode: {
        type: DataTypes.ENUM('Fixed', 'Percentage'),
        defaultValue: 'Percentage'
    },
    basic_value: {
        type: DataTypes.DECIMAL(10, 2), // Percentage (e.g., 50.00) or Amount
        defaultValue: 50.00
    },
    // HRA
    hra_mode: {
        type: DataTypes.ENUM('Fixed', 'Percentage'), // Percentage of Basic
        defaultValue: 'Percentage'
    },
    hra_value: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 50.00
    },
    // Standard Allowance
    std_allowance_mode: {
        type: DataTypes.ENUM('Fixed', 'Percentage'),
        defaultValue: 'Fixed'
    },
    std_allowance_value: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    // Performance Bonus
    bonus_mode: {
        type: DataTypes.ENUM('Fixed', 'Percentage'), // Percentage of Basic
        defaultValue: 'Percentage'
    },
    bonus_value: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    // LTA
    lta_mode: {
        type: DataTypes.ENUM('Fixed', 'Percentage'), // Percentage of Basic
        defaultValue: 'Percentage'
    },
    lta_value: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    // Statutory Settings
    pf_employee_percent: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 12.00
    },
    pf_employer_percent: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 12.00
    },
    professional_tax: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 200.00 // Common fixed amount
    },
    // Metadata
    last_updated_by: {
        type: DataTypes.UUID, // Changed from INTEGER to match User.id
        allowNull: true
    }
}, {
    tableName: 'salary_details',
    timestamps: true
});

SalaryDetails.belongsTo(Employee, { foreignKey: 'employee_id' });
Employee.hasOne(SalaryDetails, { foreignKey: 'employee_id' });

module.exports = SalaryDetails;
