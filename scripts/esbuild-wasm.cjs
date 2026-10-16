// The bundled Windows native esbuild cannot traverse sandboxed ancestor paths.
// Use the official WebAssembly implementation without modifying dependencies.
const Module=require('node:module');
const original=Module._load;
Module._load=function(id,parent,...args){if(id==='esbuild')return require('esbuild-wasm');return original.call(this,id,parent,...args);};
