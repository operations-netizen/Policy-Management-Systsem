# Incentive Management System

A complete web-based incentive management system for tracking employee credits, approvals, and redemptions with document signing integration.

---

## 📁 Project Structure

```
incentive-system/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable UI components
│   │   ├── lib/          # Utilities and API client
│   │   └── contexts/     # React contexts
│   ├── public/           # Static assets
│   └── package.json
│
├── backend/              # Node.js + Express backend
│   ├── rest.js           # API endpoints (REST)
│   ├── db.js             # Database operations
│   ├── models.js         # MongoDB models
│   ├── ghl.js            # GHL integration
│   ├── storage.js        # File storage
│   ├── _core/            # Core utilities
│   └── shared/           # Shared types
│
├── database/             # Database setup
│   ├── drizzle/          # Schema definitions
│   ├── create-test-users.mjs  # Seed script
│   └── drizzle.config.js
│
├── backend/.env          # Backend environment variables (create this)
├── frontend/.env         # Frontend environment variables (create this)
├── README.md             # This file
└── requirements.txt      # Dependencies list
```

---

## 🚀 Features

### Core Functionality
- **User Management** - Create and manage users with different roles
- **Employee Management** - Assign HODs, policies, and initiators
- **Policy Management** - Define incentive policies with eligibility rules
- **Credit Requests** - Submit policy-based or amount-based requests
- **Approval Workflow** - HOD review and approval system
- **Redemption System** - Employee redemption with payment processing
- **Document Signing** - GHL integration for freelancer contracts
- **Audit Logs** - Track all system activities
- **Reports** - Generate analytics and reports

### User Roles
- **Admin** - Full system access
- **HOD** - Approve credit requests
- **Initiator** - Submit requests on behalf of employees
- **Employee** - View wallet and request redemptions
- **Accounts Manager** - Process payments
- **Freelancer** - Special employee type with document signing

---

## 📋 Prerequisites

