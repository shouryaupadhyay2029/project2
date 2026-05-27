"use strict";

const { createBackup } = require("./backupManager");

const DEFAULT_INTERVAL_HOURS = 24;
let timer = null;

function getIntervalMs(intervalHours = process.env.BACKUP_INTERVAL_HOURS) {
  const parsed = Number(intervalHours || DEFAULT_INTERVAL_HOURS);
  const hours =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_HOURS;
  return hours * 60 * 60 * 1000;
}

function startBackupScheduler(options = {}) {
  if (
    process.env.BACKUP_SCHEDULE_ENABLED !== "true" &&
    options.enabled !== true
  ) {
    return null;
  }

  if (timer) {
    return timer;
  }

  const intervalMs = getIntervalMs(options.intervalHours);
  timer = setInterval(async () => {
    try {
      const result = await createBackup(options.backupOptions || {});
      console.log(`[backup] Created backup at ${result.backupPath}`);
    } catch (error) {
      console.error(`[backup] ${error.message}`);
    }
  }, intervalMs);

  return timer;
}

function stopBackupScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

startBackupScheduler();

module.exports = {
  startBackupScheduler,
  stopBackupScheduler,
};
