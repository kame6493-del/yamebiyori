// どのアプリを組むかを切り替える。node scripts/use-flavor.mjs both (出すのはこれだけ) | sake | tabako
// flavors/<名前>/flavor.json を src/flavor.current.json に写し、capacitor.config.json を作る。
// ネイティブの殻は flavor.json の native(省けば同じ名前)。both は sake の殻(jp.yamebiyori.sake)を使う。
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const name = process.argv[2];
const src = `flavors/${name}/flavor.json`;
if (!name || !existsSync(src)) {
  console.error('使い方: node scripts/use-flavor.mjs both | sake | tabako');
  process.exit(1);
}
const f = JSON.parse(readFileSync(src, 'utf8'));
const native = f.native || name;
copyFileSync(src, 'src/flavor.current.json');
writeFileSync('capacitor.config.json', JSON.stringify({
  appId: f.appId,
  appName: f.appName,
  webDir: 'dist',
  backgroundColor: f.paper,
  android: { path: `flavors/${native}/android`, allowMixedContent: false },
  ios: { path: `flavors/${native}/ios`, contentInset: 'never' },
  plugins: { LocalNotifications: { iconColor: f.accent } },
}, null, 2) + '\n');
// index.html の題名と地の色もそろえる
let html = readFileSync('index.html', 'utf8');
html = html.replace(/<title>.*<\/title>/, `<title>${f.appName}</title>`).replace(/name="theme-color" content="[^"]*"/, `name="theme-color" content="${f.paper}"`);
writeFileSync('index.html', html);
console.log(`${f.appName} に切り替えました`);
