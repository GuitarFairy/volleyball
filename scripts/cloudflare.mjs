import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const r=spawnSync(process.execPath,['--require',fileURLToPath(new URL('esbuild-wasm.cjs',import.meta.url)),fileURLToPath(new URL('../node_modules/wrangler/wrangler-dist/cli.js',import.meta.url)),...process.argv.slice(2)],{cwd:root,stdio:'inherit',env:{...process.env,XDG_CONFIG_HOME:root+'work/config',WRANGLER_LOG_PATH:root+'work/logs',WRANGLER_SEND_METRICS:'false'}});
process.exit(r.status??1);
