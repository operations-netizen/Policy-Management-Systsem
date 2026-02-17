# Quick Start Guide - Incentive Management System

Get up and running in 5 minutes!

---

## 📦 What You Need

1. **Node.js** v18+ → [Download](https://nodejs.org/)
2. **MongoDB** v5.0+ → [Download](https://www.mongodb.com/try/download/community)
3. **VS Code** (recommended) → [Download](https://code.visualstudio.com/)

---

## 🚀 5-Minute Setup

### Step 1: Extract Files
```bash
# Extract the ZIP file
# You should see this structure:
incentive-system/
├── frontend/
├── backend/
├── database/
├── backend/.env
├── frontend/.env
└── README.md
```

### Step 2: Install MongoDB

**Windows:**
- Download and run MongoDB installer
- MongoDB starts automatically

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb-org
sudo systemctl start mongod
```

**Verify:**
```bash
mongosh
# Should connect successfully
```

### Step 3: Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies (open new terminal)
cd backend
npm install
```

### Step 4: Configure Environment

Create `backend/.env` and set at least `MONGODB_URI` and `JWT_SECRET`:

```bash
# Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Paste the output into backend/.env
JWT_SECRET=paste-the-generated-secret-here
```

Create `frontend/.env` with the VITE_ variables used by the UI (see README.md).

### Step 5: Create Test Users

```bash
cd database
npm install
npm run seed
```

You should see:
```
✅ Test HOD created successfully
✅ Test Initiator created successfully
✅ Test Employee created successfully
✅ Test Freelancer India created successfully
✅ Test Freelancer USA created successfully
```

### Step 6: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 7: Open Browser

Go to: **http://localhost:5173**

**Login with:**
- Email: `suraj@wytlabs.com`
- Password: `password123`

---

## ✅ You're Done!

You should now see the dashboard with:
- Total Users: 6
- Total HODs: 1
- Modern gradient UI
- Working navigation

---

## 🎯 Next Steps

### 1. Change Admin Password
- Click on your profile (bottom left)
- Go to "My Account"
- Change password

### 2. Test the Workflows

**Create a Policy:**
1. Go to "Policies"
2. Click "Create Policy"
3. Fill in details (e.g., Travel Allowance - ₹5000)
4. Save

**Assign Policy to Employee:**
1. Go to "Employee Management"
2. Find "Test Employee 1"
3. Click "Assign Policy"
4. Select the policy you created

**Submit Credit Request:**
1. Logout and login as Initiator:
   - Email: `test-initiator@example.com`
   - Password: `password123`
2. Go to "Transactions"
3. Submit a credit request

**Approve as HOD:**
1. Logout and login as HOD:
   - Email: `test-hod@example.com`
   - Password: `password123`
2. Go to "Approvals"
3. Review and approve the request

---

## 🔧 Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongosh

# If not running:
# Windows: Start MongoDB service from Services
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Port Already in Use
```bash
# Change PORT in backend/.env file
PORT=3001
```

### Cannot Find Module
```bash
# Clear and reinstall (frontend)
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clear and reinstall (backend)
cd backend
rm -rf node_modules package-lock.json
npm install
```

---

## 📁 Folder Structure Explained

```
frontend/           → React application (UI)
  ├── src/pages/    → All page components
  ├── src/components/ → Reusable UI components
  └── src/lib/      → API client and utilities

backend/            → Node.js server (API)
  ├── routers.js    → API endpoints
  ├── db.js         → Database operations
  └── models.js     → Data models

database/           → Database setup
  ├── create-test-users.mjs → Seed script
  └── README.md     → Database guide

  backend/.env         → Server configuration (IMPORTANT!)
  frontend/.env        → Client configuration (IMPORTANT!)
README.md           → Full documentation
```

---

## 🎨 Features Overview

### For Admins
- Create and manage users
- Create incentive policies
- Assign HODs and policies to employees
- View all transactions and reports

### For HODs
- Review credit requests from team
- Approve or reject requests
- View team members

### For Initiators
- Submit credit requests for employees
- Track request status

### For Employees
- View wallet balance
- Request redemptions
- Track transaction history

### For Accounts Managers
- Process redemption payments
- View payment queue

---

## 📞 Need Help?

1. **Check README.md** - Comprehensive documentation
2. **Check database/README.md** - Database-specific help
3. **Check requirements.txt** - All dependencies listed

---

## 🎉 Success Indicators

You know it's working when:
- ✅ Both frontend and backend start without errors
- ✅ You can login with test credentials
- ✅ Dashboard shows 6 users and 1 HOD
- ✅ All navigation links work
- ✅ You can create policies
- ✅ You can submit and approve requests

---

## ⚡ Pro Tips

1. **Use MongoDB Compass** - Visual database browser
2. **Keep both terminals open** - Frontend + Backend
3. **Check browser console** - For any errors
4. **Use VS Code** - Best for development
5. **Install extensions:**
   - ES7+ React/Redux/React-Native snippets
   - Tailwind CSS IntelliSense
   - MongoDB for VS Code

---

## 🔐 Security Reminder

**Before deploying to production:**
- [ ] Change all default passwords
- [ ] Generate new JWT_SECRET
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS
- [ ] Set up proper CORS
- [ ] Enable rate limiting
- [ ] Set up backups

---

**Enjoy your Incentive Management System! 🚀**

For detailed documentation, see **README.md**
