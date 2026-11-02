'use strict';
const fs=require('node:fs');
const path=require('node:path');
const FILES=['index.html','style.css','lz-string.min.js'];
function preparePages({rootDir=path.resolve(__dirname,'..'),outDir=path.join(rootDir,'dist-pages')}={}){
  const root=path.resolve(rootDir),output=path.resolve(outDir);
  if(output!==path.join(root,'dist-pages') && !output.startsWith(path.join(root,'tmp')+path.sep))throw new Error('Output must be dist-pages or a temporary project subdirectory.');
  fs.rmSync(output,{recursive:true,force:true});
  fs.mkdirSync(output,{recursive:true});
  for(const file of FILES)fs.copyFileSync(path.join(root,file),path.join(output,file));
  for(const dir of ['src','data/drachenfels'])fs.cpSync(path.join(root,dir),path.join(output,dir),{recursive:true});
  fs.writeFileSync(path.join(output,'.nojekyll'),'');
  return output;
}
module.exports={preparePages};
if(require.main===module)console.log(preparePages());
