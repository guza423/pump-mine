const fs = require('fs');
const path = require('path');
const ts = require('/opt/npm-tools/node_modules/typescript');
const dir = __dirname;
const rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const jsx = ['cns.jsx', 'bio-ui.jsx', 'core.jsx', 'app.jsx'].map(rd).join('\n');
const out = ts.transpileModule(jsx, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2019, removeComments: true, ignoreDeprecations: '6.0' }, fileName: 'app.jsx', reportDiagnostics: true });
(out.diagnostics || []).forEach((d) => console.error('TS:', ts.flattenDiagnosticMessageText(d.messageText, '\n')));
let js = rd('biomech.js').replace("if (typeof module !== 'undefined') module.exports = BIO;", '') + '\n' + rd('exlib.js') + '\n' + out.outputText.replace(/^"use strict";\s*/, '').replace(/export \{\};?\s*$/m, '');
js = js.replace(/<\/script/gi, '<\\/script');
new Function(js);
// Artifact görüntüleyici güvenli alanı zaten :root'ta boşluk olarak veriyor; çift boşluk olmasın.
const artifactOverride = ':root { --sat: 0px; --sab: 0px; }';
const css = ['cns.css', 'app.css', 'log.css', 'mobile.css', 'app5.css'].map(rd).join('\n') + '\n' + artifactOverride;
const html = `<title>OUTMOVE</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira:wdth,wght@75..100,400..800&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
${css}
</style>
<div id="root" lang="tr"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>
${js}
</script>
`;
fs.writeFileSync(path.join(dir, 'performance.html'), html);
console.log('ok', (html.length / 1024).toFixed(1) + ' KB');
