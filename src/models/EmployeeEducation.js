const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Employee = require('./Employee');

const EmployeeEducation = sequelize.define('EmployeeEducation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    employee_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: Employee,
            key: 'id'
        }
    },
    degree: {
        type: DataTypes.STRING,
        allowNull: false
    },
    institution_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    completion_year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    grade: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'employee_educations'
});

Employee.hasMany(EmployeeEducation, { foreignKey: 'employee_id' });
EmployeeEducation.belongsTo(Employee, { foreignKey: 'employee_id' });

module.exports = EmployeeEducation;
