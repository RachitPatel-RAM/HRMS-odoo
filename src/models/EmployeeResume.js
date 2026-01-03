const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Employee = require('./Employee');

const EmployeeResume = sequelize.define('EmployeeResume', {
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
        unique: true // One resume per employee for now
    },
    file_url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    file_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    tableName: 'employee_resumes'
});

Employee.hasOne(EmployeeResume, { foreignKey: 'employee_id' });
EmployeeResume.belongsTo(Employee, { foreignKey: 'employee_id' });

module.exports = EmployeeResume;
