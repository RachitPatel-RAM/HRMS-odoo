const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EmployeeIdSequence = sequelize.define('EmployeeIdSequence', {
    company_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    year: {
        type: DataTypes.INTEGER,
        primaryKey: true // Composite PK
    },
    current_seq: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: false,
    tableName: 'employee_id_sequences'
});

module.exports = EmployeeIdSequence;
