# Multi-College Admission Process Automation Portal

A full-stack **Vite + React** (`client/`) and **Express + Prisma + SQLite** (`server/`) admission management system with strict single-college tenant isolation, document scrutiny, deterministic merit ranking, category-wise seat allocation, fee payments, and QR-verified enrollment letters.

## Live Deployment & Repository
- **Live App (Render):** https://devansh-fsd.onrender.com
- **Sign-In URL:** https://devansh-fsd.onrender.com/sign-in
- **Register New College:** https://devansh-fsd.onrender.com/register-college
- **GitHub Repository:** https://github.com/devanshd07o/DEVANSH_FSD (`GROUP PROJECT/`)

---

## Demo Login Credentials

> On `/sign-in`, select the **College** from the dropdown and choose the matching tab (**Student**, **Staff**, or **College**). Cross-college logins are blocked (`403 Forbidden`).

### 1. ABES Engineering College (`AIET-2026`)
| Portal Tab | Role | Name | Email | Password |
|---|---|---|---|---|
| **College** | Super Admin / Admissions Officer | Dr. Vikramaditya Sen | `admin@institution.edu.in` | `Admin@12345` |
| **Staff** | Faculty Scrutiny Reviewer | Prof. Rajesh Kulkarni | `faculty.review@institution.edu.in` | `Faculty@12345` |
| **Staff** | Accounts & Finance | Sunita Deshmukh | `accounts@institution.edu.in` | `Accounts@12345` |
| **Staff** | Academic Registrar | Col. Sanjeev Nair | `registrar@institution.edu.in` | `Registrar@12345` |
| **Student** | Applicant (`VERIFIED`) | Aarav Sharma | `student.aarav@gmail.com` | `Student@12345` |
| **Student** | Applicant (`CORRECTION_REQUIRED`) | Priya Patel | `student.priya@gmail.com` | `Student@12345` |
| **Student** | Applicant (`DRAFT`) | Rohan Verma | `student.rohan@gmail.com` | `Student@12345` |

### 2. KIET Group of Institutions (`KIET-029`)
| Portal Tab | Role | Name | Email | Password |
|---|---|---|---|---|
| **College** | College Admin (All Admin/Staff Roles) | Dr. Manoj Goel | `admin@kiet.edu.in` | `College@12345` |
| **Staff** | Faculty Scrutiny Reviewer | Prof. Ankit Verma | `staff@kiet.edu.in` | `Staff@12345` |
| **Student** | Applicant (`SUBMITTED`) | Kabir Malhotra | `student@kiet.edu.in` | `Student@12345` |

### 3. GL Bajaj Institute of Technology (`GLB-192`)
| Portal Tab | Role | Name | Email | Password |
|---|---|---|---|---|
| **College** | College Admin (All Admin/Staff Roles) | Dr. Rajeev Agrawal | `admin@glbajaj.edu.in` | `College@12345` |
| **Staff** | Faculty Scrutiny Reviewer | Prof. Neha Gupta | `staff@glbajaj.edu.in` | `Staff@12345` |
| **Student** | Applicant (`SUBMITTED`) | Ananya Mishra | `student@glbajaj.edu.in` | `Student@12345` |

---

## Self-Registration Flows
- **Student Registration (`/register`):** Register under any participating college.
- **Staff Registration (`/register-staff`):** Register as Reviewer, Accounts, or Registrar under a college.
- **College Onboarding (`/register-college`):** Onboard a brand-new college with automatic setup of academic year, courses, seat pools, admission round, and college admin login.

## Tech Stack & Run Locally
- **Frontend:** React 19, Vite 6, React Router DOM, Tailwind CSS (`client/`)
- **Backend:** Node.js, Express, Prisma ORM + LibSQL/SQLite, Jose JWT HTTP-only cookies, Multer, QRCode (`server/`)
- **Commands:**
  ```bash
  npm --prefix client install && npm --prefix server install
  npm test        # Runs 16 domain & concurrency tests
  npm run build   # Builds frontend & generates Prisma client
  npm start       # Serves built app & API on http://localhost:3000
  ```
