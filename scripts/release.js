#!/usr/bin/env node
/**
 * SGT Workspace — script de release
 * Uso: npm run release -- 1.0.1
 */

import { execSync }   from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, "..");

function run(cmd) {
  console.log(`  → ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function readJson(rel) {
  return JSON.parse(readFileSync(resolve(ROOT, rel), "utf-8"));
}

function writeJson(rel, obj) {
  writeFileSync(resolve(ROOT, rel), JSON.stringify(obj, null, 2) + "\n", "utf-8");
}

function isSemver(v) {
  return /^\d+\.\d+\.\d+$/.test(v);
}

const version = process.argv[2];

if (!version || !isSemver(version)) {
  console.error("\n❌  Informe a versão no formato semver: npm run release -- 1.0.1\n");
  process.exit(1);
}

try {
  const status = execSync("git status --porcelain", { cwd: ROOT }).toString().trim();
  if (status) {
    console.error("\n❌  Há mudanças não commitadas. Faça commit antes de criar uma release.\n");
    console.error(status);
    process.exit(1);
  }
} catch {
  console.error("\n❌  Não foi possível verificar o status do git.\n");
  process.exit(1);
}

console.log(`\n🚀  Criando release v${version}...\n`);

console.log("📝  Atualizando package.json...");
const pkg = readJson("package.json");
pkg.version = version;
writeJson("package.json", pkg);

console.log("📝  Atualizando src-tauri/tauri.conf.json...");
const tauriConf = readJson("src-tauri/tauri.conf.json");
tauriConf.version = version;
writeJson("src-tauri/tauri.conf.json", tauriConf);

console.log("\n📦  Commitando...");
run("git add package.json src-tauri/tauri.conf.json");
run(`git commit -m "chore: release v${version}"`);

console.log("\n⬆️   Enviando para main...");
run("git push origin main");

console.log(`\n🏷️   Criando tag v${version}...`);
run(`git tag v${version}`);
run(`git push origin v${version}`);

console.log(`
✅  Release v${version} criada com sucesso!

   Acompanhe o build em: https://github.com/Pedroauj/Workspace-SGT/actions

   Em ~10 min o update estará disponível para os usuários.
`);
