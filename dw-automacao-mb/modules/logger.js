const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function logFile() {
  const d = new Date();
  const name = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.log`;
  return path.join(LOG_DIR, name);
}

function fmt(level, msg) {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  return `[${ts}] [${level}] ${msg}`;
}

function write(level, msg) {
  const line = fmt(level, msg);
  console.log(line);
  fs.appendFileSync(logFile(), line + '\n');
}

module.exports = {
  info:  (msg) => write('INFO ', msg),
  warn:  (msg) => write('WARN ', msg),
  error: (msg) => write('ERROR', msg),
  debug: (msg) => write('DEBUG', msg),
};
