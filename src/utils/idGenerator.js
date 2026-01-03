const EmployeeIdSequence = require('../models/EmployeeIdSequence');
const sequelize = require('../config/db');

/**
 * Generates a unique Employee ID based on the format: OIJOD020220001
 * OI (Company) + JO (First 2) + DO (Last 2) + 2022 (Year) + 0001 (Seq)
 */
async function generateEmployeeId(companyId, firstName, lastName) {
    const year = new Date().getFullYear();

    // Extract initials (First 2 chars, uppercase)
    const fNameCode = firstName.substring(0, 2).toUpperCase();
    const lNameCode = lastName.substring(0, 2).toUpperCase();

    const transaction = await sequelize.transaction();

    try {
        // Find or create sequence for this company+year
        let [sequence] = await EmployeeIdSequence.findOrCreate({
            where: { company_id: companyId, year: year },
            defaults: { current_seq: 0 },
            top: 1, // ensure one
            transaction,
            lock: true // Pessimistic locking to prevent race conditions
        });

        // Increment
        sequence.current_seq += 1;
        await sequence.save({ transaction });

        const seqStr = sequence.current_seq.toString().padStart(4, '0');

        // Construct ID
        // Format: OI (Static) + JO (First 2) + DO (Last 2) + 2022 (Year) + 0001 (Seq)
        // Ensure initials are at least 2 chars or padded? User example: "john" -> "JO", "don" -> "DO".
        // If name is short, e.g. "A", pad with "X"? Assuming names are sufficient length for now or padding with 'X'.
        const fCode = firstName.length >= 2 ? firstName.substring(0, 2).toUpperCase() : firstName.padEnd(2, 'X').toUpperCase();
        const lCode = lastName.length >= 2 ? lastName.substring(0, 2).toUpperCase() : lastName.padEnd(2, 'X').toUpperCase();

        const employeeId = `OI${fCode}${lCode}${year}${seqStr}`;

        await transaction.commit();
        return employeeId;
    } catch (error) {
        if (transaction) await transaction.rollback();
        throw error;
    }
}

module.exports = { generateEmployeeId };
