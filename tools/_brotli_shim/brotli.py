# Minimal brotli shim backing fontTools' WOFF2 via Node's built-in zlib brotli.
import subprocess, tempfile, os
MODE_GENERIC=0; MODE_TEXT=1; MODE_FONT=2
_JS=r'''
const zlib=require('zlib'),fs=require('fs');
const op=process.argv[1],inp=process.argv[2],outp=process.argv[3],mode=+process.argv[4],q=+process.argv[5];
const buf=fs.readFileSync(inp);let r;
if(op==='c'){r=zlib.brotliCompressSync(buf,{params:{[zlib.constants.BROTLI_PARAM_MODE]:mode,[zlib.constants.BROTLI_PARAM_QUALITY]:q,[zlib.constants.BROTLI_PARAM_LGWIN]:22}});}
else{r=zlib.brotliDecompressSync(buf);}
fs.writeFileSync(outp,r);
'''
def _run(op,data,mode=0,quality=11):
    fin=tempfile.NamedTemporaryFile(delete=False); fin.write(data); fin.close()
    fout=fin.name+'.out'
    subprocess.run(['node','-e',_JS,op,fin.name,fout,str(mode),str(quality)],check=True)
    out=open(fout,'rb').read(); os.unlink(fin.name); os.unlink(fout); return out
def compress(data,mode=MODE_GENERIC,quality=11,lgwin=22): return _run('c',data,mode,quality)
def decompress(data): return _run('d',data)
