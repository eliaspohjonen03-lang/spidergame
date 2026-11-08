import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import {
  blobToImage,
  canvas,
  composite,
  coverEdit,
  drawInFrame,
  frameAspect,
  loadOriginal,
  maskCanvasFromBlob,
  maskSize,
  toBlob,
} from '../images/imaging';
import { type Pixels, type RGB, backgroundAlpha, colorAt, detectBackground } from '../images/background';
import { type ImageEdit, type ImageRecord, MAX_LIBRARY, uid } from '../store/model';
import { getImage, saveImage, upsertSet, useData } from '../store/store';
import { Icon, MiniCard } from './Art';

type Mode = 'move' | 'erase' | 'restore' | 'bg';
type Src = (ImageBitmap | HTMLImageElement) & { width: number; height: number };
interface Snap {
  edit: ImageEdit;
  mask?: ImageData;
}
interface Pt {
  x: number;
  y: number;
}

const MAX_UNDO = 25;
const MAX_MASK_SNAPS = 12;

export function ImageEditor({ setId, imageId, file, onDone }: { setId: string; imageId: string | null; file?: File; onDone: () => void }) {
  const { sets, urls } = useData();
  const set = sets.find((s) => s.id === setId);
  const F = frameAspect(set?.layout ?? 'area');
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [mode, setMode] = useState<Mode>('move');
  const [brush, setBrush] = useState(26);
  const [feather, setFeather] = useState(0.25);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [viewZoomed, setViewZoomed] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [rotFree, setRotFree] = useState(false);
  const [rot, setRot] = useState(0);
  const [bgColors, setBgColors] = useState<RGB[]>([]);
  const [bgTol, setBgTol] = useState(0.15);
  const [bgConnected, setBgConnected] = useState(true);
  const [bgMsg, setBgMsg] = useState<string | null>(null);

  // Muuttuva editoritila refeissä, jotta piirto pysyy nopeana.
  const st = useRef({
    img: null as Src | null,
    original: null as Blob | null,
    mask: null as HTMLCanvasElement | null,
    maskTouched: false,
    edit: { x: 0, y: 0, scale: 1, rot: 0, feather: 0.25 } as ImageEdit,
    vs: 1,
    vx: 0,
    vy: 0,
    comp: null as HTMLCanvasElement | null,
    painting: false,
    undo: [] as Snap[],
    redo: [] as Snap[],
    pointers: new Map<number, Pt>(),
    last: null as Pt | null,
    gestureSnap: false,
    raf: 0,
    cursor: null as Pt | null,
    bgPix: null as Pixels | null,
    bgBase: null as ImageData | null,
    tapStart: null as Pt | null,
  });

  // ---------- Lataus ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = st.current;
        let rec: ImageRecord | undefined;
        if (imageId) rec = await getImage(imageId);
        const original = rec ? rec.original : file ? await loadOriginal(file) : null;
        if (!original) throw new Error('Kuvaa ei löytynyt');
        const img = (await blobToImage(original)) as Src;
        const ms = maskSize(img.width, img.height);
        s.img = img;
        s.original = original;
        s.mask = await maskCanvasFromBlob(rec?.mask ?? null, ms.w, ms.h);
        s.maskTouched = !!rec?.mask;
        s.edit = rec ? { ...rec.edit } : coverEdit(img.width, img.height, set?.layout ?? 'area');
        if (!alive) return;
        setFeather(s.edit.feather);
        setRot(s.edit.rot);
        rebuildComp(false);
        setStatus('ready');
      } catch (e) {
        console.error(e);
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---------- Geometria ----------
  function frameRect() {
    const cv = cvRef.current!;
    const cw = cv.clientWidth;
    const ch = cv.clientHeight;
    const fw = Math.min(cw - 48, (ch - 48) * F);
    return { cw, ch, fw, fh: fw / F };
  }
  function toScene(p: Pt): Pt {
    const { cw, ch } = frameRect();
    const s = st.current;
    return { x: (p.x - cw / 2 - s.vx) / s.vs, y: (p.y - ch / 2 - s.vy) / s.vs };
  }
  function sceneToMask(q: Pt): Pt {
    const s = st.current;
    const { fw } = frameRect();
    const img = s.img!;
    const k = (s.edit.scale * fw) / img.width;
    const lx = q.x - s.edit.x * fw;
    const ly = q.y - s.edit.y * fw;
    const c = Math.cos(-s.edit.rot);
    const sn = Math.sin(-s.edit.rot);
    const ux = lx * c - ly * sn;
    const uy = lx * sn + ly * c;
    const px = ux / k + img.width / 2;
    const py = uy / k + img.height / 2;
    const mk = s.mask!.width / img.width;
    return { x: px * mk, y: py * mk };
  }
  function brushInMask(): number {
    const s = st.current;
    const { fw } = frameRect();
    const k = (s.edit.scale * fw) / s.img!.width;
    return (brush / 2 / (s.vs * k)) * (s.mask!.width / s.img!.width);
  }

  // ---------- Piirto ----------
  function rebuildComp(withFeather = true) {
    const s = st.current;
    if (!s.img || !s.mask) return;
    s.comp = composite(s.img, s.maskTouched ? s.mask : null, withFeather ? s.edit.feather : 0);
    schedule();
  }

  function schedule() {
    const s = st.current;
    if (s.raf) return;
    s.raf = requestAnimationFrame(() => {
      s.raf = 0;
      draw();
    });
  }

  function draw() {
    const cv = cvRef.current;
    const s = st.current;
    if (!cv || !s.comp) return;
    const dpr = window.devicePixelRatio || 1;
    const { cw, ch, fw, fh } = frameRect();
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) {
      cv.width = Math.round(cw * dpr);
      cv.height = Math.round(ch * dpr);
    }
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(cw / 2 + s.vx, ch / 2 + s.vy);
    ctx.scale(s.vs, s.vs);
    // Kehyksen tausta: ruudukko näyttää pyyhityt alueet.
    const fx = -fw / 2;
    const fy = -fh / 2;
    const cell = 12 / s.vs;
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();
    ctx.fillStyle = '#2a2f3d';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.fillStyle = '#20242f';
    for (let y = 0, r = 0; y < fh; y += cell, r++) for (let x = (r % 2) * cell; x < fw; x += cell * 2) ctx.fillRect(fx + x, fy + y, cell, cell);
    ctx.restore();
    // Kuva kehyksen ulkopuolella himmennettynä
    ctx.globalAlpha = 0.3;
    drawInFrame(ctx, s.comp, s.edit, 0, 0, fw);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();
    drawInFrame(ctx, s.comp, s.edit, 0, 0, fw);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 1.5 / s.vs;
    ctx.strokeRect(fx, fy, fw, fh);
    ctx.restore();
    // Siveltimen koko
    if (s.cursor && (mode === 'erase' || mode === 'restore')) {
      ctx.beginPath();
      ctx.arc(s.cursor.x, s.cursor.y, brush / 2, 0, Math.PI * 2);
      ctx.strokeStyle = mode === 'erase' ? 'rgba(255,120,120,.9)' : 'rgba(120,255,190,.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  useLayoutEffect(() => {
    const on = () => schedule();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  useEffect(() => schedule(), [mode, brush, status]);

  // ---------- Kumoa ja tee uudelleen ----------
  function snapshot(withMask: boolean): Snap {
    const s = st.current;
    const snap: Snap = { edit: { ...s.edit } };
    if (withMask) snap.mask = s.mask!.getContext('2d')!.getImageData(0, 0, s.mask!.width, s.mask!.height);
    return snap;
  }
  function pushUndo(snap: Snap) {
    const s = st.current;
    s.undo.push(snap);
    if (s.undo.length > MAX_UNDO) s.undo.shift();
    let masks = s.undo.filter((u) => u.mask).length;
    for (const u of s.undo) {
      if (masks <= MAX_MASK_SNAPS) break;
      if (u.mask) {
        delete u.mask;
        masks--;
      }
    }
    s.redo = [];
    setCanUndo(true);
    setCanRedo(false);
  }
  function restore(snap: Snap) {
    const s = st.current;
    s.edit = { ...snap.edit };
    setRot(s.edit.rot);
    s.bgBase = null;
    setBgColors([]);
    setFeather(s.edit.feather);
    if (snap.mask) {
      s.mask!.getContext('2d')!.putImageData(snap.mask, 0, 0);
      s.maskTouched = true;
    }
    rebuildComp();
    queuePreview();
  }
  function doUndo() {
    const s = st.current;
    const snap = s.undo.pop();
    if (!snap) return;
    s.redo.push(snapshot(!!snap.mask));
    restore(snap);
    setCanUndo(s.undo.length > 0);
    setCanRedo(true);
  }
  function doRedo() {
    const s = st.current;
    const snap = s.redo.pop();
    if (!snap) return;
    s.undo.push(snapshot(!!snap.mask));
    restore(snap);
    setCanUndo(true);
    setCanRedo(s.redo.length > 0);
  }

  // ---------- Esikatselu ----------
  const previewTimer = useRef<number>();
  function queuePreview() {
    window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(async () => {
      const s = st.current;
      if (!s.comp) return;
      const out = canvas(240, 240 / F);
      const ctx = out.getContext('2d')!;
      drawInFrame(ctx, s.comp, s.edit, out.width / 2, out.height / 2, out.width);
      const b = await toBlob(out);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(b);
      });
    }, 350);
  }
  useEffect(() => {
    if (status === 'ready') queuePreview();
  }, [status]);

  // ---------- Eleet ----------
  function paintTo(p: Pt) {
    const s = st.current;
    const a = s.last ? sceneToMask(toScene(s.last)) : sceneToMask(toScene(p));
    const b = sceneToMask(toScene(p));
    const ctx = s.mask!.getContext('2d')!;
    ctx.save();
    ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushInMask() * 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x + 0.01, b.y);
    ctx.stroke();
    ctx.restore();
    s.maskTouched = true;
    s.last = p;
    // Siveltäessä pehmennys jätetään pois, jotta piirto on nopeaa.
    s.comp = composite(s.img!, s.mask, 0);
    schedule();
  }

  function local(e: PointerEvent): Pt {
    const r = cvRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e: PointerEvent) {
    if (status !== 'ready') return;
    const s = st.current;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = local(e);
    s.pointers.set(e.pointerId, p);
    s.cursor = p;
    if (s.pointers.size === 1) {
      if (mode === 'move') {
        pushUndo(snapshot(false));
      } else if (mode === 'bg') {
        s.tapStart = p;
      } else {
        pushUndo(snapshot(true));
        s.painting = true;
        s.last = null;
        paintTo(p);
      }
    } else if (s.pointers.size >= 2 && s.painting) {
      // Toinen sormi: kyseessä on zoomaus, ei sivellys. Perutaan ensimmäisen sormen
      // jo tekemä jälki palauttamalla maski siveltämistä edeltäneeseen tilaan.
      s.painting = false;
      s.last = null;
      const snap = s.undo.pop();
      if (snap?.mask) {
        s.mask!.getContext('2d')!.putImageData(snap.mask, 0, 0);
      }
      setCanUndo(s.undo.length > 0);
      rebuildComp();
    }
  }

  function onMove(e: PointerEvent) {
    const s = st.current;
    const p = local(e);
    s.cursor = p;
    const prev = s.pointers.get(e.pointerId);
    if (!prev) {
      schedule();
      return;
    }
    if (s.pointers.size === 1) {
      if (s.painting) {
        paintTo(p);
      } else if (mode === 'bg') {
        // Yhdellä sormella siirretään näkymää; napautus poimii värin.
        if (s.tapStart && Math.hypot(p.x - s.tapStart.x, p.y - s.tapStart.y) > 6) s.tapStart = null;
        if (!s.tapStart) {
          s.vx += p.x - prev.x;
          s.vy += p.y - prev.y;
          setViewZoomed(true);
          schedule();
        }
      } else if (mode === 'move') {
        const { fw } = frameRect();
        s.edit = { ...s.edit, x: s.edit.x + (p.x - prev.x) / s.vs / fw, y: s.edit.y + (p.y - prev.y) / s.vs / fw };
        schedule();
      }
      s.pointers.set(e.pointerId, p);
      return;
    }
    if (s.pointers.size === 2) {
      const ids = [...s.pointers.keys()];
      const other = s.pointers.get(ids.find((i) => i !== e.pointerId)!)!;
      const p1 = prev;
      const q1 = p;
      const dPrev = Math.hypot(p1.x - other.x, p1.y - other.y) || 1;
      const dNow = Math.hypot(q1.x - other.x, q1.y - other.y) || 1;
      const f = dNow / dPrev;
      const dth = Math.atan2(q1.y - other.y, q1.x - other.x) - Math.atan2(p1.y - other.y, p1.x - other.x);
      const mp = { x: (p1.x + other.x) / 2, y: (p1.y + other.y) / 2 };
      const mq = { x: (q1.x + other.x) / 2, y: (q1.y + other.y) / 2 };
      const { cw, ch, fw } = frameRect();
      let th = 0;
      if (mode === 'move') {
        // Kuvan siirto, zoomaus ja kierto kehyksen sisällä.
        const a = toScene(mp);
        const b = toScene(mq);
        const C = { x: s.edit.x * fw, y: s.edit.y * fw };
        const dx = C.x - a.x;
        const dy = C.y - a.y;
        // Kierto vain, jos se on vapautettu; muuten zoomaus ei käännä kuvaa vahingossa.
        th = rotFree ? dth : 0;
        const cs = Math.cos(th);
        const sn = Math.sin(th);
        const nx = b.x + f * (dx * cs - dy * sn);
        const ny = b.y + f * (dx * sn + dy * cs);
        s.edit = { ...s.edit, x: nx / fw, y: ny / fw, scale: Math.max(0.05, Math.min(40, s.edit.scale * f)), rot: s.edit.rot + th };
      } else {
        // Näkymän lähennys tarkkaa pyyhkimistä varten.
        const ns = Math.max(0.5, Math.min(12, s.vs * f));
        const k = ns / s.vs;
        s.vx = mq.x - cw / 2 - k * (mp.x - cw / 2 - s.vx);
        s.vy = mq.y - ch / 2 - k * (mp.y - ch / 2 - s.vy);
        s.vs = ns;
        setViewZoomed(Math.abs(ns - 1) > 0.01 || Math.abs(s.vx) > 1 || Math.abs(s.vy) > 1);
      }
      s.pointers.set(e.pointerId, p);
      s.tapStart = null;
      if (th !== 0) setRot(s.edit.rot);
      schedule();
    }
  }

  function onUp(e: PointerEvent) {
    const s = st.current;
    s.pointers.delete(e.pointerId);
    if (e.pointerType !== 'mouse') s.cursor = null;
    if (mode === 'bg' && s.tapStart && s.pointers.size === 0) {
      pickColor(s.tapStart);
      s.tapStart = null;
    }
    if (s.painting && s.pointers.size === 0) {
      s.painting = false;
      s.last = null;
      rebuildComp();
    }
    if (s.pointers.size === 0) queuePreview();
    schedule();
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const s = st.current;
    const f = Math.exp(-e.deltaY * 0.0015);
    if (mode === 'move') s.edit = { ...s.edit, scale: Math.max(0.05, Math.min(40, s.edit.scale * f)) };
    else {
      s.vs = Math.max(0.5, Math.min(12, s.vs * f));
      setViewZoomed(true);
    }
    schedule();
    queuePreview();
  }

  function rotate(d: number) {
    const s = st.current;
    pushUndo(snapshot(false));
    s.edit = { ...s.edit, rot: s.edit.rot + d };
    setRot(s.edit.rot);
    schedule();
    queuePreview();
  }
  /** Palauttaa kuvan suoraan vaaka-asentoon. Zoomaus ja paikka säilyvät. */
  function straighten() {
    const s = st.current;
    pushUndo(snapshot(false));
    s.edit = { ...s.edit, rot: 0 };
    setRot(0);
    schedule();
    queuePreview();
  }

  // ---------- Taustan poisto ----------
  function bgPixels(): Pixels {
    const s = st.current;
    if (!s.bgPix) {
      const c = canvas(s.mask!.width, s.mask!.height);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(s.img!, 0, 0, c.width, c.height);
      s.bgPix = ctx.getImageData(0, 0, c.width, c.height);
    }
    return s.bgPix;
  }
  function pickColor(p: Pt) {
    const m = sceneToMask(toScene(p));
    const px = bgPixels();
    if (m.x < 0 || m.y < 0 || m.x >= px.width || m.y >= px.height) return;
    const c = colorAt(px, m.x, m.y);
    setBgMsg(null);
    setBgColors((cs) => (cs.some((x) => Math.abs(x[0] - c[0]) + Math.abs(x[1] - c[1]) + Math.abs(x[2] - c[2]) < 12) ? cs : [...cs, c]));
  }
  function autoDetect() {
    const r = detectBackground(bgPixels());
    if (!r.colors.length) {
      setBgMsg(r.transparent ? 'Kuvan tausta on jo läpinäkyvä.' : 'Selkeää taustaväriä ei löytynyt. Napauta taustaa valitaksesi värin.');
      return;
    }
    setBgMsg(r.transparent ? 'Kuvassa on jo läpinäkyvää taustaa. Lisäksi löytyi värejä.' : null);
    setBgColors(r.colors);
  }
  function applyBg() {
    const s = st.current;
    if (!s.mask || !s.img) return;
    if (!s.bgBase) {
      if (!bgColors.length) return;
      pushUndo(snapshot(true));
      s.bgBase = s.mask.getContext('2d')!.getImageData(0, 0, s.mask.width, s.mask.height);
    }
    const base = s.bgBase;
    const alpha = backgroundAlpha(bgPixels(), bgColors, bgTol, bgConnected);
    const out = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
    for (let i = 0; i < alpha.length; i++) {
      const j = i * 4;
      out.data[j] = out.data[j + 1] = out.data[j + 2] = 255;
      out.data[j + 3] = Math.min(base.data[j + 3], alpha[i]);
    }
    s.mask.getContext('2d')!.putImageData(out, 0, 0);
    s.maskTouched = true;
    rebuildComp();
    queuePreview();
  }
  useEffect(() => {
    if (status === 'ready' && mode === 'bg') applyBg();
  }, [bgColors, bgTol, bgConnected]);
  function changeMode(m: Mode) {
    if (mode === 'bg' && m !== 'bg') {
      st.current.bgBase = null;
      setBgColors([]);
      setBgMsg(null);
    }
    setMode(m);
  }
  function fitView() {
    const s = st.current;
    s.vs = 1;
    s.vx = 0;
    s.vy = 0;
    setViewZoomed(false);
    schedule();
  }
  function resetAll() {
    const s = st.current;
    pushUndo(snapshot(true));
    s.edit = { ...coverEdit(s.img!.width, s.img!.height, set?.layout ?? 'area'), feather: s.edit.feather };
    setRot(0);
    s.bgBase = null;
    setBgColors([]);
    const ctx = s.mask!.getContext('2d')!;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, s.mask!.width, s.mask!.height);
    s.maskTouched = false;
    rebuildComp();
    queuePreview();
  }
  const featherSnap = useRef(false);
  function changeFeather(v: number) {
    const s = st.current;
    if (!featherSnap.current) {
      pushUndo(snapshot(false));
      featherSnap.current = true;
    }
    s.edit = { ...s.edit, feather: v };
    setFeather(v);
    rebuildComp();
    queuePreview();
  }

  // ---------- Tallennus ----------
  async function save() {
    const s = st.current;
    if (!set || !s.img || !s.original) return;
    setStatus('saving');
    try {
      // Tarkista, onko maskissa oikeasti pyyhittyä.
      let maskBlob: Blob | null = null;
      if (s.maskTouched) {
        const d = s.mask!.getContext('2d')!.getImageData(0, 0, s.mask!.width, s.mask!.height).data;
        let erased = false;
        for (let i = 3; i < d.length; i += 4)
          if (d[i] < 250) {
            erased = true;
            break;
          }
        if (erased) maskBlob = await toBlob(s.mask!);
      }
      const id = imageId ?? uid();
      await saveImage({ id, original: s.original, mask: maskBlob, edit: { ...s.edit } });
      if (!imageId) {
        const images = [...set.images, id].slice(0, MAX_LIBRARY);
        const map = [...set.map];
        const free = map.findIndex((m) => m === null);
        if (free >= 0) map[free] = id;
        upsertSet({ ...set, images, map });
      }
      onDone();
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  }

  // Esikatselu käyttää setin asetuksia, mutta kuvana editorin nykyistä tilaa.
  const previewSet = set ? { ...set } : null;

  return (
    <div class="editor">
      <header>
        <button class="btn small" type="button" onClick={onDone}>
          Peruuta
        </button>
        <div class="grow" />
        <button class="iconbtn" type="button" aria-label="Kumoa" disabled={!canUndo} onClick={doUndo}>
          <Icon name="undo" />
        </button>
        <button class="iconbtn" type="button" aria-label="Tee uudelleen" disabled={!canRedo} onClick={doRedo}>
          <Icon name="redo" />
        </button>
        <div class="grow" />
        <button class="btn small primary" type="button" disabled={status !== 'ready'} onClick={save}>
          {status === 'saving' ? 'Tallennetaan…' : 'Tallenna'}
        </button>
      </header>
      {status === 'error' ? (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '24px', textAlign: 'center' }}>
          <p>
            Kuvan käsittely epäonnistui. Kokeile toista kuvaa.
            <br />
            <button class="btn" type="button" style={{ marginTop: '12px' }} onClick={onDone}>
              Takaisin
            </button>
          </p>
        </div>
      ) : (
        <canvas
          ref={cvRef}
          class="work"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => {
            st.current.cursor = null;
            schedule();
          }}
          onWheel={onWheel}
        />
      )}
      <div class="tools">
        <div class="seg" role="group" aria-label="Työkalu">
          {(
            [
              ['move', 'Siirrä'],
              ['erase', 'Pyyhi'],
              ['restore', 'Palauta'],
              ['bg', 'Tausta'],
            ] as [Mode, string][]
          ).map(([m, t]) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => changeMode(m)}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '13px', color: '#aab' }}>
          {mode === 'move'
            ? rotFree
              ? 'Siirrä kuvaa yhdellä sormella. Zoomaa ja kierrä kahdella sormella.'
              : 'Siirrä kuvaa yhdellä sormella. Zoomaa kahdella sormella. Kierto on lukittu.'
            : mode === 'bg'
              ? 'Napauta taustaa poistaaksesi sen värin, tai käytä tunnistusta. Voit valita useita värejä.'
              : 'Sivele yhdellä sormella. Lähennä näkymää kahdella sormella tarkempaa jälkeä varten.'}
        </div>
        {mode === 'bg' && (
          <>
            <div class="toolrow">
              <button class="btn small" type="button" onClick={autoDetect}>
                Tunnista tausta
              </button>
              {bgColors.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  class="chip"
                  aria-label="Poista väri"
                  onClick={() => setBgColors((cs) => cs.filter((_, j) => j !== i))}
                  style={{ background: `rgb(${c[0]},${c[1]},${c[2]})` }}
                >
                  ×
                </button>
              ))}
            </div>
            {bgMsg && <div style={{ fontSize: '13px', color: '#ffd28a' }}>{bgMsg}</div>}
            <div class="seg" role="group" aria-label="Poistoalue">
              <button type="button" aria-pressed={bgConnected} onClick={() => setBgConnected(true)}>
                Vain reunoilta
              </button>
              <button type="button" aria-pressed={!bgConnected} onClick={() => setBgConnected(false)}>
                Kaikkialta
              </button>
            </div>
          </>
        )}
        <div class="sliders">
          {mode === 'bg' && (
            <>
              <label for="tol">Herkkyys</label>
              <input id="tol" type="range" min={0} max={1} step={0.02} value={bgTol} onInput={(e) => setBgTol(Number((e.target as HTMLInputElement).value))} />
            </>
          )}
          {(mode === 'erase' || mode === 'restore') && (
            <>
              <label for="brush">Sivellin</label>
              <input id="brush" type="range" min={6} max={90} value={brush} onInput={(e) => setBrush(Number((e.target as HTMLInputElement).value))} />
            </>
          )}
          <label for="feather">Reunan pehmennys</label>
          <input
            id="feather"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={feather}
            onPointerDown={() => (featherSnap.current = false)}
            onInput={(e) => changeFeather(Number((e.target as HTMLInputElement).value))}
          />
        </div>
        <div class="toolrow">
          <button class="iconbtn" type="button" aria-label="Kierrä vasemmalle" onClick={() => rotate(-Math.PI / 2)}>
            <Icon name="rotl" />
          </button>
          <button class="iconbtn" type="button" aria-label="Kierrä oikealle" onClick={() => rotate(Math.PI / 2)}>
            <Icon name="rotr" />
          </button>
          <button class="btn small" type="button" aria-pressed={rotFree} onClick={() => setRotFree((v) => !v)}>
            {rotFree ? 'Kierto: vapaa' : 'Kierto: lukittu'}
          </button>
          {Math.abs(Math.atan2(Math.sin(rot), Math.cos(rot))) > 0.001 && (
            <button class="btn small" type="button" onClick={straighten}>
              Suorista
            </button>
          )}
          {viewZoomed && (
            <button class="btn small" type="button" onClick={fitView}>
              Sovita näkymä
            </button>
          )}
          <button class="btn small" type="button" onClick={resetAll}>
            Aloita alusta
          </button>
        </div>
        {previewSet && (
          <div class="previews" aria-label="Esikatselu">
            {[0, 1, 2, 3].map((i) => (
              <MiniCard key={i} rank={[13, 9, 4, 1][i]} suit={i} w={56} set={previewSet} urls={urls} url={preview} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
