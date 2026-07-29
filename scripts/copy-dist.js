import fs from "fs";
import path from "path";

const rootDist = path.resolve(process.cwd(), "dist");
const adminDist = path.resolve(process.cwd(), "apps/admin/dist");
const studentDist = path.resolve(process.cwd(), "apps/student-portal/dist");

// Determine source dist (default to adminDist if present, else studentDist)
let sourceDist = null;
if (fs.existsSync(adminDist)) {
  sourceDist = adminDist;
} else if (fs.existsSync(studentDist)) {
  sourceDist = studentDist;
}

if (sourceDist) {
  if (fs.existsSync(rootDist)) {
    fs.rmSync(rootDist, { recursive: true, force: true });
  }
  fs.cpSync(sourceDist, rootDist, { recursive: true });
  console.log(`Copied build output from ${sourceDist} to ${rootDist}`);
} else {
  console.warn("No apps dist directory found to copy to root dist!");
}
