
// Creates the database schema and seeds sample data.
// Uses the credentials from .env — run with: npm run db:setup
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function main() {
    if (!process.env.DB_USER) {
        console.error('Missing DB settings. Copy .env.example to .env and fill it in first.')
        process.exit(1)
    }

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    })

    for (const file of ['schema.sql', 'seed.sql']) {
        const sql = fs.readFileSync(path.join(__dirname, '..', 'database', file), 'utf8')
        console.log(`Running database/${file}...`)
        await connection.query(sql)
    }

    await connection.end()

    console.log('Database setup complete.')
    console.log('')
    console.log('Demo accounts:')
    console.log('  admin    admin@sportcenter.test    Admin1234!')
    console.log('  manager  manager@sportcenter.test  Manager1234!')
    console.log('  staff    staff@sportcenter.test    Staff1234!')
    console.log('  customer demo@sportcenter.test     Demo1234!')
}

main().catch((err) => {
    console.error('Database setup failed:', err.message)
    process.exit(1)
})
