# WasteIQ — Build Task List

## Phase 1: Project Setup & Backend Foundation
- [ ] Initialize Next.js 14 frontend with TypeScript + Tailwind + shadcn/ui
- [ ] Initialize FastAPI backend with project structure
- [ ] Create docker-compose.yml (PostgreSQL, Redis)
- [ ] Database models (SQLAlchemy) — all 15+ models
- [ ] Database migration & seed data (30-day history)

## Phase 2: Auth System
- [ ] FastAPI auth endpoints (login, register, JWT)
- [ ] NextAuth.js integration with 6 roles
- [ ] Role-based route protection (middleware)

## Phase 3: Core Backend Services
- [ ] Waste worker report API + real-time override logic
- [ ] Surge predictor service (Prophet + XGBoost)
- [ ] Accuracy evaluator + drift detector
- [ ] Correction engine
- [ ] Route optimizer (OR-Tools VRP with blended fill levels)
- [ ] Matching engine (surplus exchange)
- [ ] Sustainability scorer
- [ ] All remaining API endpoints (zones, trucks, pickups, etc.)

## Phase 4: Celery Background Tasks
- [ ] Nightly accuracy evaluation task
- [ ] Drift detection + auto-correction task
- [ ] Periodic prediction runs
- [ ] Sync handler for offline data

## Phase 5: Admin Dashboard (Desktop-first)
- [ ] Sidebar layout + navigation
- [ ] Dashboard home (5 metric cards + map + alerts)
- [ ] Zone map with data source badges
- [ ] Fleet tracker
- [ ] Surge alerts page
- [ ] Model Health screen (prediction accuracy)
- [ ] Waste Worker Management screen
- [ ] Organisations + Reports + Settings

## Phase 6: Waste Worker PWA (Mobile-first)
- [ ] Worker home screen with assigned zones
- [ ] Submit fill level report (slider + checks)
- [ ] Worker report history
- [ ] Offline IndexedDB storage + sync

## Phase 7: Driver PWA (Mobile-first)
- [ ] Route view for the day
- [ ] Mark pickups as completed
- [ ] Flag zone issues
- [ ] Offline support

## Phase 8: Kabadiwalla PWA (Mobile-first)
- [ ] Three-tap logging interface
- [ ] Pickup history + earnings log
- [ ] Offline support

## Phase 9: Surplus Exchange
- [ ] Surplus Generator screens (list, matches, confirm)
- [ ] Surplus Receiver screens (alerts, accept/decline)

## Phase 10: Cross-Cutting Concerns
- [ ] PWA manifest + service worker + next-pwa
- [ ] Offline sync layer (IndexedDB → API)
- [ ] Notification system
- [ ] Color system + data source badges
