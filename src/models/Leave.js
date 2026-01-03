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
        type: DataTypes.STRING,
        defaultValue: 'Annual'
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        defaultValue: 'PENDING'
    },
    reason: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'leaves',
    timestamps: true
});

Employee.hasMany(Leave, { foreignKey: 'employee_id' });
Leave.belongsTo(Employee, { foreignKey: 'employee_id' });

module.exports = Leave;
