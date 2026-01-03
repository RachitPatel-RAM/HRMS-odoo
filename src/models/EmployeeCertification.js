const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Employee = require('./Employee');

const EmployeeCertification = sequelize.define('EmployeeCertification', {
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
    certification_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    organization: {
        type: DataTypes.STRING,
        allowNull: true
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'employee_certifications'
});

Employee.hasMany(EmployeeCertification, { foreignKey: 'employee_id' });
EmployeeCertification.belongsTo(Employee, { foreignKey: 'employee_id' });

module.exports = EmployeeCertification;
