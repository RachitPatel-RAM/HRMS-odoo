const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Employee = require('./Employee');

const EmployeeSkill = sequelize.define('EmployeeSkill', {
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
    skill_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    proficiency: {
        type: DataTypes.ENUM('Beginner', 'Intermediate', 'Advanced'),
        defaultValue: 'Intermediate'
    }
}, {
    timestamps: true,
    tableName: 'employee_skills'
});

Employee.hasMany(EmployeeSkill, { foreignKey: 'employee_id' });
EmployeeSkill.belongsTo(Employee, { foreignKey: 'employee_id' });

module.exports = EmployeeSkill;
