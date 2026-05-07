import fs from "node:fs";
import path from "node:path";

const localeDir = path.resolve("src", "locales");
const files = ["en.ts", "fr.ts", "es.ts", "zh.ts", "hi.ts"];

// Common mojibake fragments when UTF-8 is decoded as cp1252/latin-1.
const suspiciousPatterns = [/Ã./, /â€./, /ï¼./, /à¤./, /è../, /æ../, /å../];

const offenders = [];

for (const file of files) {
  const fullPath = path.join(localeDir, file);
  const content = fs.readFileSync(fullPath, "utf8");

  const hit = suspiciousPatterns.find((pattern) => pattern.test(content));
  if (hit) {
    offenders.push({ file, pattern: String(hit) });
  }
}

if (offenders.length > 0) {
  console.error("Locale encoding check failed. Potential mojibake detected:");
  for (const offender of offenders) {
    console.error(`- ${offender.file} (matched ${offender.pattern})`);
  }
  process.exit(1);
}

console.log("Locale encoding check passed.");

