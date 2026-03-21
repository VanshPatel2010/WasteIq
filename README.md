# Team Vertex - WasteIQ Fullstack Application

Welcome to the Team Vertex project! This application consists of a **Next.js** frontend and a **Python (FastAPI)** backend, supported by **PostgreSQL** and **Redis** for database and background task queuing (Celery).

Follow the instructions below to get the entire application up and running locally on your machine.

---

## 🛠 Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **Python** (v3.9 or higher recommended)
- **Git**
- **Docker & Docker Compose** (Highly recommended for database and Redis setup)

> **⚠️ Note for Windows Users (Backend C++ Build Tools):**  
> The backend uses data science libraries like `scikit-learn` and `prophet` which may require C++ compilers to build properly on Windows. If you encounter errors during the backend `pip install` step, you may need to install the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (make sure to check "Desktop development with C++" during installation) or simply use an updated Python version that supports pre-built wheels for these packages.

---

## 🚀 Option 1: Quick Start with Docker (Recommended)

The easiest way to run the entire stack (Database, Redis, Backend, and Frontend) is utilizing Docker Compose.

1. **Open a terminal** and navigate to the project root folder (`Team-Vertex`).
2. **Build and start the containers:**
   ```bash
   docker-compose up --build
   ```
   *(To run in detached mode, you can use `docker-compose up -d --build`)*

3. **Access the application:**
   - **Frontend UI:** `http://localhost:3000`
   - **Backend API:** `http://localhost:8000`
   - **API Documentation (Swagger):** `http://localhost:8000/docs`

---

## 💻 Option 2: Local Development Setup (Manual)

If you prefer to run the components directly on your host machine for development or debugging, follow these steps.

### Step 1: Start Infrastructure (Postgres & Redis)
You must have a database and Redis running. The easiest way is to use docker-compose to start just those services:
```bash
docker-compose up -d postgres redis
```
*(Alternatively, you can install PostgreSQL and Redis locally on your machine and ensure they match the default ports 5432 and 6379, respectively).*

### Step 2: Backend Setup (FastAPI & Celery)

The backend is built with Python. We'll set it up inside an isolated **Virtual Environment** to prevent dependency conflicts with other python projects on your machine.

1. **Open a terminal** and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   - On **Windows**:
     ```powershell
     .\venv\Scripts\activate
     ```
   - On **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```
   *(Your terminal prompt should now be prefixed with `(venv)` indicating it is active).*

4. **Install backend dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the backend development server:**
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *The backend API will now be accessible at `http://localhost:8000`.*

6. **(Optional) Run Celery Worker for Background Tasks:**
   In a *new terminal*, activate the backend virtual environment again and run:
   - On **Windows** (requires solo pool):
     ```bash
     celery -A celery_app.celery_app worker -l info --pool=solo
     ```
   - On **macOS/Linux**:
     ```bash
     celery -A celery_app.celery_app worker -l info
     ```

### Step 3: Frontend Setup (Next.js)

The frontend is a modern web application designed with an intuitive interface. It connects to the backend at `http://localhost:8001`.

1. **Open a new, separate terminal** and navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. **Install all frontend dependencies:**
   ```bash
   npm install
   ```
   *(If you encounter peer dependency errors involving React 18/19, you can alternatively run `npm install --legacy-peer-deps`)*

3. **Start the frontend development server:**
   ```bash
   npm run dev
   ```
   *The frontend will be accessible at `http://localhost:3000`.*

---

## 💡 Quick Tips

- **Keep multiple terminals open:** For local manual development, you will need terminal windows for: Web Backend (`uvicorn`), Celery Worker (`celery`), and the Frontend (`npm`).
- **Deactivating the Backend:** When you're done working, simply type `deactivate` in your Python environment terminal.

Happy Coding! 🎉
