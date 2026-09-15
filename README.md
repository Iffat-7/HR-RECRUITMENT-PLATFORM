# TalentGate - HR Recruitment & Video Interview Platform

A comprehensive HR recruitment platform with AI-powered candidate interviews, video recording, and streamlined evaluation workflows.

![V1.2](https://img.shields.io/badge/version-1.2-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e)

## 🚀 Features

### For Candidates
- **Easy Registration** - Simple sign-up with profile creation
- **CV Upload** - Secure document upload (PDF/DOC/DOCX, max 10MB)
- **Profile Photo** - Add your photo (JPEG/PNG/WebP, max 5MB)
- **Video Interviews** - Record video responses to interview questions
- **Audio Interviews** - Record audio responses when video isn't required
- **Preview & Retake** - Review recordings before submission, retake if needed
- **Progress Tracking** - See your application status in real-time

### For HR Teams
- **Candidate Dashboard** - View all candidates and their status
- **Video Playback** - Watch candidate interview recordings securely
- **Evaluation System** - Score candidates across multiple criteria
- **Status Management** - Track candidates through the hiring pipeline
- **Audit Logs** - Complete activity tracking for compliance
- **Role-Based Access** - HR and Candidate roles with proper permissions

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Video Recording**: MediaRecorder API
- **File Upload**: XHR with progress tracking
- **Security**: Row Level Security (RLS), Signed URLs

## 📋 Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- Modern web browser with camera/microphone access

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd talentgate
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### Option A: Use Existing Project (Demo)
The app comes pre-configured with a demo Supabase project. You can start immediately:

```bash
npm run dev
```

#### Option B: Create Your Own Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and run the migrations in order:
   - `supabase/migrations/0001_foundation.sql`
   - `supabase/migrations/0002_recording_pipeline.sql`
   - `supabase/migrations/0003_google_signin.sql`
   - `supabase/migrations/0004_simplified_roles.sql`
3. Run verification: `supabase/verify.sql`
4. Update `.env.local` with your project credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

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
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 6. Create HR User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → Create your HR account
3. Copy the User UID
4. Run in SQL Editor:

```sql
INSERT INTO user_roles (user_id, role_id)
VALUES ('YOUR_USER_UID', '11111111-1111-1111-1111-111111111111');
```

### 7. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 📁 Project Structure

```
talentgate/
├── src/
│   ├── components/          # React components
│   │   ├── admin/          # HR dashboard components
│   │   ├── candidate/      # Candidate portal components
│   │   └── ui/             # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and services
│   │   ├── supabase/       # Supabase client
│   │   ├── recorder/       # MediaRecorder utilities
│   │   └── validation/     # Zod schemas
│   ├── pages/              # Page components
│   │   ├── admin/          # HR pages
│   │   ├── auth/           # Login page
│   │   ├── candidate/      # Candidate pages
│   │   └── public/         # Landing page
│   ├── services/           # API service layer
│   └── types/              # TypeScript types
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
└── public/                 # Static assets
```

## 🔐 Security

- **Row Level Security (RLS)** - All database tables protected
- **Private Storage** - Files stored in private buckets with signed URLs
- **Role-Based Access** - HR and Candidate roles with proper permissions
- **Input Validation** - Client and server-side validation
- **CORS Protection** - Restricted to authorized origins
- **No Secrets in Frontend** - Service role key only on server

## 📚 Documentation

- [Supabase Deployment Guide](SUPABASE_DEPLOYMENT.md) - Database setup
- [Backend Deployment Guide](BACKEND_DEPLOYMENT.md) - Edge Functions setup
- [Testing Guide](TESTING_GUIDE.md) - How to test the application
- [Role Simplification](ROLE_SIMPLIFICATION.md) - HR/Candidate roles explained
- [Edge Functions API](supabase/functions/README.md) - Backend API documentation

## 🧪 Testing

### Manual Testing Checklist

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for complete testing instructions.

**Quick Test:**
1. Register as a candidate
2. Upload CV and profile photo
3. Start an interview (requires camera/microphone)
4. Record video/audio responses
5. Submit interview
6. Login as HR and review submission

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Deploy to Vercel/Netlify

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Deploy Edge Functions

```bash
./deploy-functions.sh
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking

## 📊 Database Schema

The application uses 17 database tables:
- `roles` - User roles (HR, Candidate)
- `profiles` - User profiles
- `user_roles` - User-role assignments
- `candidates` - Candidate information
- `positions` - Job positions
- `applications` - Job applications
- `questions` - Interview questions
- `question_sets` - Question collections
- `question_set_questions` - Question-set relationships
- `interviews` - Interview sessions
- `interview_questions` - Interview-question relationships
- `recordings` - Video/audio recordings
- `evaluations` - HR evaluations
- `evaluation_scores` - Evaluation scores
- `evaluation_categories` - Scoring categories
- `status_history` - Status change history
- `audit_logs` - Activity audit logs

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Limitations

- Video/audio recording requires HTTPS in production
- Camera/microphone permissions must be granted by user
- File uploads limited to 10MB (CV) and 5MB (photo)
- Recording duration limited by question configuration

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation in the `docs/` folder
- Review the [Testing Guide](TESTING_GUIDE.md)

## 🎯 Roadmap

### V1.3 (Planned)
- AI transcription of interview recordings
- AI-powered candidate scoring assistance
- Advanced reporting and analytics
- Email notifications

### V1.4 (Planned)
- WhatsApp integration
- n8n workflow automation
- CRM integrations
- Advanced scheduling

## ⭐ Show Your Support

If you find this project useful, please consider giving it a star on GitHub!

---

**Built with ❤️ using React, TypeScript, and Supabase**
