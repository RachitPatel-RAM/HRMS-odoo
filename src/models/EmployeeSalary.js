const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Employee = require('./Employee');

const EmployeeSalary = sequelize.define('EmployeeSalary', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    employee_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Employee,
            key: 'id'
        },
        unique: true
    },
    wage: {
        type: DataTypes.DECIMAL(10, 2), // Total Fixed Wage
        allowNull: false,
        defaultValue: 0.00
    },
    basic_salary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    hra: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    standard_allowance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    performance_bonus: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    lta: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    fixed_allowance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    pf_employee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    pf_employer: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    professional_tax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'employee_salaries'
});

EmployeeSalary.belongsTo(Employee, { foreignKey: 'employee_id' });
Employee.hasOne(EmployeeSalary, { foreignKey: 'employee_id' });

module.exports = EmployeeSalary;
