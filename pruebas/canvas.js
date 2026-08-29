/* Canvas 2D de software + codificador PNG, en Node puro.
   Solo lo usan las pruebas: el juego no depende de este archivo. */
const fs=require('fs'), zlib=require('zlib');

function parseColor(s){
  if(typeof s!=='string') return null;
  if(s[0]==='#'){ const h=s.slice(1); const n=parseInt(h,16);
    if(h.length===6) return [(n>>16)&255,(n>>8)&255,n&255,255]; }
  let m=s.match(/rgba?\(([^)]+)\)/);
  if(m){ const p=m[1].split(',').map(Number); return [p[0]|0,p[1]|0,p[2]|0, Math.round((p[3]===undefined?1:p[3])*255)]; }
  return null;
}
class Ctx{
  constructor(cv){ this.cv=cv; this.fillStyle='#000'; this.imageSmoothingEnabled=false; this._path=null; }
  _blend(x,y,c){ const {w,h,data}=this.cv; if(x<0||y<0||x>=w||y>=h) return;
    const i=(y*w+x)*4, a=c[3]/255;
    data[i]=data[i]*(1-a)+c[0]*a; data[i+1]=data[i+1]*(1-a)+c[1]*a;
    data[i+2]=data[i+2]*(1-a)+c[2]*a; data[i+3]=Math.max(data[i+3],c[3]); }
  fillRect(x,y,w,h){ const c=parseColor(this.fillStyle); if(!c) return;
    x=Math.round(x);y=Math.round(y);w=Math.round(w||1);h=Math.round(h||1);
    for(let j=0;j<h;j++) for(let i=0;i<w;i++) this._blend(x+i,y+j,c); }
  clearRect(x,y,w,h){ const {data}=this.cv; for(let j=0;j<h;j++) for(let i=0;i<w;i++){
    const k=((y+j)*this.cv.w+(x+i))*4; data[k]=data[k+1]=data[k+2]=data[k+3]=0; } }
  drawImage(img,a,b,c,d,e,f,g,h){
    let sx=0,sy=0,sw=img.w,sh=img.h,dx=a,dy=b;
    if(arguments.length===9){ sx=a;sy=b;sw=c;sh=d;dx=e;dy=f; }
    for(let j=0;j<sh;j++) for(let i=0;i<sw;i++){
      const k=((sy+j)*img.w+(sx+i))*4; const al=img.data[k+3]; if(!al) continue;
      this._blend(Math.round(dx)+i,Math.round(dy)+j,[img.data[k],img.data[k+1],img.data[k+2],al]); } }
  beginPath(){ this._path=null; }
  ellipse(cx,cy,rx,ry){ this._path={cx,cy,rx,ry}; }
  fill(){ const p=this._path; if(!p) return; const c=parseColor(this.fillStyle); if(!c) return;
    for(let y=Math.floor(p.cy-p.ry);y<=p.cy+p.ry;y++) for(let x=Math.floor(p.cx-p.rx);x<=p.cx+p.rx;x++){
      const dx=(x-p.cx)/p.rx, dy=(y-p.cy)/p.ry; if(dx*dx+dy*dy<=1) this._blend(x,y,c); } }
  createRadialGradient(){ return {addColorStop(){}}; }
}
class Canvas{ constructor(w,h){ this.w=w;this.h=h; this.width=w; this.height=h;
    this.data=new Uint8ClampedArray(w*h*4); this._ctx=new Ctx(this); this.style={setProperty(){}};
    this.classList={add(){},remove(){}}; this.addEventListener=()=>{}; this.focus=()=>{}; }
  getContext(){ return this._ctx; }
  toDataURL(){ return 'data:image/png;base64,'; }   // suficiente para las pruebas
  set width(v){ if(this.w!==undefined&&v!==this.w){ this.w=v; this.data=new Uint8ClampedArray(this.w*this.h*4);} this._w=v; }
  get width(){ return this.w; }
  set height(v){ if(this.h!==undefined&&v!==this.h){ this.h=v; this.data=new Uint8ClampedArray(this.w*this.h*4);} this._h=v; }
  get height(){ return this.h; }
}
function png(cv,path){
  const raw=Buffer.alloc((cv.w*4+1)*cv.h);
  for(let y=0;y<cv.h;y++){ raw[y*(cv.w*4+1)]=0;
    for(let x=0;x<cv.w*4;x++) raw[y*(cv.w*4+1)+1+x]=cv.data[y*cv.w*4+x]; }
  const idat=zlib.deflateSync(raw);
  const chunks=[];
  function chunk(type,data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td=Buffer.concat([Buffer.from(type),data]);
    const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td)>>>0); chunks.push(len,td,crc); }
  let tbl=null;
  function crc32(buf){ if(!tbl){ tbl=[]; for(let n=0;n<256;n++){ let c=n;
      for(let k=0;k<8;k++) c=c&1?0xedb88320^(c>>>1):c>>>1; tbl[n]=c>>>0; } }
    let c=0xffffffff; for(let i=0;i<buf.length;i++) c=tbl[(c^buf[i])&255]^(c>>>8); return (c^0xffffffff)>>>0; }
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(cv.w,0); ihdr.writeUInt32BE(cv.h,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  chunk('IHDR',ihdr); chunk('IDAT',idat); chunk('IEND',Buffer.alloc(0));
  fs.writeFileSync(path,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),...chunks]));
}

