const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Employee = require('./Employee');

const Leave = sequelize.define('Leave', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('Paid Time Off', 'Sick Leave', 'Unpaid Leave', 'Maternity Leave'),
        defaultValue: 'Paid Time Off'
    },
    days_count: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'TAKEN'),
        defaultValue: 'PENDING'
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    attachment_url: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'leaves',
    timestamps: true
});

Employee.hasMany(Leave, { foreignKey: 'employee_id' });
Leave.belongsTo(Employee, { foreignKey: 'employee_id' });

module.exports = Leave;
