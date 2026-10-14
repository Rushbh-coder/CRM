# LeadBook CRM (MERN stack)

A complete CRM built with **MongoDB, Express, React and Node.js**.

**Modules**
- **Login and sign-up.** Each business gets its own private workspace. Team members get their own logins with roles: owner, admin or member.
- **Dashboard.** Summary cards, sales funnel, deals by source, upcoming activities, recent deals and top customers.
- **Leads.** Filters (status, source, owner, date), automatic lead score, status chart, CSV export and pagination.
- **Contacts.** Searchable table, detail panel, quick actions (log a call, schedule a meeting), CSV import and export.
- **Accounts.** Built automatically from company names on contacts and deals, with health, segment chart and recent activity.
- **Deals.** Pipeline board (New → Contacted → Qualified → Proposal Sent → Won / Lost), pipeline summary and 30-day trend.
- **Activities.** Timeline of calls, meetings, demos, emails and notes, plus a weekly summary.
- **Tasks.** Board and list views, priorities, assignees, and overdue and upcoming lists.
- **Calendar.** Month and week views with an agenda. Follow-up dates and task deadlines show up automatically.
- **Reports.** Revenue over time, pipeline by stage, deals by source, team performance and insights.
- **Email Automation.** Daily automatic emails (follow-ups, welcome, thank-you, inactive check-in and a daily summary for you), editable templates, today's queue preview and a sent log.
- **Settings.** Profile, team members, theme (light, dark or system), primary color, sidebar style, date format, password, and CSV import and export.

---

## 1. Install these first (one time)

| Tool | Where to get it | Check it works |
|---|---|---|
| **Node.js 18 or newer** (LTS) | https://nodejs.org | `node -v` |
| **MongoDB** (pick one) | **Local:** MongoDB Community Server from https://www.mongodb.com/try/download/community (tick "Install MongoDB Compass" too) <br>**Cloud:** a free MongoDB Atlas cluster at https://www.mongodb.com/atlas | Open MongoDB Compass and connect to `mongodb://127.0.0.1:27017` |
| **VS Code** | https://code.visualstudio.com | — |
| **Git** (optional) | https://git-scm.com | `git --version` |

---

## 2. Open the project in VS Code

