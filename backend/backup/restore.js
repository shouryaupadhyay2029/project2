#!/usr/bin/env node
"use strict";

const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const { verifyBackupPath } = require("./backupManager");

const DEFAULT_BACKUP_DIR = path.resolve(__dirname, "..", "backups");

function createToolMissingError(toolName) {
  const error = new Error(
    `${toolName} is not installed or is not available on PATH. Install MongoDB Database Tools and try again.`,
  );
  error.code = `${toolName.toUpperCase()}_NOT_FOUND`;
  return error;
}

function runMongoRestore(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("mongorestore", args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        reject(createToolMissingError("mongorestore"));
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(
        `mongorestore exited with code ${code}: ${stderr || stdout}`,
      );
      error.code = "MONGORESTORE_FAILED";
      error.exitCode = code;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

async function restoreBackup(backupPath, options = {}) {
  if (process.env.RESTORE_CONFIRM !== "true") {
    const error = new Error(
      "Restore refused. Set RESTORE_CONFIRM=true to confirm this destructive operation.",
    );
    error.code = "RESTORE_NOT_CONFIRMED";
    throw error;
  }

  const mongoUri = options.mongoUri || process.env.MONGO_URI;
  if (!mongoUri) {
    const error = new Error("MONGO_URI is required to restore a backup.");
    error.code = "MONGO_URI_REQUIRED";
    throw error;
  }

  const backupDir =
    options.backupDir || process.env.BACKUP_DIR || DEFAULT_BACKUP_DIR;
  const safeBackupPath = verifyBackupPath(backupPath, backupDir);
  const stats = await fs.stat(safeBackupPath);

  if (!stats.isDirectory()) {
    const error = new Error(
      `Backup path must be a directory created by mongodump: ${safeBackupPath}`,
    );
    error.code = "BACKUP_PATH_INVALID";
    throw error;
  }

  const args = ["--uri", mongoUri];
  if (options.drop !== false) {
    args.push("--drop");
  }
  args.push(safeBackupPath);

  const result = await runMongoRestore(args);
  return {
    backupPath: safeBackupPath,
    restoredAt: new Date().toISOString(),
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

if (require.main === module) {
  const backupPath = process.argv[2];
  restoreBackup(backupPath)
    .then((result) => {
      console.log(`Restore completed from ${result.backupPath}`);
      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.error(result.stderr);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  restoreBackup,
};
