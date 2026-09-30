# -*- coding: utf-8 -*-
"""
AI가 만든 '가짜 도트' 그림 → 게임에 쓸 수 있는 '진짜 도트' 에셋

가짜 도트 그림은 작은 도트 그림을 N배로 늘린 뒤 흐리고 노이즈를 섞은 것과 같다.
그래서 크기를 줄이는(resize) 대신, 숨은 격자를 찾아 칸마다 원래 색 하나를 되살린다.

단계
 1. 배경색을 찾아 떼어 내고, 몬스터를 하나씩 나눈다 (연결된 덩어리).
 2. 몬스터마다 숨은 격자(칸 크기·시작점)를 찾는다: 색이 바뀌는 선이 격자선에 가장 잘 맞는 값.
 3. 칸마다 가운데 부분의 '가장 흔한 색'을 고른다 (평균을 내면 가장자리 번짐이 섞여 탁해진다).
 4. 모든 몬스터 색을 모아 팔레트로 줄인다 (비슷한 색은 하나로).
 5. 다듬기: 외톨이 점 없애기, 가장 어두운 색 = 테두리, 바깥 테두리 빈틈 메우기.
 6. 결과: 몬스터별 PNG, 비교 그림, 게임용 글자 지도(JS).

쓰는 법: python 도트복원.py <원본.png> <출력폴더> [칸크기 추정값]
"""
import sys, os, json
import numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
H, W, _ = im.shape

# ---------- 1. 배경과 몬스터 나누기 ----------
corner = np.concatenate([im[:30, :30], im[:30, -30:], im[-30:, :30], im[-30:, -30:]]).reshape(-1, 3)
BG = np.median(corner, axis=0)
dist = np.sqrt(((im - BG) ** 2).sum(2))
similar = dist <= 38
bgm = np.zeros_like(similar); bgm[0, :] = similar[0, :]; bgm[-1, :] = similar[-1, :]; bgm[:, 0] = similar[:, 0]; bgm[:, -1] = similar[:, -1]
while True:  # 페인트 통처럼 가장자리부터 번지기
    n = bgm.copy(); n[1:] |= bgm[:-1]; n[:-1] |= bgm[1:]; n[:, 1:] |= bgm[:, :-1]; n[:, :-1] |= bgm[:, 1:]
    n &= similar
    if (n == bgm).all(): break
    bgm = n
fg = ~bgm  # 배경과 이어지지 않은 곳은 모두 몸 (배경과 색이 같아도 테두리 안이면 몸)

def components(mask, grow=0):
    """연결된 덩어리 찾기 (grow 만큼 넓혀서 잎·날개처럼 떨어진 조각도 한 덩어리로)"""
    m = mask.copy()
    for _ in range(grow):
        n = m.copy(); n[1:] |= m[:-1]; n[:-1] |= m[1:]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]; m = n
    lab = np.zeros(m.shape, np.int32); cur = 0; boxes = []
    for y in range(0, m.shape[0]):
        xs = np.nonzero(m[y] & (lab[y] == 0))[0]
        for x in xs:
            if lab[y, x]: continue
            cur += 1; stack = [(y, x)]; lab[y, x] = cur; y0 = y1 = y; x0 = x1 = x; cnt = 0
            while stack:
                cy, cx = stack.pop(); cnt += 1
                y0 = min(y0, cy); y1 = max(y1, cy); x0 = min(x0, cx); x1 = max(x1, cx)
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = cur; stack.append((ny, nx))
            boxes.append((cnt, x0, y0, x1, y1))
    return boxes

# 작게 줄여서 덩어리를 찾고(빠르게), 원래 크기 좌표로 되돌린다
S = 4
small = fg[::S, ::S]
boxes = [b for b in components(small, grow=3) if b[0] > 60]
big = [list(b[1:]) for b in boxes if b[0] > 600]
for cnt, x0, y0, x1, y1 in boxes:
    if cnt > 600: continue  # 작은 조각(떨어지는 잎, 가루): 가장 가까운 몬스터 상자에 넣는다
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    b = min(big, key=lambda q: max(q[0] - cx, 0, cx - q[2]) + max(q[1] - cy, 0, cy - q[3]))
    b[0] = min(b[0], x0); b[1] = min(b[1], y0); b[2] = max(b[2], x1); b[3] = max(b[3], y1)
