# Deployment & Operational Readiness Guide

## 1. Local Zero-Config Quickstart
The application runs locally without requiring external database daemons or Docker:
```bash
# 1. Install pinned dependencies
npm install

# 2. Synchronize database schema and generate Prisma 7 client
npx prisma db push
npx prisma generate

# 3. Seed deterministic institutional catalog and demo accounts
npm run db:seed

# 4. Run automated test suite
npm test

# 5. Launch development server
npm run dev
```

## 2. Production PostgreSQL Deployment
For staging and production deployment with managed PostgreSQL:
1. Spin up PostgreSQL 16+ container using the included `docker-compose.yml`:
   ```bash
   docker compose up -d
   ```
2. In `.env.production`, configure connection string:
   ```dotenv
   DATABASE_URL="postgresql://admission_user:admission_password@localhost:5432/admissions_db"
   AUTH_SECRET="your-strong-production-32char-secret"
   APP_BASE_URL="https://admissions.institution.edu.in"
   ```
3. Update `prisma/schema.prisma` datasource provider to `postgresql` and apply migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Build Next.js 16 production bundle:
   ```bash
   npm run build
   npm start
   ```

## 3. Backup and Disaster Recovery Drill
- Daily automated pg_dump: `pg_dump -Fc -U admission_user admissions_db > admissions_backup.dump`
- Restore verification: `pg_restore -U admission_user -d admissions_test admissions_backup.dump`
- Object storage: S3 bucket versioning and multi-region replication enabled.
