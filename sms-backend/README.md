# 📚 School Management System (SMS) - Backend

A Node.js-based backend API for managing a school system, including Classes, Subjects, Teachers, Students, and Parents. Built with Express.js and MongoDB.

## 🚀 Features

- ✅ CRUD operations for:
  - Classes
  - Subjects
  - Teachers
  - Students
  - Parents
- ✅ Role-based access control (Admin, Teacher, Student, Parent)
- ✅ JWT Authentication
- ✅ API Filtering, Pagination, Sorting
- ✅ Error handling and request limiting
- ✅ Data sanitization (XSS, NoSQL injection)
- ✅ Clean folder structure

---

## 🛠️ Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB** + **Mongoose**
- **JWT** for authentication
- **dotenv**, **helmet**, **xss-clean**, **express-rate-limit**, **mongoose**

---

## 📁 Folder Structure

├── controllers/
├── models/
├── routes/
├── utils/
├── app.js
├── server.js
├── config.env
├── package.json

yaml
Copy
Edit

---

## 🧪 API Endpoints

Base URL: `http://localhost:8000/api/v1/`

| Method | Endpoint               | Description               |
|--------|------------------------|---------------------------|
| GET    | /classes               | Get all classes           |
| POST   | /classes               | Create a new class        |
| GET    | /classes/:id           | Get single class          |
| PUT    | /classes/:id           | Update a class            |
| DELETE | /classes/:id           | Delete a class            |
| GET    | /subjects              | Get all subjects          |
| POST   | /subjects              | Create a subject          |
| ...    | ...                    | ...                       |

---

## ⚙️ Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/school-management.git
cd school-management
