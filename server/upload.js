import fs from "fs";
import path from "path";
import { Storage } from "@google-cloud/storage";

// ================= CONFIG =================
const KEY_FILE = path.resolve(
  "C:/Users/vasan/Downloads/earth_observation_system/server/config/earth-observation-system-3be33f197b28.json"
);
const LOCAL_BASE_FOLDER = path.resolve("C:/Users/vasan/Downloads/datasets");

const BUCKET_MAP = {
  agriculture: "eo-agriculture-forestry",
  wildfire: "eo-disaster-resilience",
  deforestation: "eo-landuse-cartography",
  atmospheric: "eo-weather",
  mlev: "eo-weather",
  plev: "eo-weather",
  sfc: "eo-weather",
  water_potability: "eo-public-health",
  all_month: "eo-disaster-resilience"
};

// ==========================================

const storage = new Storage({ keyFilename: KEY_FILE });

let stats = { uploaded: 0, skipped: 0, failed: 0 };
let skippedFiles = [];

/**
 * Upload a single file to GCS
 */
async function uploadFile(filePath, bucketName) {
  const relativePath = path
    .relative(LOCAL_BASE_FOLDER, filePath)
    .replace(/\\/g, "/");

  try {
    await storage.bucket(bucketName).upload(filePath, {
      destination: relativePath
    });
    console.log(`✅ Uploaded ${relativePath} → ${bucketName}`);
    stats.uploaded++;
  } catch (error) {
    console.error(`❌ Failed to upload ${relativePath}:`, error.message);
    stats.failed++;
  }
}

/**
 * Determine which bucket a file belongs to
 */
function findBucketForFile(filePath) {
  const lowerPath = filePath.toLowerCase();
  for (const key of Object.keys(BUCKET_MAP)) {
    if (lowerPath.includes(key)) {
      return BUCKET_MAP[key];
    }
  }
  return null;
}

/**
 * Recursively process a folder
 */
async function processFolder(folderPath) {
  const items = fs.readdirSync(folderPath);

  if (items.length === 0) {
    console.log(`📂 Empty folder skipped: ${folderPath}`);
    return;
  }

  for (const item of items) {
    const fullPath = path.join(folderPath, item);

    if (fs.statSync(fullPath).isDirectory()) {
      await processFolder(fullPath);
    } else {
      const bucketName = findBucketForFile(fullPath);
      if (bucketName) {
        await uploadFile(fullPath, bucketName);
      } else {
        console.log(`⚠️ No bucket found for: ${fullPath}`);
        skippedFiles.push(fullPath);
        stats.skipped++;
      }
    }
  }
}

/**
 * Main execution
 */
(async () => {
  console.log("🚀 Starting upload process...");
  console.log(`📂 Base folder: ${LOCAL_BASE_FOLDER}`);

  await processFolder(LOCAL_BASE_FOLDER);

  // Save skipped files to a log
  if (skippedFiles.length > 0) {
    const logFile = path.resolve("skipped_files.log");
    fs.writeFileSync(logFile, skippedFiles.join("\n"), "utf-8");
    console.log(`📝 Skipped files list saved to ${logFile}`);
  }

  // Summary
  console.log("\n===== 📊 Upload Summary =====");
  console.log(`✅ Uploaded: ${stats.uploaded}`);
  console.log(`⚠️ Skipped: ${stats.skipped}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log("🎯 Upload process completed!");
})();
