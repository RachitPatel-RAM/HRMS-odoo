const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BankDetail = sequelize.define('BankDetail', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    employee_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'employees', // referencing table name
            key: 'id'
        },
        unique: true // One bank detail record per employee
    },
    account_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bank_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ifsc_code: {
        type: DataTypes.STRING,
        allowNull: true
    },
    pan_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    uan_number: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'bank_details'
});

module.exports = BankDetail;
