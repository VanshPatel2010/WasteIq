"use client";

import { api } from "@/lib/api";
import {
  getPendingWasteWorkerReportCount,
  getPendingWasteWorkerReports,
  markWasteWorkerReportSynced,
  OfflineWasteWorkerReport,
  saveOfflineWasteWorkerReport,
} from "@/lib/db/offline";

export async function queueWasteWorkerReport(
  report: Omit<OfflineWasteWorkerReport, "local_id" | "synced">
) {
  const offlineReport: OfflineWasteWorkerReport = {
    ...report,
    local_id: `${report.zone_id}-${Date.now()}`,
    synced: false,
  };
  await saveOfflineWasteWorkerReport(offlineReport);
  return offlineReport;
}

export async function syncPendingWasteWorkerReports() {
  const pendingReports = await getPendingWasteWorkerReports();
  let syncedCount = 0;
  let lastResponse: any = null;

  for (const report of pendingReports) {
    try {
      const response = await api.submitReport(report);
      await markWasteWorkerReportSynced(report.local_id, response.report_id);
      syncedCount += 1;
      lastResponse = response;
    } catch {
      break;
    }
  }

  return {
    syncedCount,
    pendingCount: await getPendingWasteWorkerReportCount(),
    lastResponse,
  };
}
