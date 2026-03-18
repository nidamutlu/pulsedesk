# PulseDesk

![Java](https://img.shields.io/badge/backend-Java%2021-blue)
![Spring Boot](https://img.shields.io/badge/framework-Spring%20Boot-green)
![React](https://img.shields.io/badge/frontend-React-blue)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)

PulseDesk is a full-stack ticket management system I built to simulate how real-world support teams manage and track technical issues.

The project focuses on clean backend architecture, scalable API design, and practical features like bulk operations and CSV export.

---

## Project Scope

This project was developed as part of a structured engineering training focused on building a production-like system within a limited scope.

The implementation emphasizes:

- layered architecture (Controller → Service → Repository)
- REST API design with validation and consistent error handling
- role-based access control (RBAC)
- testable and maintainable code
- realistic ticket workflow and lifecycle

The scope intentionally avoids unnecessary complexity and focuses on core engineering practices.

---

## Tech Stack

**Backend**  
Java 21 · Spring Boot · Spring Security · JPA · PostgreSQL  

**Frontend**  
React · TypeScript · Vite · TailwindCSS  

**Testing**  
JUnit · Vitest · Testing Library  

---

## Architecture


Client (React) → REST API → Service Layer → Repository → PostgreSQL


This layered structure ensures separation of concerns, scalability, and testability.

---

## Core Features

- Ticket management (create, assign, update, track)
- Status transitions with audit logging
- Comment system with notifications
- Dashboard with aggregated metrics

---

## Mini Sprint Features

- **Saved Views** → persist and reuse filters  
- **CSV Export** → export filtered ticket lists  
- **Bulk Actions** → update multiple tickets at once  


POST /tickets/bulk/assign
POST /tickets/bulk/transition
GET /tickets/export.csv
GET /saved-views


Bulk operations follow a per-item result strategy, allowing partial success.

---

## Testing


./mvnw test
npx vitest run


Includes backend service validation and frontend UI behavior tests.

---
