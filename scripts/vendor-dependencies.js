const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const vendor = path.join(root, 'vendor');
const copy = (source, destination) => {
  const target = path.join(vendor, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(path.join(root, 'node_modules', source), target, { recursive: true });
};

async function main() {
  copy('pdf-lib/dist/pdf-lib.min.js', 'pdf-lib.min.js');
  copy('pdf-lib/LICENSE.md', 'PDF-LIB-LICENSE');
  copy('jszip/dist/jszip.min.js', 'jszip.min.js');
  copy('jszip/LICENSE.markdown', 'JSZIP-LICENSE');
  copy('jspdf/dist/jspdf.umd.min.js', 'jspdf.umd.min.js');
  copy('jspdf/LICENSE', 'JSPDF-LICENSE');
  copy('@fortawesome/fontawesome-free/css/all.min.css', 'fontawesome/css/all.min.css');
  copy('@fortawesome/fontawesome-free/webfonts', 'fontawesome/webfonts');
  copy('@fortawesome/fontawesome-free/LICENSE.txt', 'fontawesome/LICENSE.txt');
  for (const weight of [400, 500, 700]) {
    copy(`@fontsource/space-grotesk/files/space-grotesk-latin-${weight}-normal.woff2`, `fonts/space-grotesk-${weight}.woff2`);
  }
  copy('@fontsource/space-grotesk/LICENSE', 'fonts/SPACE-GROTESK-LICENSE');
  copy('pdfjs-dist/legacy/build/pdf.min.mjs', 'pdfjs/pdf.min.mjs');
  copy('pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'pdfjs/pdf.worker.min.mjs');
  for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
    copy(`pdfjs-dist/${directory}`, `pdfjs/${directory}`);
  }
  copy('pdfjs-dist/LICENSE', 'pdfjs/LICENSE');
  copy('@pdf-lib/fontkit/dist/fontkit.umd.min.js', 'fontkit.umd.min.js');
  copy('papaparse/papaparse.min.js', 'papaparse.min.js');
  copy('papaparse/LICENSE', 'PAPAPARSE-LICENSE');
  copy('fonteditor-core/woff2/woff2.wasm', 'fonteditor/woff2.wasm');
  copy('fonteditor-core/LICENSE', 'fonteditor/LICENSE');
  copy('pako/LICENSE', 'fonteditor/PAKO-LICENSE');
  copy('@xmldom/xmldom/LICENSE', 'fonteditor/XMLDOM-LICENSE');
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'font-editor-entry.js')],
    outfile: path.join(vendor, 'fonteditor/font-editor.mjs'),
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    external: ['fs', 'path', 'crypto', 'util'],
    legalComments: 'inline',
    plugins: [{
      name: 'woff2-static-bindings',
      setup(build) {
        build.onLoad({ filter: /[/\\]woff2[/\\]woff2\.js$/ }, (args) => {
          // Replace this pinned encoder's generated bindings without enabling JavaScript eval.
          const contents = fs.readFileSync(args.path, 'utf8')
            .replace(/function createNamedFunction\(name,body\)\{[\s\S]*?\}function extendError/, 'function createNamedFunction(name,body){return function(){return body.apply(this,arguments)}}function extendError')
            .replace('return new Function("dynCall","rawFunction",body)(dynCall,rawFunction)', 'return function(){return dynCall.apply(null,[rawFunction].concat(Array.prototype.slice.call(arguments)))}')
            .replace(/function craftInvokerFunction\(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc\)\{[\s\S]*?return invokerFunction\}/, `function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc){
              var method=argTypes[1]!==null&&classType!==null;
              var stacked=argTypes.slice(1).some(function(type){return type!==null&&type.destructorFunction===undefined});
              return function(){
                if(arguments.length!==argTypes.length-2)throwBindingError('Invalid argument count for '+humanName);
                var destructors=stacked?[]:null;
                var wired=[cppTargetFunc];
                if(method)wired.push(argTypes[1].toWireType(destructors,this));
                for(var i=0;i<arguments.length;i++)wired.push(argTypes[i+2].toWireType(destructors,arguments[i]));
                var value=cppInvokerFunc.apply(null,wired);
                if(stacked)runDestructors(destructors);
                else for(var i=method?1:2;i<argTypes.length;i++)if(argTypes[i].destructorFunction!==null)argTypes[i].destructorFunction(wired[method?i:i-1]);
                if(argTypes[0].name!=='void')return argTypes[0].fromWireType(value);
              };
            }`);
          if (/new Function|new_\(Function/.test(contents)) throw new Error('Review the WOFF2 encoder bindings before bundling.');
          return { contents, loader: 'js', resolveDir: path.dirname(args.path) };
        });
      },
    }],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
