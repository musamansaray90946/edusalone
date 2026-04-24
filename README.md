# 🎓 EduSalone — Educational SaaS Platform
**The Premier School Management System built for Sierra Leone.**

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

🌍 **Live Web App:** [https://edusalone.vercel.app](https://edusalone.vercel.app)

##  Overview
EduSalone is a production-ready, multi-tenant Software as a Service (SaaS) designed to digitize school administration across West Africa. It features strict Role-Based Access Control (RBAC), offline tolerance, and complex mathematical auto-grading specifically tailored for the WASSCE/BECE curriculum.

## ✨ Core Features
*   **Multi-Tenant Architecture:** Single backend supporting unlimited schools with Row Level Security (RLS) data isolation.
*   **Role-Based Portals:** Dedicated, secure dashboards for Super Admins, Principals, Teachers, Students, and Parents.
*   **Automated PDF Report Cards:** Generates complex, 25-column A4 printable PDF report cards directly on-device.
*   **Mathematical Grading Engine:** Auto-calculates term totals, yearly means, and official letter grades (A1 - F9).
*   **Financial Ledger:** Tracks SLL (Sierra Leonean Leones) fee payments, partial balances, and generates PDF receipts.
*   **Offline-Tolerant:** Utilizes `AsyncStorage` to cache student data gracefully when internet connectivity drops.

## 🛠️ Tech Stack
*   **Frontend:** React Native (Expo) - Cross-platform Mobile (iOS/Android) and Web.
*   **Backend / Database:** Supabase (PostgreSQL).
*   **PDF Generation:** `expo-print` & `expo-sharing`.
*   **Hosting:** Vercel (Web Dashboard) & EAS (Android APK/AAB).

---
*Architected and developed by[Musa Mansaray](https://github.com/musamansaray90946) | PalmTech Group Ltd.*
