# SnackRank

SnackRank is a small convenience-store review and rewards app built with Next.js.

## Stack
- Next.js 14
- React 18
- TypeScript
- Prisma ORM
- SQLite for local development
- Vercel + Supabase recommended for deployment

## Local development

1. Install dependencies:
   npm install
2. Copy `.env.example` to `.env` and fill in values.
3. Run Prisma migration:
   npx prisma db push
4. Start the app:
   npm run dev

## Production deployment recommendation

- Frontend: Vercel
- Database: Supabase PostgreSQL
- Session secret: configure in Vercel environment variables

## Notes

This project currently uses a local Prisma SQLite database for development and a JSON fallback during migration.
