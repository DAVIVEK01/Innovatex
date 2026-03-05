# 🍽️ CampusEats — College Canteen Ordering System

A full-stack, production-ready web app for managing a college canteen.
Students order food online, track their order live, and pick it up when ready.
Canteen staff manage the kitchen queue from a real-time dashboard.

---

## 📁 Project Structure

```
campuseats/
├── server/
│   ├── server.js          ← Main Express + Socket.io server
│   ├── db.js              ← SQLite database setup & queries
│   ├── seed.js            ← Seed script (run once to set up users & menu)
│   ├── routes/
│   │   ├── auth.js        ← Login, register, /me
│   │   ├── orders.js      ← Place order, get orders, update status
│   │   └── menu.js        ← Get menu, toggle availability, settings
│   └── middleware/
│       └── auth.js        ← JWT auth middleware
├── public/                ← Frontend (served as static files)
│   ├── index.html         ← Login page
│   ├── menu.html          ← Menu page
│   ├── cart.html          ← Cart page
│   ├── payment.html       ← Payment & order confirmation
│   ├── track.html         ← Order tracking (real-time)
│   ├── dashboard.html     ← Canteen staff dashboard
│   ├── css/style.css      ← All styles
│   └── js/
│       ├── api.js         ← API client + Auth + Cart helpers
│       └── utils.js       ← Shared UI utilities
├── .env.example           ← Environment variable template
├── package.json
└── README.md
```

---

## 🚀 Quick Start (Local)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env and set JWT_SECRET to a long random string
```

### 3. Seed the database (first time only)
```bash
npm run seed
```

### 4. Start the server
```bash
npm start
# Development with auto-reload:
npm run dev
```

### 5. Open the app
```
http://localhost:3000
```

### Default Login Credentials
| Role    | Username   | Password   |
|---------|------------|------------|
| Student | demo       | demo       |
| Student | CS21B001   | student@123|
| Staff   | demostaff  | demo       |
| Staff   | STAFF001   | staff@123  |

---

## ☁️ Deploying for Real (Free Options)

### Option A — Render.com (Recommended, Free)

1. Push this project to a GitHub repository
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Set these:
   - **Build Command:** `npm install && npm run seed`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Add environment variables:
   - `JWT_SECRET` = (a long random string)
   - `NODE_ENV` = `production`
   - `COLLEGE_NAME` = your college name
   - `CANTEEN_NAME` = your canteen name
   - `PICKUP_COUNTER` = your pickup location
6. Click Deploy. Your site will be live at `https://your-app.onrender.com`

### Option B — Railway.app (Free tier)

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Add the same environment variables as above
4. Railway auto-detects Node.js and deploys

### Option C — Your College Server / VPS

If your college has a server:
```bash
# On the server
git clone <your-repo>
cd campuseats
npm install
cp .env.example .env
nano .env   # set JWT_SECRET and other values
npm run seed
npm start

# Keep it running with PM2
npm install -g pm2
pm2 start server/server.js --name campuseats
pm2 startup   # auto-start on reboot
```

---

## 👥 Adding Real Students

### Option 1: Students self-register
Students can register directly on the login page using their roll number.

### Option 2: Bulk import via seed.js
Edit `server/seed.js` — add your students to the `users` array:
```js
{ roll:'CS22A001', name:'Student Name', email:'email@college.edu', password: STUDENT_PASS, type:'student' },
```
Then run: `node server/seed.js`

### Option 3: Direct database (SQLite)
Install DB Browser for SQLite, open `server/campuseats.db`, and add rows directly.

---

## 🍽️ Updating the Menu

After deployment, the easiest way to update the menu is:
1. Sign in as staff → Dashboard → Menu Manager (toggle items on/off)
2. Or edit `server/seed.js` and re-run it (only adds new items, won't duplicate)
3. Or use DB Browser for SQLite to edit directly

---

## 📊 Can This Handle 2000–4000 Students?

**Yes — with the right deployment setup.**

This backend is built on:
- **SQLite with WAL mode** — handles hundreds of concurrent reads, perfectly fine for a canteen where not everyone orders at the same time. Expected peak: ~50–100 concurrent users.
- **Express.js** — easily handles 1000+ requests/second on a basic server
- **Socket.io** — real-time updates without polling

**What you need for 2000–4000 students:**
- A server with at least **512 MB RAM** (Render free tier qualifies)
- For absolute peak (lunch rush), a **$5–7/month VPS** on DigitalOcean or Linode is more than enough
- If you ever need to scale beyond that, swap SQLite for PostgreSQL (Supabase free tier)

**Expected load for a college canteen:**
- Total students: 2000–4000
- Orders per day: probably 200–600 (not everyone eats at the canteen)
- Peak concurrent users: 20–80 (lunch rush over 1–2 hours)
- This is extremely manageable for this stack

---

## 🔐 Security Notes

- Change `JWT_SECRET` in `.env` to a long random string before deploying
- Student passwords are hashed with bcrypt
- Rate limiting is applied to login (20 attempts/15 min) and API (200 req/15 min)
- All prices are validated server-side — clients can't fake prices

---

## 🛠 Customization Checklist

- [ ] Update `COLLEGE_NAME`, `CANTEEN_NAME`, `PICKUP_COUNTER` in `.env`
- [ ] Update menu items in `server/seed.js`
- [ ] Update staff accounts in `server/seed.js`
- [ ] Set `JWT_SECRET` to a strong random value
- [ ] (Optional) Add your college logo to `public/assets/`
- [ ] (Optional) Update colors in `public/css/style.css` (--accent variable)

---

## 📞 Tech Stack

| Layer     | Technology            |
|-----------|-----------------------|
| Frontend  | Vanilla HTML/CSS/JS   |
| Backend   | Node.js + Express     |
| Database  | SQLite (better-sqlite3)|
| Real-time | Socket.io             |
| Auth      | JWT + bcrypt          |
| Hosting   | Render / Railway / VPS|
