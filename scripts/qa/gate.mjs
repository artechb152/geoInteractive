// Gate runner (docs/superpowers/plans/2026-10-08-relief-cover-compare.md, Global Constraints).
// Runs ONE command, keeps its full output in qa-output/gates/<label>.log and exits with the
// command's OWN exit code — it never turns a failure into a pass. For triage only, it sorts
// diagnostic lines by file: OURS = files this plan creates or changes (or lines naming them),
// FOREIGN = everything else (pre-existing / another session's work; still a failure).
//
//   node scripts/qa/gate.mjs <label> [--cwd <dir>] -- <command> [args…]
//
// Prints: RAW_EXIT=<n> OURS=<n> FOREIGN=<n>, then the OURS lines and the first FOREIGN lines.
// Exits 2 (and runs nothing) if the command or an arg has whitespace or any of & | < > ^ ( ) % " ' ;
import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep < 1 || sep === argv.length - 1) {
  console.error('usage: node scripts/qa/gate.mjs <label> [--cwd <dir>] -- <command> [args…]');
  process.exit(2);
}
const label = argv[0];
const opts = argv.slice(1, sep);
const cwdAt = opts.indexOf('--cwd');
const cwd = cwdAt >= 0 ? resolve(opts[cwdAt + 1]) : process.cwd();
const [cmd, ...args] = argv.slice(sep + 1);

// The command runs through the shell (shell: true is needed for npx/.cmd shims on Windows), and cmd.exe
// splits unquoted args at spaces and treats & | < > ^ ( ) % " as live syntax — a pipe could replace the
// exit code. So refuse any command part that could be re-interpreted; --cwd is exempt (it goes through
// the cwd option, not the shell).
const UNSAFE = /[\s&|<>^()%"';]/;
for (const part of [cmd, ...args]) {
  if (UNSAFE.test(part)) {
    console.error(`gate: refusing arg with shell metacharacters or spaces: ${part}`);
    process.exit(2);
  }
}

const OURS = [
  'terrainBlockGeometry', 'terrainBlock', 'LandformsVisuals', 'LandformsScene',
  'reliefCoverCompare', 'ReliefCoverVisuals', 'ReliefCoverCompare', 'ReliefCoverIntroScene',
  'relief-cover-compare', 'shot-relief-cover', 'shot-landforms-baseline', 'gate.mjs',
];
const DIAG = /error|Error|Failed|failed| — |offender/;

const dir = resolve('qa-output/gates');
mkdirSync(dir, { recursive: true });
const logPath = `${dir}/${label}.log`;
const fd = openSync(logPath, 'w');
const r = spawnSync(cmd, args, { cwd, shell: true, stdio: ['ignore', fd, fd] });
closeSync(fd);
const raw = r.status ?? 1; // killed by a signal or failed to spawn → failure

const lines = readFileSync(logPath, 'utf8').split(/\r?\n/).filter((l) => DIAG.test(l));
const ours = lines.filter((l) => OURS.some((n) => l.includes(n)));
const foreign = lines.filter((l) => !ours.includes(l));
console.log(`[${label}] RAW_EXIT=${raw} OURS=${ours.length} FOREIGN=${foreign.length} (log: ${logPath})`);
if (r.error) console.log(`  spawn error: ${r.error.message}`);
for (const l of ours) console.log(`  OURS     ${l}`);
for (const l of foreign.slice(0, 15)) console.log(`  FOREIGN  ${l}`);
if (foreign.length > 15) console.log(`  … ${foreign.length - 15} more foreign line(s) in the log`);
process.exit(raw);
