// Fails the build if an Anthropic API key appears anywhere in dist/, so the key
// can never ship in the front-end bundle. A backstop to the rules in CLAUDE.md
// §3.1, not a replacement for them.
//
// It looks for the "sk-ant-" key prefix and, when CLAUDE_API_KEY is set (as it
// is in Netlify builds), for the key's exact value. The key is never printed.
//
// Run: npm run check:dist (also runs as part of npm run build)

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const DIST_DIR = resolve("dist");

const needles: { label: string; bytes: Buffer }[] = [
  { label: 'the "sk-ant-" key prefix', bytes: Buffer.from("sk-ant-") },
];
const key = process.env.CLAUDE_API_KEY?.trim();
if (key)
  needles.push({
    label: "the value of CLAUDE_API_KEY",
    bytes: Buffer.from(key),
  });

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

let files: string[];
try {
  files = listFiles(DIST_DIR);
} catch {
  console.error(`check-dist: ${DIST_DIR} not found. Run the build first.`);
  process.exit(1);
}

const leaks: string[] = [];
for (const file of files) {
  const contents = readFileSync(file);
  for (const needle of needles) {
    if (contents.includes(needle.bytes)) {
      leaks.push(`${relative(process.cwd(), file)} contains ${needle.label}`);
    }
  }
}

if (leaks.length > 0) {
  console.error("check-dist: possible API key in the front-end bundle:");
  for (const leak of leaks) console.error(`  - ${leak}`);
  process.exit(1);
}

console.log(
  `check-dist: ${files.length} files in dist/ checked, no API key found` +
    (key
      ? " (prefix and CLAUDE_API_KEY value)."
      : " (prefix only; CLAUDE_API_KEY not set)."),
);