sprites = []
for x0, y0, x1, y1 in sorted(big, key=lambda b: (round(b[1] / 60), b[0])):
    sprites.append((max(0, x0 * S - 12), max(0, y0 * S - 12), min(W, x1 * S + 16), min(H, y1 * S + 16)))
print('몬스터', len(sprites), '마리:', sprites)

# ---------- 2. 숨은 격자 찾기 ----------
def edge_profile(crop, axis):
    d = np.abs(np.diff(crop, axis=axis)).sum(2)
    return (d > 45).sum(axis=1 - axis).astype(np.float32)  # 선마다 색이 바뀌는 점의 수

def fit_grid(prof, guess):
    """칸 크기 p와 시작점 ph: 격자선 위치(ph + k*p)에 색 변화가 가장 많이 몰리는 값"""
    best = (-1, 0, 0)
    n = len(prof)
    for p in np.arange(guess - 1.2, guess + 1.2, 0.02):
        for ph in np.arange(0, p, 0.25):
            pos = np.arange(ph, n - 1, p)
            idx = np.clip(np.round(pos).astype(int), 0, n - 1)
            # 격자선 바로 위와 칸 가운데를 비교 (가운데는 색이 안 바뀌어야 한다)
            mid = np.clip(np.round(pos + p / 2).astype(int), 0, n - 1)
            score = prof[idx].sum() - prof[mid].sum()
            if score > best[0]: best = (score, p, ph)
    return best[1], best[2]

GUESS = float(sys.argv[3]) if len(sys.argv) > 3 else 11.0

