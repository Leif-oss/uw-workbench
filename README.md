# Underwriter Workbench

A comprehensive web application for insurance underwriting management, featuring CRM, document processing, AI-powered analysis, and production tracking.

## 🔒 Security First

**IMPORTANT:** This application handles sensitive data. Follow these security guidelines:

### Required Environment Variables

1. **Copy the example files:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. **Fill in your actual values in `backend/.env`:**
   - `AI_API_KEY`: Your OpenAI API key (get from https://platform.openai.com/api-keys)
   - `ADMIN_PASSWORD`: Strong password for admin access (minimum 12 characters recommended)
   - `DATABASE_URL`: Database connection string (SQLite for dev, PostgreSQL/MySQL for production)

3. **Never commit `.env` files to Git!**
   - The `.gitignore` file is configured to prevent this
   - If you accidentally commit secrets, rotate them immediately

### Security Checklist

- [ ] Changed `ADMIN_PASSWORD` from default
- [ ] Added `AI_API_KEY` to `backend/.env`
- [ ] Verified `.env` files are not tracked by Git
- [ ] Database files are not committed to Git
- [ ] Using HTTPS in production (not HTTP)
- [ ] CORS origins configured for production domains only

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **npm or yarn**
- **OpenAI API key** (for AI features)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Mac/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys and passwords
   ```

5. **Run the server:**
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

   The API will be available at: http://127.0.0.1:8000
   API docs (Swagger): http://127.0.0.1:8000/docs

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env if needed (default points to local backend)
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   The app will be available at: http://localhost:5173

---

## 📁 Project Structure

```
uw-workbench/
├── backend/                 # FastAPI backend
│   ├── routers/            # API endpoints
│   │   ├── agencies.py     # Agency management
│   │   ├── contacts.py     # Contact management
│   │   ├── document_scrubber.py  # Document AI processing
│   │   ├── ai_router.py    # AI chat assistant
│   │   └── admin.py        # Admin operations
│   ├── models.py           # Database models
│   ├── schemas.py          # Pydantic schemas
│   ├── database.py         # Database configuration
│   ├── ai_client.py        # OpenAI integration
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── layout/        # Layout components
│   │   └── api/           # API client
│   └── package.json       # Node dependencies
│
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

---

## 🎯 Features

### 1. **CRM System**
- Agency management with production tracking
- Contact management with interaction logging
- Office and employee management
- Task tracking and follow-ups

### 2. **Document Scrubber**
- AI-powered document data extraction
- Support for PDF, DOCX, Excel, and text files
- Automatic field mapping for underwriting submissions
- Export to CSV, JSON, or TXT formats
- Manual data entry and verification

### 3. **AI Assistant**
- **Property Analysis**: Location-specific underwriting intelligence
- **Agency Research**: Find contacts and employees from agency websites
- **Ownership Research**: Determine common ownership between parties
- **Business Hazard Research**: Fire risk, chemicals, and hazard analysis
- ChatGPT integration with copy-paste workflow

### 4. **Reinsurance Calculator**
- Premium calculations
- Treaty analysis
- Risk assessment tools

### 5. **Production Tracking**
- Excel import for production data
- YTD and PYTD comparisons
- Agency performance metrics

---

## 🔧 Configuration

### Backend Configuration (`backend/.env`)

```env
# OpenAI API
AI_API_KEY=sk-your-key-here
AI_MODEL=gpt-4o

# Admin Access
ADMIN_PASSWORD=your-secure-password

# Database
DATABASE_URL=sqlite:///./workbench.db

# Optional
DEBUG=false
LOG_LEVEL=INFO
```

### Frontend Configuration (`frontend/.env`)

```env
VITE_API_URL=http://127.0.0.1:8000
```

### Production Configuration

For production deployment:

1. **Use PostgreSQL or MySQL instead of SQLite:**
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```

2. **Update CORS origins in `backend/main.py`:**
   ```python
   allow_origins=[
       "https://yourdomain.com",
       "https://app.yourdomain.com",
   ]
   ```

3. **Set frontend API URL:**
   ```env
   VITE_API_URL=https://api.yourdomain.com
   ```

4. **Use environment variables for all secrets**
5. **Enable HTTPS/TLS**
6. **Set up proper logging and monitoring**

---

## 📊 Database

### Development
- Uses SQLite by default (`workbench.db`)
- Automatically created on first run
- No additional setup required

### Production
- Recommended: PostgreSQL 14+ or MySQL 8+
- Set `DATABASE_URL` environment variable
- Run migrations if using Alembic

### Database Schema

Key tables:
- `offices`: Regional offices
- `employees`: Underwriters and staff
- `agencies`: Insurance agencies
- `contacts`: Agency contacts
- `logs`: Interaction history
- `tasks`: Follow-up tasks
- `production`: Monthly production data
- `submissions`: Document scrubber submissions

---

## 🧪 Testing

**Note:** Test suite is currently being developed. Contributions welcome!

To run tests (when available):
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

---

## 🛠️ Development

### Code Style

- **Backend**: Follow PEP 8, use type hints
- **Frontend**: TypeScript strict mode, ESLint rules
- **Formatting**: Use Black (Python) and Prettier (TypeScript)

### Git Workflow

1. Create feature branch from `workbench-features`
2. Make changes and commit with descriptive messages
3. Push to GitHub
4. Create pull request for review
5. Merge to `workbench-features` (not `main` directly)

### Adding New Features

1. **Backend API endpoint:**
   - Add route in `backend/routers/`
   - Update models in `models.py` if needed
   - Update schemas in `schemas.py`

2. **Frontend page:**
   - Create component in `frontend/src/pages/`
   - Add route in `App.tsx`
   - Add sidebar link in `Sidebar.tsx`

---

## 🐛 Troubleshooting

### Backend won't start
- Check if port 8000 is already in use
- Verify `backend/.env` exists with required variables
- Check Python version (3.11+ required)
- Activate virtual environment

### Frontend won't start
- Check if port 5173 is already in use
- Run `npm install` to ensure dependencies are installed
- Clear `node_modules` and reinstall if needed

### AI features not working
- Verify `AI_API_KEY` is set in `backend/.env`
- Check OpenAI API key is valid and has credits
- Review backend logs for API errors

### Database errors
- Delete `workbench.db` to reset (development only)
- Check `DATABASE_URL` format
- Ensure database server is running (if using PostgreSQL/MySQL)

---

## 📝 License

Proprietary - All rights reserved

---

## 👥 Contributing

This is a private project. For questions or issues, contact the development team.

---

## 🔗 Useful Links

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)

---

## ⚠️ Important Notes

1. **Never commit `.env` files** - They contain secrets
2. **Never commit database files** - They contain sensitive data
3. **Change default passwords** - Especially `ADMIN_PASSWORD`
4. **Use HTTPS in production** - Never HTTP for sensitive data
5. **Rotate API keys regularly** - Good security practice
6. **Back up your database** - Regularly in production
7. **Monitor API usage** - OpenAI API costs money

---

**Last Updated:** December 2024

