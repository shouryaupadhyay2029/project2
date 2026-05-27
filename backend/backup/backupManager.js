"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const DEFAULT_BACKUP_DIR = path.resolve(__dirname, "..", "backups");
const DEFAULT_RETENTION_DAYS = 7;

function getBackupDir(backupDir = process.env.BACKUP_DIR || DEFAULT_BACKUP_DIR) {
  return path.resolve(backupDir);
}

function getRetentionDays(retentionDays = process.env.BACKUP_RETENTION_DAYS) {
  const parsed = Number(retentionDays || DEFAULT_RETENTION_DAYS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_RETENTION_DAYS;
}

function verifyBackupPath(candidatePath, backupDir = process.env.BACKUP_DIR || DEFAULT_BACKUP_DIR) {
  if (!candidatePath || typeof candidatePath !== "string") {
    throw new Error("A backup path is required.");
  }

  const baseDir = getBackupDir(backupDir);
  const resolvedPath = path.resolve(candidatePath);
  const relativePath = path.relative(baseDir, resolvedPath);

  if (
    relativePath === "" ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Backup path must be inside ${baseDir}`);
  }

  return resolvedPath;
}

function createToolMissingError(toolName) {
  const error = new Error(
    `${toolName} is not installed or is not available on PATH. Install MongoDB Database Tools and try again.`
  );
  error.code = `${toolName.toUpperCase()}_NOT_FOUND`;
  return error;
}

function runMongoTool(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
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
        reject(createToolMissingError(command));
        return;
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(`${command} exited with code ${code}: ${stderr || stdout}`);
      error.code = `${command.toUpperCase()}_FAILED`;
      error.exitCode = code;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

async function pruneBackups(options = {}) {
  const backupDir = getBackupDir(options.backupDir);
  const retentionDays = getRetentionDays(options.retentionDays);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const pruned = [];

  await fsp.mkdir(backupDir, { recursive: true });

  const entries = await fsp.readdir(backupDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = verifyBackupPath(path.join(backupDir, entry.name), backupDir);
      const stats = await fsp.stat(entryPath);

      if (stats.mtimeMs < cutoff) {
        await fsp.rm(entryPath, { recursive: true, force: true });
        pruned.push(entryPath);
      }
    })
  );

  return { backupDir, retentionDays, pruned };
}

async function createBackup(options = {}) {
  const mongoUri = options.mongoUri || process.env.MONGO_URI;
  if (!mongoUri) {
    const error = new Error("MONGO_URI is required to create a backup.");
    error.code = "MONGO_URI_REQUIRED";
    throw error;
  }

  const backupDir = getBackupDir(options.backupDir);
  await fsp.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = verifyBackupPath(
    path.join(backupDir, options.name || `backup-${timestamp}`),
    backupDir
  );

  if (fs.existsSync(backupPath)) {
    const error = new Error(`Backup path already exists: ${backupPath}`);
    error.code = "BACKUP_EXISTS";
    throw error;
  }

  const args = ["--uri", mongoUri, "--out", backupPath];
  const result = await runMongoTool("mongodump", args);
  const pruneResult = options.skipPrune ? null : await pruneBackups({
    backupDir,
    retentionDays: options.retentionDays,
  });

  return {
    backupPath,
    backupDir,
    createdAt: new Date().toISOString(),
    stdout: result.stdout,
    stderr: result.stderr,
    pruned: pruneResult ? pruneResult.pruned : [],
  };
}

module.exports = {
  createBackup,
  pruneBackups,
  verifyBackupPath,
};