# ---------- 3. 칸마다 원래 색 되살리기 ----------
def sample(crop, px, phx, py, phy, alpha):
    cols = int((crop.shape[1] - phx) // px); rows = int((crop.shape[0] - phy) // py)
    out = np.zeros((rows, cols, 3), np.float32); a = np.zeros((rows, cols), bool)
    for r in range(rows):
        for c in range(cols):
            y0 = phy + r * py; x0 = phx + c * px
            # 가운데 60%만 본다 (가장자리는 번져 있다)
            yy0, yy1 = int(round(y0 + py * 0.2)), int(round(y0 + py * 0.8))
            xx0, xx1 = int(round(x0 + px * 0.2)), int(round(x0 + px * 0.8))
            patch = crop[yy0:yy1, xx0:xx1].reshape(-1, 3); pa = alpha[yy0:yy1, xx0:xx1].reshape(-1)
            if patch.size == 0: continue
            if pa.mean() < 0.5: continue  # 배경 칸
            patch = patch[pa]
            q = (patch // 12).astype(int)  # 비슷한 색끼리 묶어 가장 흔한 색
            keys, inv, counts = np.unique(q, axis=0, return_inverse=True, return_counts=True)
            k = counts.argmax(); out[r, c] = patch[inv.reshape(-1) == k].mean(0); a[r, c] = True
    return out, a

# AI 그림은 한 배율로 통째로 늘린 것이라 칸 크기는 그림 전체에서 하나다. 몬스터마다 다른 것은 시작점뿐.
PX, _ = fit_grid(edge_profile(im, 1), GUESS)
PY, _ = fit_grid(edge_profile(im, 0), GUESS)
P = (PX + PY) / 2
print(f'전체 칸 크기: 가로 {PX:.3f} 세로 {PY:.3f} → {P:.3f}')
def fit_phase(prof, p):
    n = len(prof); best = (-1, 0)
    for ph in np.arange(0, p, 0.25):
        pos = np.arange(ph, n - 1, p); idx = np.clip(np.round(pos).astype(int), 0, n - 1); mid = np.clip(np.round(pos + p / 2).astype(int), 0, n - 1)
        sc = prof[idx].sum() - prof[mid].sum()
        if sc > best[0]: best = (sc, ph)
    return best[1]
def snap_lines(prof, p, ph, reach=2):
    # 격자선 위치를 하나씩 가장 가까운 강한 경계로 옮긴다 (±reach 픽셀). 칸 너비는 p의 0.75~1.25배로 제한
    n = len(prof); lines = []; x = ph
    while x < n - 1:
        c = int(round(x)); lo, hi = max(0, c - reach), min(n - 1, c + reach)
        best = max(range(lo, hi + 1), key=lambda k: (prof[k], -abs(k - x)))
        if lines and not (0.75 * p <= best - lines[-1] <= 1.25 * p): best = c
        lines.append(best); x = best + p
    return lines
def sample_lines(crop, xs, ys, alpha):
    rows, cols = len(ys) - 1, len(xs) - 1
    out = np.zeros((rows, cols, 3), np.float32); a = np.zeros((rows, cols), bool)
    for r in range(rows):
        for c in range(cols):
            y0, y1, x0, x1 = ys[r], ys[r + 1], xs[c], xs[c + 1]
            yy0, yy1 = int(y0 + (y1 - y0) * 0.2 + 0.5), max(int(y0 + (y1 - y0) * 0.8 + 0.5), int(y0 + (y1 - y0) * 0.2 + 0.5) + 1)
            xx0, xx1 = int(x0 + (x1 - x0) * 0.2 + 0.5), max(int(x0 + (x1 - x0) * 0.8 + 0.5), int(x0 + (x1 - x0) * 0.2 + 0.5) + 1)
            patch = crop[yy0:yy1, xx0:xx1].reshape(-1, 3); pa = alpha[yy0:yy1, xx0:xx1].reshape(-1)
            if patch.size == 0 or pa.mean() < 0.5: continue
            patch = patch[pa]; q = (patch // 12).astype(int)
            keys, inv, counts = np.unique(q, axis=0, return_inverse=True, return_counts=True)
            out[r, c] = patch[inv.reshape(-1) == counts.argmax()].mean(0); a[r, c] = True
    return out, a
results = []
for i, (x0, y0, x1, y1) in enumerate(sprites):
    crop = im[y0:y1, x0:x1]; alpha = fg[y0:y1, x0:x1]
    ex, ey = edge_profile(crop, 1), edge_profile(crop, 0)
    px, phx = fit_grid(ex, P); py, phy = fit_grid(ey, P)
    xs, ys = snap_lines(ex, px, phx), snap_lines(ey, py, phy)
    rgb, a = sample_lines(crop, xs, ys, alpha)
    results.append({'i': i, 'box': (x0, y0, x1, y1), 'grid': (round(px, 2), round(phx, 2), round(py, 2), round(phy, 2)), 'rgb': rgb, 'a': a})
    print(f'#{i} 격자 가로 {px:.2f} (시작 {phx:.2f}) 세로 {py:.2f} (시작 {phy:.2f}) → {a.shape[1]}x{a.shape[0]}칸')

np.save(os.path.join(OUT, '_stage3.npy'), np.array([{'rgb': r['rgb'], 'a': r['a'], 'grid': r['grid'], 'box': r['box']} for r in results], dtype=object), allow_pickle=True)

# ---------- 중간 확인 그림 ----------
def save_raw(r, name, scale=8):
    h, w = r['a'].shape
    img = np.zeros((h, w, 4), np.uint8); img[..., :3] = np.clip(r['rgb'], 0, 255); img[..., 3] = r['a'] * 255
    Image.fromarray(img, 'RGBA').resize((w * scale, h * scale), Image.NEAREST).save(os.path.join(OUT, name))
for r in results: save_raw(r, f'stage3_{r["i"]}.png')


# ---------- 4. 팔레트: 모든 몬스터의 색을 모아 k개로 ----------
K = int(os.environ.get('PALETTE', '28'))
allc = np.concatenate([r['rgb'][r['a']] for r in results])
def lab(c):  # 사람 눈에 가까운 색 거리 (Lab)
    c = np.asarray(c, np.float64) / 255.0; c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    X = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]])
    X = X / np.array([0.9505, 1.0, 1.089]); f = np.where(X > 0.008856, np.cbrt(X), 7.787 * X + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
Lall = lab(allc)
rng = np.random.default_rng(1)
cent = Lall[rng.choice(len(Lall), K, replace=False)]
for _ in range(40):
    d = ((Lall[:, None] - cent[None]) ** 2).sum(2); asg = d.argmin(1)
    for k in range(K):
        if (asg == k).any(): cent[k] = Lall[asg == k].mean(0)
pal = np.array([allc[asg == k].mean(0) if (asg == k).any() else [0, 0, 0] for k in range(K)])
keep = []
for k in np.argsort(-np.bincount(asg, minlength=K)):  # 거의 같은 색(ΔE<6)은 합친다
    if not (asg == k).any(): continue
    if all(np.linalg.norm(cent[k] - cent[j]) >= 6 for j in keep): keep.append(k)
pal = pal[keep]; PL = lab(pal)
lum = pal @ np.array([0.299, 0.587, 0.114])
OUTLINE = lum < 52  # 가장 어두운 색들 = 테두리
print('팔레트', len(pal), '색 (테두리', int(OUTLINE.sum()), '색)')

def quant(rgb, a):
    idx = np.full(a.shape, -1)
    idx[a] = ((lab(rgb[a])[:, None] - PL[None]) ** 2).sum(2).argmin(1)
    return idx

# ---------- 5. 다듬기 ----------
def is_green(ci):
    r, g, b = pal[ci]; return g > r + 8 and g > b + 15
def clean(idx):
    h, w = idx.shape
    # (1) 발밑 풀·그림자: 아래 4줄에서, 초록(또는 어두운 초록)이고 위로 3칸 안에 빈 곳이 있으면 풀
    band = range(max(0, h - 4), h)
    def grassy(ci):
        r, g, b = pal[ci]; return g >= r and g > b + 8
    for _ in range(3):
        for y in band:
            for x in range(w):
                c = idx[y, x]
                if c < 0 or not grassy(c): continue
                if any(yy < 0 or idx[yy, x] < 0 for yy in range(y - 3, y)): idx[y, x] = -1
    #     풀잎 끝: 아래 4줄에서 바로 위가 빈 칸이고, 상하좌우에 몸(테두리 아닌 칸)이 없는 테두리 점
    #     바닥 그림자: 맨 아래 2줄에서 바로 위가 빈 칸인 칸 (발은 위에 발이 있어서 남는다)
    for _ in range(4):
        for y in band:
            for x in range(w):
                c = idx[y, x]
                if c < 0: continue
                up = idx[y - 1, x] if y > 0 else -1
                n4 = [idx[yy, xx] for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= yy < h and 0 <= xx < w]
                if OUTLINE[c] and up < 0 and not any(n >= 0 and not OUTLINE[n] for n in n4): idx[y, x] = -1
                elif y >= h - 2 and up < 0 and not OUTLINE[c]: idx[y, x] = -1
    #     몸(테두리 아닌 칸)에 붙지 않은 테두리 부스러기 지우기 (풀과 그림자가 남긴 것)
    for _ in range(3):
        for y in band:
            for x in range(w):
                c = idx[y, x]
                if c < 0 or not OUTLINE[c]: continue
                nb = [idx[yy, xx] for yy in range(y - 1, y + 2) for xx in range(x - 1, x + 2) if (yy, xx) != (y, x) and 0 <= yy < h and 0 <= xx < w]
                if not any(n >= 0 and not OUTLINE[n] for n in nb): idx[y, x] = -1
    # (1-2) 색과 상관없는 땅 부스러기: 몸(가장 큰 덩어리)과 떨어진 작은 조각이 아래 4줄에 닿아 있으면 지운다 (눈·얼음 조각, 그림자)
    seen = np.zeros((h, w), bool); comps = []
    for sy in range(h):
        for sx in range(w):
            if idx[sy, sx] < 0 or seen[sy, sx]: continue
            st = [(sy, sx)]; seen[sy, sx] = True; cells = []
            while st:
                cy, cx = st.pop(); cells.append((cy, cx))
                for yy in range(cy - 1, cy + 2):
                    for xx in range(cx - 1, cx + 2):
                        if 0 <= yy < h and 0 <= xx < w and idx[yy, xx] >= 0 and not seen[yy, xx]: seen[yy, xx] = True; st.append((yy, xx))
            comps.append(cells)
    if comps:
        main = max(comps, key=len)
        for cells in comps:
            if cells is main: continue
            ys = [cy for cy, cx in cells]
            flat_on_ground = min(ys) >= h - 3               # 땅에 깔린 납작한 것 (그림자)
            speck = len(cells) <= 4                          # 떠다니는 부스러기
            small_near_ground = len(cells) < 14 and max(ys) >= h - 4
            if flat_on_ground or speck or small_near_ground:
                for cy, cx in cells: idx[cy, cx] = -1
    # (2) 외톨이 점: 둘레 대부분이 한 색이고 그 색과 거의 같으면(ΔE<18) 그 색으로. 눈 반짝임처럼 대비가 큰 점은 둔다
    out = idx.copy()
    for y in range(h):
        for x in range(w):
            c = idx[y, x]
            if c < 0: continue
            nb = [idx[yy, xx] for yy in range(y - 1, y + 2) for xx in range(x - 1, x + 2) if (yy, xx) != (y, x) and 0 <= yy < h and 0 <= xx < w]
            if c in nb: continue
            vv = [n for n in nb if n >= 0]
            if not vv: continue
            vals, cnt = np.unique(vv, return_counts=True)
            if cnt.max() >= 5 and np.linalg.norm(PL[c] - PL[vals[cnt.argmax()]]) < 18: out[y, x] = vals[cnt.argmax()]
    idx = out
    # (3) 바깥 테두리 빈틈: 테두리가 아닌 칸이 빈 곳과 맞닿으면 그 빈 곳에 테두리를 둔다
    dark = int(np.argmin(lum))
    big = np.full((h + 2, w + 2), -1); big[1:-1, 1:-1] = idx
    add = []
    for y in range(1, h + 1):
        for x in range(1, w + 1):
            if big[y, x] >= 0 and not OUTLINE[big[y, x]]:
                for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if big[yy, xx] < 0: add.append((yy, xx))
    for yy, xx in add: big[yy, xx] = dark
    idx = big
    # (4) 빈 가장자리 잘라내기
    ys, xs = np.nonzero(idx >= 0)
    return idx[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

final = []
for r in results:
    idx = clean(quant(r['rgb'], r['a']))
    final.append(idx)
    h, w = idx.shape
    img = np.zeros((h, w, 4), np.uint8)
    m = idx >= 0
    img[m, :3] = np.clip(pal[idx[m]], 0, 255).astype(np.uint8); img[m, 3] = 255
    Image.fromarray(img, 'RGBA').save(os.path.join(OUT, f'monster_{r["i"]}.png'))
    Image.fromarray(img, 'RGBA').resize((w * 8, h * 8), Image.NEAREST).save(os.path.join(OUT, f'monster_{r["i"]}_x8.png'))
    print(f'#{r["i"]} 완성 {w}x{h}, {len(set(idx[m].tolist()))}색')

# ---------- 6. 게임용 글자 지도 ----------
LETTERS = list('abdfghijklmnpqrstuvxyzABCDEFGHIJKLMNPQRSTUVWXYZ0123456789')  # o e w c 는 게임 공통 글자라 뺀다
used = sorted(set(int(v) for idx in final for v in idx[idx >= 0].ravel()))
dark = int(np.argmin(lum)); letter = {}; li = 0
for ci in used:
    if ci == dark: letter[ci] = 'o'
    else: letter[ci] = LETTERS[li]; li += 1
hexs = {letter[ci]: '#%02x%02x%02x' % tuple(int(v) for v in np.clip(pal[ci], 0, 255)) for ci in used if letter[ci] != 'o'}
out = {'palette': hexs, 'outline': '#%02x%02x%02x' % tuple(int(v) for v in pal[dark]), 'sprites': []}
for r, idx in zip(results, final):
    out['sprites'].append({'i': r['i'], 'grid': [float(v) for v in r['grid']], 'rows': [''.join(letter[int(v)] if v >= 0 else '.' for v in row) for row in idx]})
json.dump(out, open(os.path.join(OUT, 'sprites.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('글자 지도 저장:', os.path.join(OUT, 'sprites.json'))
