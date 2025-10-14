import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SRC_DIR = path.join(process.cwd(), "src");
const TRASH_DIR = path.join(SRC_DIR, "_trash");

const PROTECTED_DIRS = ["app/api", "app", "ai", "shared"];

// Cria _trash se não existir
if (!fs.existsSync(TRASH_DIR)) fs.mkdirSync(TRASH_DIR);

function isProtected(filePath: string) {
  return PROTECTED_DIRS.some(dir => filePath.startsWith(path.join(SRC_DIR, dir)));
}

function walk(dir: string): string[] {
  let filesList: string[] = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      filesList = filesList.concat(walk(fullPath));
    } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

function getAllImports(files: string[]): string[] {
  const imports: string[] = [];
  files.forEach(file => {
    const content = fs.readFileSync(file, "utf-8");
    const regex = /from\s+["'](.*)["']/g;
    let match;
    while ((match = regex.exec(content))) {
      imports.push(match[1]);
    }
  });
  return imports;
}

export async function GET(req: NextRequest) {
  const allFiles = walk(SRC_DIR);
  const allImports = getAllImports(allFiles);

  const unusedFiles: string[] = [];

  for (const file of allFiles) {
    if (isProtected(file)) continue;

    const relativePath = "./" + path.relative(SRC_DIR, file).replace(/\\/g, "/");
    if (!allImports.some(imp => imp.includes(relativePath))) {
      unusedFiles.push(file);
    }
  }

  // Gera relatório JSON
  const reportPath = path.join(SRC_DIR, "cleanup-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date(), unusedFiles }, null, 2));

  return NextResponse.json({
    message: "Auditoria concluída",
    unusedFiles,
    report: "/src/cleanup-report.json",
  });
}