1. Unzip `leadbook-crm.zip` somewhere easy, for example `D:\Projects\leadbook-crm`.
2. Open VS Code, then go to **File → Open Folder…** and choose the `leadbook-crm` folder.
3. When VS Code asks *"Do you want to install the recommended extensions?"*, click **Install**. You get Prettier, ESLint, MongoDB and REST Client.
4. Open a terminal inside VS Code with **Terminal → New Terminal** (shortcut: <kbd>Ctrl</kbd> + <kbd>`</kbd>).

---

## 3. Set up the server settings (.env)

1. In VS Code, open the `server` folder.
2. Copy **`.env.example`** and name the copy **`.env`**. You can also do it in the terminal:
   - Windows (PowerShell): `Copy-Item server\.env.example server\.env`
   - Mac / Linux: `cp server/.env.example server/.env`
3. Open `server/.env` and check these lines:

```env
MONGO_URI=mongodb://127.0.0.1:27017/leadbook_crm
JWT_SECRET=put_any_long_random_text_here_at_least_32_characters
```

- **Local MongoDB:** keep the `MONGO_URI` shown above.
- **MongoDB Atlas:** in Atlas, click **Connect → Drivers**, copy the connection string, put your password in it, and add `/leadbook_crm` before the `?`. For example:
  `MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/leadbook_crm?retryWrites=true&w=majority`
  In Atlas **Network Access**, add your IP address (or `0.0.0.0/0` while testing).

The email settings can wait. See step 7.

---

## 4. Install the packages

In the VS Code terminal, inside the `leadbook-crm` folder, run:

```bash
npm run install-all
```

This installs packages for the root folder, the `server` and the `client`. It takes 1–3 minutes.

---

## 5. Add demo data (optional, recommended)

```bash
npm run seed
```

This creates a demo business with sample contacts, deals, tasks and activities.

- **Login:** `demo@leadbook.test`
- **Password:** `demo1234`
- Team member login: `ravi@leadbook.test` / `demo1234`

Running it again resets only the demo business.

---

## 6. Start the app

```bash
npm run dev
```

This starts both parts together:
- **API** (Express) at http://localhost:5000. Test it at http://localhost:5000/api/health
- **Website** (React) at **http://localhost:5173**. Open this link in your browser.

Log in with the demo account, or click **Create your CRM account** to start fresh with your own business.

To stop, press <kbd>Ctrl</kbd> + <kbd>C</kbd> in the terminal.

> To run the two parts in separate terminals instead:
> Terminal 1: `cd server` then `npm run dev`
> Terminal 2: `cd client` then `npm run dev`

---

## 7. Turn on automatic daily emails (Gmail)

1. In your Google account, turn on **2-Step Verification** (Google Account → Security).
2. Create an **App password**: Google Account → Security → 2-Step Verification → **App passwords**. Name it "CRM" and copy the 16-character password.
3. Put it in `server/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=yourname@gmail.com
SMTP_PASS=abcdefghijklmnop
MAIL_FROM="Your Business <yourname@gmail.com>"
AUTOMATION_ENABLED=true
AUTOMATION_CRON=0 9 * * *
TZ_NAME=Asia/Kolkata
```

4. Restart the app (<kbd>Ctrl</kbd> + <kbd>C</kbd>, then `npm run dev`).
5. In the CRM, go to **Settings → Email & Business** and fill in your business name, signature name and your email for the daily summary.
6. Go to **Email Automation**, then:
   - Click **Send test email** to check that it works.
   - Switch on the rules you want and edit their text if you like.
   - Click **Turn on** for daily sending. The server then sends the queue every day at 9:00 AM India time, as long as the server is running.
   - **Send today's queue now** sends immediately.

Addresses ending in `.example` or `.test` (the demo data) are always skipped, so no real person gets a test email.

`AUTOMATION_CRON` uses cron format: `0 9 * * *` means every day at 09:00. For weekdays only, use `0 9 * * 1-5`.

---

## 8. Project structure

```
leadbook-crm/
├─ package.json            ← root scripts: install-all, dev, seed, build, start
├─ api-tests.http          ← ready-made API calls for the REST Client extension
├─ server/                 ← Node.js + Express + MongoDB API
│  ├─ .env.example         ← copy to .env
│  └─ src/
│     ├─ index.js          ← starts the API and the daily email scheduler
│     ├─ seed.js           ← demo data
│     ├─ config/db.js      ← MongoDB connection
│     ├─ middleware/       ← login check (JWT), error handling
│     ├─ models/           ← Organization, User, Contact, Lead, Activity, Task, Automation, EmailLog
│     ├─ routes/           ← auth, team, records (contacts/leads/activities/tasks), settings, automation
│     ├─ services/         ← automation rules, mailer (Nodemailer), scheduler (node-cron)
│     └─ utils/            ← generic CRUD router, date helpers
└─ client/                 ← React (Vite)
   ├─ vite.config.js       ← forwards /api to the server during development
   └─ src/
      ├─ App.jsx           ← routes
      ├─ api.js            ← Axios with login token
      ├─ context/          ← AuthContext (login), DataContext (all CRM data + actions)
      ├─ components/       ← Layout (sidebar/topbar), forms, charts, icons, small UI parts
      ├─ lib/              ← formatting, lead score, accounts, calendar logic
      ├─ pages/            ← Dashboard, Leads, Contacts, Accounts, Deals, Activities, Tasks, Calendar, Reports, Automation, Settings, Login/Register
      └─ styles.css        ← the whole design (light + dark themes)
```

---

## 9. API reference

All routes except `/api/auth/register`, `/api/auth/login` and `/api/health` need the header `Authorization: Bearer <token>`.

| Method | Route | What it does |
|---|---|---|
| POST | `/api/auth/register` | Create a business + owner account |
| POST | `/api/auth/login` | Log in, returns a token |
| GET / PUT | `/api/auth/me` | Read / update your profile |
| PUT | `/api/auth/password` | Change password |
| GET / POST / PUT / DELETE | `/api/team` `/api/team/:id` | Team members (owner/admin to change) |
| GET / POST / PUT / DELETE | `/api/contacts` `/api/contacts/:id` | Contacts |
| POST | `/api/contacts/import` | Import many contacts `{ rows: [...] }` |
| GET / POST / PUT / DELETE | `/api/leads` `/api/leads/:id` | Leads and deals |
| GET / POST / PUT / DELETE | `/api/activities` `/api/activities/:id` | Activities |
| GET / POST / PUT / DELETE | `/api/tasks` `/api/tasks/:id` | Tasks |
| GET / PUT | `/api/settings` | Business, appearance and daily sending settings |
| GET | `/api/automation` | Rules, today's queue, sent log, status |
| PUT | `/api/automation/rules/:key` | Turn a rule on/off or change its email text |
| POST | `/api/automation/rules/:key/reset` | Restore a rule's default text |
| POST | `/api/automation/run` | Send today's queue now |
| POST | `/api/automation/test` | Send a test email |

Open `api-tests.http` in VS Code and click **Send Request** to try them.

---

## 10. Build for production

```bash
npm run build      # builds the React app into client/dist
npm start          # the Express server now serves the website and the API on port 5000
```

Open http://localhost:5000. To put it online, deploy to a Node host (Render, Railway, a VPS…) with the same `.env` values, and use MongoDB Atlas for the database. Daily emails only send while the server is running, so pick a host that keeps it running.

---

## 11. Common problems

| Problem | Fix |
|---|---|
| `Could not connect to MongoDB` | Start MongoDB (Windows: Services → "MongoDB Server" → Start), or check your Atlas `MONGO_URI`, password and Network Access. |
| `MONGO_URI is missing` / `JWT_SECRET is missing` | You didn't create `server/.env`. Do step 3. |
| Website says "Can't reach the server" | The API isn't running. Look for errors in the terminal labelled **API**. |
| `Port 5000 is already in use` | Change `PORT=5001` in `server/.env`, and change the proxy target in `client/vite.config.js` to `http://localhost:5001`. |
| `'concurrently' is not recognized` | Run `npm run install-all` again from the `leadbook-crm` folder. |
| Test email fails with "Invalid login" | Use a Gmail **App password**, not your normal Gmail password, and check 2-Step Verification is on. |
| Login works but the page is empty | Run `npm run seed` for demo data, or start adding your own records with the **+** button. |
