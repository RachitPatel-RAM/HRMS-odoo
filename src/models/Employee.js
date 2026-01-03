const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Company = require('./Company');
// const BankDetail = require('./BankDetail'); // To be added at bottom to avoid circular dependency issues if any


const Employee = sequelize.define('Employee', {
    id: {
        type: DataTypes.STRING, // Format: OIJOD020220001
        primaryKey: true
    },
    first_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    company_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Company,
            key: 'id'
        }
    },
    profile_picture: {
        type: DataTypes.STRING,
        allowNull: true
    },
    department: {
        type: DataTypes.STRING,
        allowNull: true
    },
    designation: {
        type: DataTypes.STRING,
        allowNull: true
    },
    manager_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true
    },
    about: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    interests: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    personal_email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    nationality: {
        type: DataTypes.STRING,
        allowNull: true
    },
    gender: {
        type: DataTypes.STRING(20), // Relaxed from ENUM to prevent data truncation issues
        allowNull: true
    },
    marital_status: {
        type: DataTypes.ENUM('Single', 'Married', 'Divorced', 'Widowed'),
        allowNull: true
    },
    date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    date_of_joining: {
        type: DataTypes.DATEONLY, // Should ideally be set by Admin/HR
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'employees'
});

Employee.belongsTo(Company, { foreignKey: 'company_id' });
Company.hasMany(Employee, { foreignKey: 'company_id' });

// We need to require BankDetail here to set up association, but BankDetail requires Employee... 
// Cyclic dependency risk? No, we can define association after both are defined or in a separate associations file.
// Or just let index.js or app.js handle it?
// For now, let's keep it simple: 
// We will NOT require BankDetail here to avoid circle if BankDetail requires Employee.
// BankDetail ALREADY requires 'employees' string in model definition so it's fine.
// But for `hasOne`, we need the model object.

const BankDetail = require('./BankDetail'); // Require here to avoid top-level circular dep if BankDetail uses Employee
Employee.hasOne(BankDetail, { foreignKey: 'employee_id' });
BankDetail.belongsTo(Employee, { foreignKey: 'employee_id' });

module.exports = Employee;
