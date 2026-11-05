import { defineConfig } from 'drizzle-kit';
require('dotenv').config({ quiet: true });

// Usato solo da drizzle-kit (es. `npm run db:pull` per confrontare lo schema con il DB reale)
export default defineConfig({
    dialect: 'postgresql',
    schema: './db/schema.ts',
    out: './drizzle',
    dbCredentials: {
        host: process.env.DB_HOST!,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
        user: process.env.USERNAME_DB,
        password: process.env.PW_DB,
        database: process.env.DB_NAME!,
        ssl: false,
    },
});
