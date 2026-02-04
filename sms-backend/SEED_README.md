# SMS Backend - Seed Data Guide

This guide explains how to populate your SMS database with test data using the various seeding scripts available.

## Available Seed Scripts

### 1. `seed:comprehensive` (Recommended)

**Command:** `npm run seed:comprehensive`

This is the most comprehensive seeding script that creates test data for ALL models in the system:

- **Users**: Super Admin, School Admin, Teachers (10), Parents (20), Students (100)
- **Core Models**: Teachers, Parents, Students, Classes, Grades, Subjects
- **Academic**: Lessons, Assignments, Results, Exams
- **Communication**: Events, Announcements
- **Security & Audit**: Audit Logs (50 entries), Security Events (20 entries)

**Test Accounts Created:**

- Super Admin: `superadmin` / `Password123!`
- School Admin: `schooladmin` / `Password123!`
- Teacher: `teacher1` / `Password123!`
- Parent: `parent1` / `Password123!`
- Student: `student1` / `Password123!`

### 2. `seed:all`

**Command:** `npm run seed:all`

Uses the original `seedData.js` script with comprehensive data for core models (Users, Teachers, Students, Classes, etc.) but without audit/security logs.

### 3. `seed:fresh`

**Command:** `npm run seed:fresh`

Drops the entire database and creates fresh data with a test teacher account. Good for clean slate testing.

### 4. `seed:teacher`

**Command:** `npm run seed:teacher`

Creates only a test teacher account for basic testing.

## How to Run Seed Scripts

1. **Make sure MongoDB is running** on your system
2. **Navigate to the backend directory:**

   ```bash
   cd sms-backend
   ```

3. **Install dependencies** (if not already done):

   ```bash
   npm install
   ```

4. **Run your preferred seed script:**

   ```bash
   # For comprehensive seeding (recommended)
   npm run seed:comprehensive

   # Or use other scripts as needed
   npm run seed:all
   npm run seed:fresh
   npm run seed:teacher
   ```

## What Gets Created

### Database Models Populated:

- ✅ Users (Admin, Teachers, Parents, Students)
- ✅ Teachers (with employee IDs, subjects, qualifications)
- ✅ Parents (with contact info, relationships)
- ✅ Students (with student IDs, emergency contacts, enrollment dates)
- ✅ Classes (Grade 1-5, A & B sections)
- ✅ Grades (Levels 1-5)
- ✅ Subjects (11 different subjects)
- ✅ Lessons (Teacher schedules, rooms, times)
- ✅ Assignments (Homework with due dates)
- ✅ Results (Exam scores and grades)
- ✅ Exams (Scheduled tests and quizzes)
- ✅ Events (School events and meetings)
- ✅ Announcements (School notices and updates)
- ✅ Audit Logs (User activity tracking)
- ✅ Security Events (Security monitoring)

### Sample Data Features:

- **Realistic Names**: Generated from common first/last name combinations
- **Proper Relationships**: Students linked to parents, classes linked to grades, etc.
- **Random Dates**: Birth dates, enrollment dates, exam dates within reasonable ranges
- **Contact Information**: Phone numbers, addresses, emergency contacts
- **Academic Data**: Grades, marks, subjects, assignments
- **Security Data**: Login attempts, IP addresses, user agents

## Testing Your Application

After seeding, you can:

1. **Login with test accounts** using the credentials above
2. **Test all features** of your SMS system
3. **Verify relationships** between different entities
4. **Check audit logs** for user activity tracking
5. **Monitor security events** for system security

## Troubleshooting

- **Connection Issues**: Make sure MongoDB is running and your `config.env` has correct database URL
- **Duplicate Data**: Use `seed:fresh` if you want to start with a clean database
- **Missing Dependencies**: Run `npm install` to ensure all packages are installed
- **Port Conflicts**: Make sure no other applications are using your database port

## Notes

- All passwords are set to `Password123!` for easy testing
- Email addresses follow the pattern: `role[number]@sms.com`
- Student IDs are formatted as `STU0001`, `STU0002`, etc.
- Teacher IDs are formatted as `TCH001`, `TCH002`, etc.
- The system creates realistic relationships between all entities