### Required Software
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **MongoDB** v5.0+ ([Download](https://www.mongodb.com/try/download/community))
- **npm** or **pnpm** (comes with Node.js)

### Optional
- **MongoDB Compass** - GUI for MongoDB ([Download](https://www.mongodb.com/products/compass))
- **Postman** - API testing ([Download](https://www.postman.com/downloads/))

---

## 🛠️ Installation

### Step 1: Install MongoDB

**Windows:**
1. Download MongoDB Community Server
2. Run installer and follow wizard
3. Start MongoDB service from Services

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Verify MongoDB is running:**
```bash
mongosh
# Should connect to MongoDB shell
```

### Step 2: Install Project Dependencies

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### Step 3: Configure Environment Variables

Create `backend/.env`:

```env
# ===================================
# DATABASE CONFIGURATION
# ===================================
MONGODB_URI=mongodb://localhost:27017/incentive-system
# For MongoDB Atlas (cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/incentive-system

# ===================================
# JWT AUTHENTICATION
# ===================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# ===================================
# SERVER CONFIGURATION
# ===================================
PORT=3000
NODE_ENV=development

# ===================================
# OPTIONAL INTEGRATIONS
# ===================================
DATABASE_URL=
VITE_APP_ID=
OAUTH_SERVER_URL=
OWNER_OPEN_ID=
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
```

Create `frontend/.env`:

```env
# ===================================
# FRONTEND CONFIGURATION
# ===================================
VITE_OAUTH_PORTAL_URL=
VITE_APP_ID=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

**Important:** Generate a strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Create Database and Seed Users

```bash
cd database
npm install
npm run seed
```

This creates 6 test users:
| Email | Password | Role | Type |
|-------|----------|------|------|
| suraj@wytlabs.com | password123 | Admin | Permanent |
| test-hod@example.com | password123 | HOD | Permanent |
| test-initiator@example.com | password123 | Initiator | Permanent |
| test-employee1@example.com | password123 | User | Permanent |
| test-freelancer-in@example.com | password123 | User | Freelancer India |
| test-freelancer-usa@example.com | password123 | User | Freelancer USA |

---

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend starts on: http://localhost:3000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend starts on: http://localhost:5173

**Open browser:** http://localhost:5173

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Test Coverage
- Authentication tests
- User management CRUD
- Policy management
- Credit request workflow
- MongoDB connection
- API endpoints

---

## 📊 Workflows

### Workflow 1: Policy-Based Credit Request

```
1. Admin creates policy (e.g., "Travel - ₹5000")
   └─> Policies page → Create Policy

2. Admin assigns policy to employee
   └─> Employee Management → Assign Policy

3. Admin assigns HOD to employee
   └─> Employee Management → Assign HOD

4. Initiator submits credit request
   └─> Transactions → Submit Request → Select Policy

5. HOD reviews and approves
   └─> Approvals → Review → Approve

6. Credits added to employee wallet
   └─> Employee sees balance in Dashboard

7. Employee requests redemption
   └─> Wallet → Request Redemption

8. Accounts Manager processes payment
   └─> Accounts → Process Payment
```

### Workflow 2: Freelancer Amount Request

```
1. Admin assigns initiator to freelancer
   └─> Employee Management → Assign Initiator

2. Initiator submits amount request
   └─> Transactions → Submit Amount Request

3. System generates GHL document
   └─> Freelancer receives signing link

4. Freelancer signs document
   └─> GHL webhook confirms signing

5. HOD approves signed request
   └─> Approvals → Approve

6. Credits added to freelancer wallet

7. Freelancer requests redemption

8. Accounts Manager processes payment
```

---

## 🎨 UI Customization

### Theme Colors

Edit `frontend/src/index.css`:

```css
:root {
  --primary: #8b5cf6;      /* Purple */
  --secondary: #3b82f6;    /* Blue */
  --accent: #ec4899;       /* Pink */
  --success: #10b981;      /* Emerald */
  --warning: #f59e0b;      /* Amber */
  --danger: #ef4444;       /* Red */
}
```

### Logo

Replace `frontend/public/logo.png` with your logo.

---

## 🔐 Security

### Best Practices Implemented
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ Input validation
- ✅ MongoDB injection prevention
- ✅ CORS configuration
- ✅ Environment variable protection

### Production Checklist
- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Set up MongoDB authentication
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up backup system
- [ ] Configure logging

---

## 🔧 Troubleshooting

### MongoDB Connection Failed

**Problem:** Cannot connect to MongoDB

**Solutions:**
```bash
# Check if MongoDB is running
mongosh

# Start MongoDB (Windows)
net start MongoDB

# Start MongoDB (macOS/Linux)
sudo systemctl start mongod

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

### Port Already in Use

**Problem:** Port 3000 or 5173 already in use

**Solution:**
```bash
# Find process using port
lsof -i :3000
# or
netstat -ano | findstr :3000

# Kill process
kill -9 <PID>

# Or change PORT in backend/.env
PORT=3001
```

### Module Not Found

**Problem:** Cannot find module errors

**Solution:**
```bash
# Clear and reinstall (frontend)
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clear and reinstall (backend)
cd ../backend
rm -rf node_modules package-lock.json
npm install
```

### Database Seed Failed

**Problem:** create-test-users.mjs fails

**Solution:**
```bash
# Check MongoDB connection
mongosh mongodb://localhost:27017/incentive-system

# Verify backend/.env has correct MONGODB_URI
cat backend/.env | grep MONGODB_URI

# Run seed script with verbose logging
cd database
npm install
npm run seed
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication

**Login**
```typescript
POST /api/auth/login
Body: { email: string, password: string }
Response: { success: boolean, user: User }
```

**Logout**
```typescript
POST /api/auth/logout
Response: { success: boolean }
```

**Get Current User**
```typescript
GET /api/auth/me
Response: User | null
```

### Users

**Get All Users**
```typescript
GET /api/users
Response: User[]
```

**Create User**
```typescript
POST /api/users
Body: {
  name: string,
  email: string,
  password: string,
  role: "admin" | "hod" | "initiator" | "user",
  employeeType: "permanent" | "freelancer_india" | "freelancer_usa"
}
```

### Policies

**Get All Policies**
```typescript
GET /api/policies
Response: Policy[]
```

**Create Policy**
```typescript
POST /api/policies
Body: {
  name: string,
  amount: number,
  eligibleFor: string[],
  isActive: boolean
}
```

### Credit Requests

**Submit Request**
```typescript
POST /api/credit-requests
Body: {
  employeeId: string,
  policyId?: string,
  amount?: number,
  reason: string
}
```

**HOD Approve**
```typescript
POST /api/credit-requests/approve
Body: { requestId: string }
```

### Redemptions

**Create Redemption**
```typescript
POST /api/redemption
Body: {
  amount: number,
  bankDetails: {
    accountNumber: string,
    ifsc: string,
    accountHolder: string
  }
}
```

**Process Payment**
```typescript
POST /api/redemption/process
Body: {
  redemptionId: string,
  transactionId: string
}
```

---

## 🚀 Deployment

### Deploy to Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create incentive-system

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Open app
heroku open
```

### Deploy to Vercel (Frontend)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

### Deploy to Railway (Backend)

1. Go to https://railway.app
2. Connect GitHub repository
3. Select backend folder
4. Add MongoDB plugin
5. Set environment variables
6. Deploy

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t incentive-system .
docker run -p 3000:3000 incentive-system
```

---

## 📞 Support & Maintenance

### Common Tasks

**Add New Admin:**
```bash
mongosh incentive-system
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin" } }
)
```

**Reset User Password:**
```bash
# In backend directory
node -e "
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('newpassword123', 10));
"
# Copy hash and update in MongoDB
```

**Backup Database:**
```bash
mongodump --db incentive-system --out ./backup
```

**Restore Database:**
```bash
mongorestore --db incentive-system ./backup/incentive-system
```

---

## 📄 License

MIT License - Free to use and modify for your needs.

---

## 🎯 Quick Start Checklist

- [ ] Install Node.js v18+
- [ ] Install MongoDB v5.0+
- [ ] Clone/extract project
- [ ] Run `npm install` in frontend and backend
- [ ] Create `backend/.env` with MongoDB URI and JWT secret
- [ ] Create `frontend/.env` with VITE_ variables
- [ ] Run `cd database && npm run seed`
- [ ] Start backend: `cd backend && npm run dev`
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Open http://localhost:5173
- [ ] Login with admin: suraj@wytlabs.com / password123
- [ ] Change admin password immediately!
- [ ] Create policies and test workflows

---

## 🏆 Features Checklist

### Implemented ✅
- [x] User authentication (JWT)
- [x] Role-based access control
- [x] User management (CRUD)
- [x] Employee management
- [x] Policy management
- [x] Credit request submission
- [x] HOD approval workflow
- [x] Wallet system
- [x] Redemption requests
- [x] Payment processing
- [x] GHL document signing
- [x] Modern gradient UI
- [x] Dashboard with stats
- [x] Audit logs
- [x] MongoDB integration

### Pending 🔄
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Advanced reporting
- [ ] Data export (Excel/PDF)
- [ ] Mobile responsive optimization
- [ ] Dark/light theme toggle
- [ ] Multi-language support
- [ ] Advanced search/filters
- [ ] Bulk operations
- [ ] API rate limiting

---

**Built with:** React 19, Node.js, Express (REST), MongoDB, Tailwind CSS, shadcn/ui

**Version:** 1.0.0  
**Last Updated:** January 2026
