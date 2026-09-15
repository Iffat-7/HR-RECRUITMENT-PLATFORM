# 🚀 Quick Start Guide

Get TalentGate up and running in 5 minutes!

## Option 1: Demo Mode (Fastest)

The app comes pre-configured with a demo Supabase project. Just run:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and start exploring!

**Note:** Demo mode uses a shared database. For production use, follow Option 2.

---

## Option 2: Full Setup (Recommended for Production)

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Wait for project to initialize (~2 minutes)

### 2. Run Database Migrations

Go to **SQL Editor** in Supabase Dashboard and run these files in order:

1. `supabase/migrations/0001_foundation.sql`
2. `supabase/migrations/0002_recording_pipeline.sql`
3. `supabase/migrations/0003_google_signin.sql`
4. `supabase/migrations/0004_simplified_roles.sql`

Then run verification:
5. `supabase/verify.sql`

You should see: `VERIFY PASSED`

### 3. Configure Environment

Create `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in Supabase Dashboard → Settings → API

### 4. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all functions
./deploy-functions.sh
```

### 5. Set Edge Function Secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

- `SUPABASE_URL` = Your project URL
- `SUPABASE_ANON_KEY` = Your anon key
- `SUPABASE_SERVICE_ROLE_KEY` = Your service role key

### 6. Create HR User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → Create your HR account
3. Copy the User UID
4. Run in SQL Editor:

```sql
INSERT INTO user_roles (user_id, role_id)
VALUES ('YOUR_USER_UID', '11111111-1111-1111-1111-111111111111');
```

### 7. Start the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Testing the App

### As a Candidate

1. Click "Candidate Portal"
2. Register with your email
3. Upload a CV (PDF/DOC/DOCX)
4. Upload a profile photo (optional)
5. Start an interview (requires camera/microphone)
6. Record video/audio responses
7. Submit your interview

### As HR

1. Click "HR Sign In"
2. Login with your HR account
3. View candidate submissions
4. Watch interview recordings
5. Submit evaluations
6. Update candidate status

---

## Troubleshooting

### "Missing environment variables" error

Make sure you created `.env.local` with your Supabase credentials.

### Edge Functions not found

Deploy them with `./deploy-functions.sh` and set the secrets in Supabase Dashboard.

### Camera/microphone not working

- Make sure you're on HTTPS (or localhost)
- Grant browser permissions when prompted
- Check that your devices are connected

### Database errors

Run the migrations in order and check `verify.sql` output.

---

## Next Steps

- Read the full [README.md](README.md)
- Check [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing
- Review [SUPABASE_DEPLOYMENT.md](SUPABASE_DEPLOYMENT.md) for detailed setup
- See [BACKEND_DEPLOYMENT.md](BACKEND_DEPLOYMENT.md) for Edge Functions

---

## Need Help?

- Check the documentation files
- Review the code comments
- Open an issue on GitHub

**Happy recruiting! 🎉**
