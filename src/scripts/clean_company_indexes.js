const sequelize = require('../config/db');

async function cleanIndexes() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        const [results] = await sequelize.query("SHOW INDEX FROM companies");
        console.log(`Found ${results.length} indexes.`);

        const duplicateIndexes = results.filter(idx => idx.Key_name.startsWith('code_') || idx.Key_name === 'code');
        console.log('Potential duplicate indexes on code:', duplicateIndexes.map(i => i.Key_name));

        // Keep one, drop others? 
        // Actually, we should probably drop all 'code' related non-primary indexes and let sequelize recreate ONE if needed,
        // OR better, just drop them all and let us handle it.
        // The error is "Too many keys", max 64. 

        for (const idx of results) {
            if (idx.Key_name !== 'PRIMARY') {
                try {
                    console.log(`Dropping index ${idx.Key_name}...`);
                    await sequelize.query(`DROP INDEX \`${idx.Key_name}\` ON companies`);
                } catch (e) {
                    console.error(`Failed to drop ${idx.Key_name}: ${e.message}`);
                }
            }
        }

        console.log('Cleanup finished.');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanIndexes();
