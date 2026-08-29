import * as fs from 'fs';
import * as path from 'path';

const srcDir = path.join(process.cwd(), 'src');

function getAllFiles(dir: string, exts: string[] = ['.tsx', '.jsx']): string[] {
  let files: string[] = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(item))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allTsxFiles = getAllFiles(srcDir);
console.log(`Total TSX/JSX files found under src/: ${allTsxFiles.length}`);
allTsxFiles.forEach((f: string, i: number) => {
  console.log(`${(i + 1).toString().padStart(2, ' ')}. ${path.relative(srcDir, f).replace(/\\/g, '/')}`);
});
