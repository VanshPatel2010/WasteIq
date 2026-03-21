"use client";

import { openDB } from "idb";

const DB_NAME = "wasteiq-offline";
const DB_VERSION = 1;
const REPORT_STORE = "waste-worker-reports";

export type OfflineWasteWorkerReport = {
  local_id: string;
  zone_id: number;
  fill_level: number;
  bin_count_checked?: number;
  overflow_detected: boolean;
  bins_accessible: boolean;
  unusual_waste_detected: boolean;
  notes?: string;
  photo_base64?: string;
  lat?: number;
  lng?: number;
  reported_at: string;
  synced: boolean;
  server_report_id?: number;
};

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(REPORT_STORE)) {
        db.createObjectStore(REPORT_STORE, { keyPath: "local_id" });
      }
    },
  });
}

export async function saveOfflineWasteWorkerReport(report: OfflineWasteWorkerReport) {
  const db = await getDb();
  await db.put(REPORT_STORE, report);
}

export async function getOfflineWasteWorkerReports() {
  const db = await getDb();
  return db.getAll(REPORT_STORE) as Promise<OfflineWasteWorkerReport[]>;
}

export async function getPendingWasteWorkerReports() {
  const reports = await getOfflineWasteWorkerReports();
  return reports
    .filter((report) => !report.synced)
    .sort((a, b) => new Date(a.reported_at).getTime() - new Date(b.reported_at).getTime());
}

export async function markWasteWorkerReportSynced(localId: string, serverReportId: number) {
  const db = await getDb();
  const existing = await db.get(REPORT_STORE, localId);
  if (!existing) return;
  await db.put(REPORT_STORE, { ...existing, synced: true, server_report_id: serverReportId });
}

export async function getPendingWasteWorkerReportCount() {
  const reports = await getPendingWasteWorkerReports();
  return reports.length;
}
