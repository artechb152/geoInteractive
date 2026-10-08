// Usage: node --experimental-strip-types --import ./scripts/qa/ts-resolve.mjs <script>
import { register } from 'node:module';

register('./ts-resolve-hook.mjs', import.meta.url);
