# React Frontend Setup Guide

## Quick Start

### 1. Create React App
```bash
npm create vite@latest aquasense-dashboard -- --template react
cd aquasense-dashboard
npm install
```

### 2. Install Dependencies
```bash
npm install @supabase/supabase-js
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3. Create .env file
```env
VITE_SUPABASE_URL=https://rbcxkozrkyadkebvgwdh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3hyb3pya3lhZGtlYnZnd2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTkwMjYsImV4cCI6MjA5MTIzNTAyNn0.xhM6NV6K7EhLcdkEEkt5NFsc7NS9qD7j5pJZho4Cg2Y
```

### 4. Create src/lib/supabaseClient.js
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 5. Copy Components
- Copy App.jsx → src/App.jsx
- Copy Dashboard.jsx → src/components/Dashboard.jsx
- Copy DataHistory.jsx → src/components/DataHistory.jsx

### 6. Run Locally
```bash
npm run dev
```

Visit: http://localhost:5173

### 7. Deploy to Vercel
```bash
npm install -g vercel
vercel
```

## Project Structure
```
aquasense-dashboard/
├── src/
│   ├── App.jsx
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   └── DataHistory.jsx
│   ├── lib/
│   │   └── supabaseClient.js
│   └── main.jsx
├── .env
└── package.json
```
