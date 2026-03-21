const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") localStorage.setItem("wasteiq_token", token);
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") this.token = localStorage.getItem("wasteiq_token");
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") localStorage.removeItem("wasteiq_token");
  }

  private async request(path: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...((options.headers as Record<string, string>) || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401) { this.clearToken(); throw new Error("Unauthorized"); }
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "API Error"); }
    return res.json();
  }

  get(path: string) { return this.request(path); }
  post(path: string, body: any) { return this.request(path, { method: "POST", body: JSON.stringify(body) }); }
  put(path: string, body: any) { return this.request(path, { method: "PUT", body: JSON.stringify(body) }); }

  // Auth
  login(email: string, password: string) { return this.post("/api/auth/login", { email, password }); }
  register(data: any) { return this.post("/api/auth/register", data); }
  me() { return this.get("/api/auth/me"); }

  // Dashboard & Simulation
  dashboardStats() { return this.get("/api/dashboard/stats"); }
  setSimulationDate(iso_date: string | null) { return this.post("/api/simulation/set-date", { date_iso: iso_date }); }
  getSimulationStatus() { return this.get("/api/simulation/status"); }

  // Zones
  getZones() { return this.get("/api/zones/"); }
  getZone(id: number) { return this.get(`/api/zones/${id}`); }
  getZoneFillLog(id: number, days = 7) { return this.get(`/api/zones/${id}/fill-log?days=${days}`); }

  // Waste Worker
  submitReport(data: any) { return this.post("/api/waste-worker/reports", data); }
  getReports(params?: any) { const q = params ? "?" + new URLSearchParams(params).toString() : ""; return this.get(`/api/waste-worker/reports${q}`); }
  getMyZones() { return this.get("/api/waste-worker/my-zones"); }
  getWorkers() { return this.get("/api/workers"); }
  getMyRewards() { return this.get("/api/waste-worker/my-rewards"); }
  getLeaderboard() { return this.get("/api/waste-worker/leaderboard"); }

  // Trucks & Routes
  getTrucks() { return this.get("/api/trucks/"); }
  getRoutes(params?: any) { const q = params ? "?" + new URLSearchParams(params).toString() : ""; return this.get(`/api/routes/${q}`); }
  optimizeRoutes() { return this.post("/api/routes/optimize", {}); }

  // Pickups
  completePickup(data: any) { return this.post("/api/pickups/complete", data); }
  getPickups() { return this.get("/api/pickups/"); }

  // Predictions
  getPredictions(params?: any) { const q = params ? "?" + new URLSearchParams(params).toString() : ""; return this.get(`/api/predictions/${q}`); }
  getSurgeAlerts() { return this.get("/api/predictions/surge-alerts"); }

  // Accuracy
  getAccuracySummary() { return this.get("/api/accuracy/summary"); }
  getZoneAccuracy() { return this.get("/api/accuracy/zones"); }
  getZoneAccuracyHistory(zoneId: number) { return this.get(`/api/accuracy/zones/${zoneId}/history`); }
  getDriftAlerts() { return this.get("/api/accuracy/drift-alerts"); }
  runEvaluation() { return this.post("/api/accuracy/run-evaluation", {}); }

  // Surplus
  createListing(data: any) { return this.post("/api/surplus/listings", data); }
  getListings(status?: string) { return this.get(`/api/surplus/listings${status ? "?status=" + status : ""}`); }
  getMatches() { return this.get("/api/surplus/matches"); }
  updateMatch(id: number, action: string) { return this.put(`/api/surplus/matches/${id}`, { action }); }

  // Kabadiwalla
  logPickup(data: any) { return this.post("/api/kabadiwalla/logs", data); }
  syncLogs(logs: any[]) { return this.post("/api/kabadiwalla/sync", { logs }); }
  getKabadiwalaLogs() { return this.get("/api/kabadiwalla/logs"); }

  // Organisations
  getOrganisations() { return this.get("/api/organisations/"); }
  getOrganisation(id: number) { return this.get(`/api/organisations/${id}`); }
}

export const api = new ApiClient();
