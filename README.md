Markdown
# 🎓 University Classroom & Attendance Management Portal

A modern, fast, and responsive web application built for university instructors to track real-time classroom attendance, manage student rosters, monitor session analytics, and instantly export reports via WhatsApp, CSV, or printable PDF documents.

---

## ✨ Features

- 📋 **Real-Time Attendance Tracking:** Quickly mark students as **Present (P)**, **Absent (A)**, or **Late (L)** with automatic percentage & tally updates.
- 📚 **Multi-Course Manager:** Save custom course titles (e.g., *Web Technologies*, *Database Security*, *Computer Networks*) and switch between active sessions with one click.
- ⚡ **Quick Actions:** One-click **"Mark All Present"** for fast daily marking.
- 📱 **Instant WhatsApp Sharing:** Formats and opens an attendance summary directly in WhatsApp Web or the app to send to class groups.
- 📄 **Export & Print Ready:** Download student reports as **CSV** spreadsheets or print clean **PDF** attendance logs formatted for A4 paper.
- 🔍 **Live Roster Filtering:** Filter students instantly by roll number or name.
- 💾 **Persistent Browser Storage:** Automatically saves student rosters, instructor details, and date-wise attendance records locally in the browser.

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Deployment:** Vercel

---

## 🚀 How to Run Locally

### 1. Install Dependencies
Open your project folder in the terminal (`PowerShell` or `CMD`) and run:

```bash
npm install
2. Start Development Server
Run the local dev server:

Bash
npm run dev
Open your browser and navigate to the local link shown in terminal (usually http://localhost:5173).

📦 Direct Deployment to Vercel
Deploy your app directly from your computer terminal without using Git:

Bash
# First time setup or preview build
npx vercel

# Publish directly to production
npx vercel --prod
📁 Project Structure
Plaintext
classroom/
├── public/
│   └── logo.png              # University / Department Logo
├── src/
│   ├── components/
│   │   ├── Header.jsx        # Top Bar & Department Branding
│   │   ├── ClassStats.jsx    # Analytics KPI Cards & Course Manager
│   │   ├── ActionToolbar.jsx # Search Bar & Export Tools
│   │   ├── StudentTable.jsx  # Student Roster & Attendance Switcher
│   │   ├── SettingsModal.jsx # Instructor & Class Setup
│   │   └── AddStudentModal.jsx
│   ├── utils/
│   │   ├── exportHelpers.js  # WhatsApp, CSV, & Print Handlers
│   │   └── storage.js        # LocalStorage Utility Functions
│   ├── App.jsx               # Main Application Architecture
│   ├── index.css             # Tailwind Styles & Print Layouts
│   └── main.jsx
├── vercel.json               # Vercel Router Rewrites
└── package.json
📄 License
This project is created for educational and classroom administrative utility.