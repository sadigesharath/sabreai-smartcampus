# SabreAI SmartCampus

## Setup Steps

### 1. Install dependencies
```bash
npm install
```

### 2. Create .env.local
Copy .env.example → .env.local and fill in your keys.

### 3. Generate VAPID keys (for push notifications)
Go to: https://web-push-codelab.glitch.me/
Copy Public Key → NEXT_PUBLIC_VAPID_PUBLIC_KEY
Copy Private Key → VAPID_PRIVATE_KEY

### 4. Run push_subscriptions SQL in Supabase
Open supabase_push_schema.sql and run in SQL Editor.

### 5. Run locally
```bash
npm run dev
```

## URLs
- Faculty Login: /login
- Faculty Dashboard: /dashboard
- Faculty Profile: /dashboard/profile
- HOD Login: /hod/login
- HOD Dashboard: /hod
