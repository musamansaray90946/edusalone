<h1 align="center">
  <img src="https://github.com/user-attachments/assets/30bd2af8-bd63-44f1-b5d2-51c84b4ecb2c" alt="PalmTech Logo" width="120"/>
  <br/>
  EduSalone
</h1>

<h4 align="center">The Premier School Management SaaS Platform for Sierra Leone</h4>

<p align="center">
  <a href="https://edusalone.vercel.app"><b>View Live Web App</b></a> •
  <a href="#features"><b>Features</b></a> •
  <a href="#architecture"><b>Architecture</b></a>
</p>

---

## 📖 Overview
**EduSalone** is a production-ready, multi-tenant Software as a Service (SaaS) built to completely digitize school administration across West Africa. Designed specifically for the WASSCE/BECE curriculum, it eliminates paper records by providing automated grading, PDF report card generation, offline-tolerant data entry, and digital fee ledgers.

## 📸 System Previews

| Super Admin Dashboard | Teacher Portal |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/5b24206b-865a-4ebb-b3de-55df6035eee0" width="400"/> | <img src="https://github.com/user-attachments/assets/af58834a-9ea1-4558-9aef-2c06ef0b86b0" width="400"/> |
| **Manage Multiple Schools & Subscriptions** | **Enter Grades & Affective Traits** |

| Financial Ledger | PDF Report Card |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/6cddd6ac-0b33-4d09-8b50-56cff3c24c5c" width="400"/> | <img src="https://github.com/user-attachments/assets/33612a5d-b838-4ebf-a185-e908aa7b65b9" width="400"/> |
| **Track SLL Payments & Balances** | **Auto-Calculated WASSCE Standard PDF** |
---
## ✨ Core Features by Role

### 🏛️ Super Admin (PalmTech CEO)
* **SaaS Subscription Engine:** Manage all client schools. If a school's trial expires, the system automatically locks their access via middleware.
* **School Code Generation:** Autogenerates secure codes (e.g., `STE-2026`) that Principals use to invite staff and students.

### 🏫 Principal (School Admin)
* **Secure Isolation:** Can only view data, staff, and students mapped to their specific `school_id`.
* **Finance Ledger:** Logs partial and full fee payments in Sierra Leonean Leones (SLL), calculates outstanding balances, and generates A4 PDF receipts.
* **Attendance Generation:** Prints a full 31-day monthly class register based on daily teacher roll calls.

### 👨‍🏫 Teacher
* **Smart Grading Spreadsheet:** A horizontal, mobile-friendly spreadsheet that blocks mathematical errors (scores over 100).
* **Automated Logic:** Calculates Term Totals, Yearly Means, and injects official WASSCE letter grades (A1 - F9) instantly.
* **End of Term Evaluations:** Teachers input Affective Traits and Psychomotor Skills (1-5 scale) directly into the database.

### 🎓 Parent & Student
* **Account Linking:** Parents securely link to their child's records using their Admission Number.
* **Instant PDF Downloads:** View and download official A4 Report Cards that pull live data from the database.

---

## 🏗️ System Architecture & Security

This platform is built with a modern, scalable tech stack, ensuring 99.9% uptime and strict data privacy.

* **Frontend:** React Native (Expo) - Compiled for both Web (Vercel) and Android (EAS APK/AAB).
* **Backend:** Supabase / PostgreSQL.
* **Security:** 
  * **Row Level Security (RLS):** Database-level security ensuring strict Multi-Tenant isolation. School A can never query School B's data.
  * **Role-Based Access Control (RBAC):** UI routing strictly verified against database roles (Admin vs. Teacher vs. Parent).
* **Offline Tolerance:** Integrates `AsyncStorage` to cache student data. If internet connectivity drops, the app falls back to local memory and gracefully alerts the user, preventing system crashes.
* **PDF Engine:** Custom HTML-to-PDF conversion via `expo-print`, fully styled for A4 document standards.

---

## 💻 Local Development Setup

To run this project locally on your machine:

**1. Clone the repository**
```bash
git clone https://github.com/musamansaray90946/edusalone.git
cd edusalone
