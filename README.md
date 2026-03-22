# Team Vertex - WasteIQ 🌍♻️

Welcome to **WasteIQ** by Team Vertex! WasteIQ is a cutting-edge **Predictive Waste Intelligence Platform** designed to modernize municipal solid waste (MSW) management. By combining intelligent surge prediction, real-time fleet tracking, and a seamless surplus donation marketplace, WasteIQ transforms reactive garbage collection into a proactive, data-driven operation.

---

## 🎯 What problem does it solve?

Traditional waste management is highly inefficient, relying on static routes and schedules regardless of actual bin fill levels. This leads to:
1. **Overflowing bins** in high-traffic zones during events or holidays.
2. **Wasted fuel and emissions** from trucks visiting empty bins.
3. **Lack of accountability** and visibility into ground-level operations.
4. **Food and material waste** that could otherwise be donated or recycled.

**WasteIQ solves this by:**
- Using Machine Learning to predict waste surges *before* they happen.
- Dynamically optimizing truck routes daily based on predicted fill levels.
- Gamifying waste worker reporting using a Progressive Web App (PWA).
- Hosting an automated **Surplus Marketplace** connecting restaurants/organizations with excess materials to NGOs and recyclers in real-time.

---

## 💻 Tech Stack

WasteIQ is a fully modernized web application using industry-standard tools:

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Frontend integrations**: Leaflet (Mapping with CartoDB Voyager tiles), Recharts (Analytics), next-pwa (Progressive Web App support)
- **Backend & API**: Python 3.10+, FastAPI, Pydantic, SQLAlchemy
- **Machine Learning**: Scikit-Learn (RandomForestRegressor for surge prediction), Joblib
- **Database**: SQLite (Local Dev) / PostgreSQL (Production)
- **Background Tasks**: Celery & Redis
- **Architecture**: RESTful APIs, JWT Authentication

---

## 🗄️ Database Schema

The system uses a relational database model encompassing:
- **Users & Roles**: `User` (Admin, Driver, Waste Worker, Generator, Receiver, Kabadiwalla).
- **Entities**: `Organisation` (for NGOs/Businesses), `Zone` (Municipal wards), `Truck` (Fleet).
- **Operations**: `Route` (Optimized paths), `Pickup` (Execution logs), `WasteWorkerReport` (Ground-truth fill levels).
- **ML & Analytics**: `SurgePrediction` (Forecasted waste amounts), `ModelDriftLog` (Accuracy tracking).
- **Surplus Hub**: `SurplusListing` (Donated goods), `SurplusMatch` (Automated handshakes).

---

## 🌍 Webpages Overview

WasteIQ provides tailored interfaces depending on the user's role:

### Admin / City Planner Interface
- `/dashboard` — High-level metric overview and **Time Machine MVP** to simulate specific dates.
- `/dashboard/zones` — Detailed map viewing current and predicted fill levels per ward.
- `/dashboard/surge` — ML alerts highlighting zones predicted to overflow in the next 24-48 hours.
- `/dashboard/fleet` — Live dispatch center monitoring truck availability and route allocation.
- `/dashboard/workers` & `/dashboard/organisations` — Personnel and entity management.
- `/dashboard/model-health` — Evaluates ML prediction accuracy and detects concept drift.

### Mobile Interfaces (PWAs)
- `/waste-worker` — Interface for ground workers to report bin statuses and earn leaderboard rewards.
- `/driver` — Turn-by-turn dispatch list optimized for minimum travel distance.
- `/kabadiwalla` — Quick logging tool for informal scrap dealers to register cleared street pickups.

### Surplus Handshake Network
- `/surplus/generator` — Portal for restaurants/stores to post available surplus (food, plastics, metals).
- `/surplus/receiver` — Portal for NGOs/recyclers to view active surplus, accept donations, and filter by customized waste types.

---

## 🔌 Core API Routes

The backend operates via a RESTful architecture powered by FastAPI:

**Authentication**
- `POST /api/auth/login` — JWT token generation
- `POST /api/auth/register` — User signup
- `GET /api/auth/me` — Retrieve active profile

**Simulation & Core AI**
- `POST /api/simulation/set-date` — Fast-forwards ML models to a specific temporal date (Time Machine).
- `GET /api/predictions/surge-alerts` — Fetch high-risk zones.
- `GET /api/accuracy/summary` — Track Random Forest drift metrics.

**Operations & Routing**
- `GET /api/zones/` — Fetch municipal wards & fill logic.
- `POST /api/waste-worker/reports` — Ground truth submission.
- `POST /api/routes/optimize` — Triggers Traveling Salesperson Problem (TSP) optimization logic.
- `GET /api/trucks/` — Fleet status.

**Surplus Marketplace**
- `POST /api/surplus/listings` — Create a donation.
- `GET /api/surplus/listings?status=active` — Fetch available surplus.
- `PUT /api/surplus/matches/{id}` — Accept/Decline/Complete handshake states.

---

## 🚀 Getting Started (Local Development)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
*(Runs on `http://localhost:8000`)*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*(Runs on `http://localhost:3000`)*

*(Note: Redis and Celery can optionally be started to enable asynchronous background job tracking mapping, but the core development API will function cleanly through synchronous fallbacks if disabled).*