/* --------------------- lector de PNG (solo para las pruebas) --------------
   Suficiente para los sprites del juego: 8 bits por canal, sin entrelazado,
   en color RGB o RGBA. Con esto las capturas muestran los PNG de verdad y no
   el dibujo de respaldo. */
function leerPNG(ruta){
  const b = require('fs').readFileSync(ruta);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('no es un PNG: ' + ruta);
  let i = 8, w = 0, h = 0, prof = 8, tipo = 6, entre = 0;
  const trozos = [];
  while (i < b.length) {
    const largo = b.readUInt32BE(i), clase = b.toString('ascii', i + 4, i + 8);
    const datos = b.slice(i + 8, i + 8 + largo);
    if (clase === 'IHDR') {
      w = datos.readUInt32BE(0); h = datos.readUInt32BE(4);
      prof = datos[8]; tipo = datos[9]; entre = datos[12];
    } else if (clase === 'IDAT') trozos.push(datos);
    else if (clase === 'IEND') break;
    i += 12 + largo;
  }
  if (prof !== 8 || entre !== 0 || (tipo !== 6 && tipo !== 2))
    throw new Error('PNG no soportado (profundidad ' + prof + ', tipo ' + tipo + '): ' + ruta);
  const canales = tipo === 6 ? 4 : 3;
  const crudo = zlib.inflateSync(Buffer.concat(trozos));
  const paso = w * canales;
  const cv = new Canvas(w, h);
  const prev = Buffer.alloc(paso);
  let off = 0;
  for (let y = 0; y < h; y++) {
    const filtro = crudo[off++];
    const linea = Buffer.from(crudo.slice(off, off + paso)); off += paso;
    for (let x = 0; x < paso; x++) {
      const a = x >= canales ? linea[x - canales] : 0, bb = prev[x];
      const c = x >= canales ? prev[x - canales] : 0;
      let v = linea[x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += bb;
      else if (filtro === 3) v += (a + bb) >> 1;
      else if (filtro === 4) {
        const p = a + bb - c, pa = Math.abs(p - a), pb = Math.abs(p - bb), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c);
      }
      linea[x] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const s = x * canales, d = (y * w + x) * 4;
      cv.data[d] = linea[s]; cv.data[d + 1] = linea[s + 1]; cv.data[d + 2] = linea[s + 2];
      cv.data[d + 3] = canales === 4 ? linea[s + 3] : 255;
    }
    linea.copy(prev);
  }
  return cv;
}

module.exports={Canvas,png,leerPNG};
