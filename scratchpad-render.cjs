const sharp = require('sharp');
const fs = require('fs');
const p = process.argv[2], w = Number(process.argv[3]), out = process.argv[4];
sharp(fs.readFileSync(p), { density: 400 })
  .resize({ width: w })
  .flatten({ background: '#FBF6EC' })
  .png()
  .toFile(out)
  .then(() => console.log('ok', out))
  .catch((e) => { console.error('ERR', e.message); process.exit(1); });
