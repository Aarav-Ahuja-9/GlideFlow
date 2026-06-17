// prisma.config.ts
import { defineConfig } from '@prisma/config';
import 'dotenv/config'; // Load .env file securely

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});