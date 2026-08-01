# Mess Manager Pro


## Technology Stack

Use only these technologies:

* Next.js 15 (App Router)
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Supabase Authentication
* Supabase PostgreSQL Database
* Supabase Storage
* Supabase Row Level Security (RLS)
* Google Gemini API
* Recharts
* pdf-lib or jsPDF
* Deployable on Vercel

Follow modern best practices.

---

## User Roles

There are only two roles:

### Student

### Admin (Mess Manager)

Use Role-Based Access Control (RBAC).

---

# Authentication

Implement:

* Student Signup
* Student Login
* Admin Login
* Forgot Password
* Email Verification
* Secure Session Management
* Protected Routes

---

# Student Features

Student Dashboard showing:

* Today's booked meal
* Meal timings
* Booking status
* Upcoming bookings
* Booking history
* Notifications

Students should be able to:

* Book Breakfast
* Book Lunch
* Book Dinner

Each slot should display:

* Capacity
* Booked Seats
* Remaining Seats
* Start Time
* End Time

Prevent:

* Duplicate booking
* Booking after cutoff
* Overbooking

---

# Face Scan / QR Check-in

After arriving at the mess,

Student checks in using Face Recognition or QR code.

After successful verification,

Generate a digital meal token.

Store:

* Check-in time
* Date
* Meal
* Student ID

Students who did not check in cannot submit reviews.

---

# Food Rating

Allow students to rate every attended meal.

Rating categories:

* Overall
* Taste
* Hygiene
* Quantity
* Temperature

5-star system.

Show average ratings.

---

# Food Reviews

Students can:

* Write review
* Select emoji
* Upload image
* Submit anonymously

Only one review per meal.

Admin can reply to reviews.

---

# Food Voting

Admin creates weekly menu polls.

Students vote once.

Example:

Monday Lunch

Paneer Butter Masala

Rajma Chawal

Chole Bhature

Mix Veg

Display live voting results.

---

# Gemini AI

Integrate Google Gemini.

Admin can ask:

Generate weekly hostel menu.

Generate healthy menu.

Generate festival menu.

Summarize student reviews.

Find common complaints.

Recommend menu improvements.

Suggest meals under a fixed budget.

Store AI-generated meal plans.

---

# PDF Reports

Generate downloadable PDFs for:

Daily Attendance

Meal Consumption

Food Ratings

Reviews Summary

Voting Results

Weekly Menu

Monthly Analytics

Include charts, tables, university logo, and timestamps.

---

# Admin Dashboard

Display:

Today's Attendance

Today's Bookings

Live Slot Status

Food Ratings

Review Analytics

Voting Analytics

Popular Meals

AI Insights

Recent Reviews

Recent Bookings

Generate PDF Reports

---

# Database

Design a normalized PostgreSQL database.

Create all required tables with relationships, indexes, and constraints.

Generate SQL migrations automatically.

---

# Row Level Security

Implement complete Supabase RLS.

Students:

Only access their own profile.

Only access their own bookings.

Only review meals they attended.

Only vote once.

Admins:

Full access.

No public access to private tables.

---

# UI Design

Premium dashboard.

Glassmorphism.

Modern cards.

Dark Mode.

Light Mode.

Professional typography.

Responsive on desktop, tablet, and mobile.

Smooth animations using Framer Motion.

Use loading skeletons and toast notifications.

---

# Code Quality

Generate:

* Complete folder structure
* Components
* Pages
* APIs
* SQL schema
* RLS policies
* Authentication
* Seed data
* Error handling
* Validation
* TypeScript types
* Clean reusable code



git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
