import type { ComponentChildren } from 'preact';
import type { ImageSet } from '../store/model';
import { urlKey } from '../store/store';

/** Hämähäkinverkko: säteet ja kaartuvat renkaat. */
export function webPaths(cx: number, cy: number, R: number, spokes: number, rings: number, rot: number, sag: number) {
  const ang: number[] = [];
  for (let i = 0; i < spokes; i++) ang.push(rot + (i * 2 * Math.PI) / spokes + Math.sin(i * 2.7) * 0.06);
  const f = (n: number) => n.toFixed(1);
  const sp = ang.map((a) => `M${f(cx)} ${f(cy)}L${f(cx + Math.cos(a) * R)} ${f(cy + Math.sin(a) * R)}`);
  const rg: string[] = [];
  for (let k = 1; k <= rings; k++) {
    const r = R * Math.pow(k / rings, 1.15);
    let d = '';
    for (let i = 0; i <= spokes; i++) {
      const a = ang[i % spokes];
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) d += `M${f(x)} ${f(y)}`;
      else {
        const am = (ang[(i - 1) % spokes] + (i === spokes ? a + 2 * Math.PI : a)) / 2;
        const rm = r * (1 - sag);
        d += `Q${f(cx + Math.cos(am) * rm)} ${f(cy + Math.sin(am) * rm)} ${f(x)} ${f(y)}`;
      }
    }
    rg.push(d);
  }
  return { spokes: sp, rings: rg };
}

const backWeb = webPaths(50, 71, 95, 12, 7, 0.2, 0.12);

export function SvgDefs() {
  return (
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <defs>
        <symbol id="spider" viewBox="0 0 100 100">
          <g fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">
            <g id="legs">
              <path d="M45 39 L31 23 L25 7" />
              <path d="M44 43 L24 33 L9 35" />
              <path d="M44 48 L25 55 L12 71" />
              <path d="M45 52 L34 68 L29 92" />
              <path d="M47 31 Q43 26 44 22" />
            </g>
            <use href="#legs" transform="translate(100 0) scale(-1 1)" />
          </g>
          <g fill="currentColor">
            <ellipse cx="50" cy="63" rx="14" ry="17.5" />
            <circle cx="50" cy="40" r="8.5" />
          </g>
          <path d="M50 53 l4 6 -4 5 -4 -5z M50 66 l3 4 -3 4 -3 -4z" fill="var(--face, #fff)" opacity=".55" />
        </symbol>
        <symbol id="webback" viewBox="0 0 100 142" preserveAspectRatio="xMidYMid slice">
          <path d={backWeb.spokes.join('') + backWeb.rings.join('')} fill="none" stroke="currentColor" stroke-width="1" />
        </symbol>
      </defs>
    </svg>
  );
}

const ICONS: Record<string, string> = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  hint: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  rotl: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  rotr: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  dots: '<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  chart: '<path d="M4 19h16M6 15l4-5 4 3 5-7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.1 19.8l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.2 14.3H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.2 7.1l-.1-.1A2 2 0 1 1 6.9 4.2l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9c.2.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  images: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  install: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
};

export function Icon({ name }: { name: keyof typeof ICONS | string }) {
  return <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] ?? '' }} />;
}

export function SpiderPic() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <use href="#spider" />
    </svg>
  );
}

/** Kortin kuvan URL setin ja numeron perusteella, tai null = hämähäkki. */
export function picUrl(set: ImageSet, rank: number, urls: Record<string, string>): string | null {
  const id = set.map[rank - 1];
  return id ? urls[urlKey(id, set.layout)] ?? null : null;
}

export function setClasses(set: ImageSet) {
  return [set.layout === 'full' ? 'full' : '', set.cardBorder ? '' : 'noborder', set.picBorder ? 'picborder' : ''].join(' ');
}

export function Face({ rank, url }: { rank: number; url: string | null }) {
  return (
    <div class="inner face">
      <div class="pic">{url ? <img src={url} alt="" draggable={false} /> : <SpiderPic />}</div>
      <div class="num">{rank}</div>
    </div>
  );
}

export function Back() {
  return (
    <div class="inner back">
      <svg aria-hidden="true">
        <use href="#webback" />
      </svg>
    </div>
  );
}

/** Staattinen kortti listoihin ja esikatseluun. */
export function MiniCard(props: {
  rank: number;
  suit: number;
  w: number;
  set: ImageSet;
  urls: Record<string, string>;
  url?: string | null;
  down?: boolean;
  children?: ComponentChildren;
}) {
  const url = props.url !== undefined ? props.url : picUrl(props.set, props.rank, props.urls);
  return (
    <div class={'mini ' + setClasses(props.set)} style={{ '--w': props.w + 'px', '--c': `var(--s${props.suit})` }}>
      {props.down ? <Back /> : <Face rank={props.rank} url={url} />}
      {props.children}
    </div>
  );
}
