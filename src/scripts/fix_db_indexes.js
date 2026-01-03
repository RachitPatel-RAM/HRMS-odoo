const sequelize = require('../config/db');

async function fixIndexes() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        const [results] = await sequelize.query("SHOW INDEX FROM users");

        // Filter for email related indexes
        const emailIndexes = results.filter(row => row.Column_name === 'email');
        console.log(`Found ${emailIndexes.length} indexes on 'email' column.`);

        // Group by Key_name
        const keyNames = [...new Set(emailIndexes.map(r => r.Key_name))];

        // We want to keep one. Usually 'email' or 'users_email_unique'.
        // Let's drop all that are NOT 'email' (if it exists) or keep the first one.
        // Actually, Sequelize often names it 'email', 'email_2', etc.

        // Strategy: Keep 'email' if exists, otherwise keep the first one. Drop others.
        let keeper = 'email';
        if (!keyNames.includes('email')) {
            keeper = keyNames[0];
        }

        console.log(`Keeping index: ${keeper}`);

        for (const key of keyNames) {
            if (key !== keeper && key !== 'PRIMARY') {
                console.log(`Dropping index: ${key}`);
                await sequelize.query(`DROP INDEX \`${key}\` ON users`);
            }
        }

        console.log('Cleanup complete.');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixIndexes();
