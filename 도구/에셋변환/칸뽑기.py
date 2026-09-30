# -*- coding: utf-8 -*-
"""
AI 도트 그림(단순한 그림) → 칸 1개 = 1픽셀 PNG

도트복원.py 보다 단순하다. 색을 묶지 않고 칸 가운데 색을 그대로 뽑는다. 색이 적고 또렷한 그림에 맞다.
 1. 배경과 발밑 그림자 떼기: 배경색을 고르게 어둡게/밝게 한 색(세 채널 비율이 거의 같음)은 배경으로 본다.
 2. 덩어리(몬스터)마다 숨은 격자(칸 크기·시작점)를 찾는다: 칸 안 색이 가장 고른 값.
 3. 칸 가운데 절반의 가운데값 색을 뽑는다. 아주 어두운 색(테두리)은 한 색으로, 비슷한 색(차이 24 미만)은 많이 쓴 색으로 모은다.
결과: <출력폴더>/칸_0.png, 칸_1.png … (위에서 아래, 왼쪽에서 오른쪽 차례, 사방 10px 투명 여백), 비교_N.png(원본에 격자를 겹친 것과 결과)

쓰는 법: python 칸뽑기.py <그림.png> <출력폴더> <칸크기 최소> <칸크기 최대> [near]
 near: 배경과 가까운 색(차이 40 미만)만 배경으로 본다. 흰 배경에 회색(칼·톱니)이 있어 '배경을 어둡게 한 색'이 몸에 쓰일 때.
"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw

SRC, OUT, PMIN, PMAX = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
NEAR = len(sys.argv) > 5 and sys.argv[5] == 'near'
os.makedirs(OUT, exist_ok=True)
img = Image.open(SRC).convert('RGB'); im = np.asarray(img).astype(float); H, W, _ = im.shape
bg = np.median(np.concatenate([im[:20, :20], im[:20, -20:], im[-20:, :20], im[-20:, -20:]]).reshape(-1, 3), 0)

def bgish(c):  # 배경을 고르게 어둡게·밝게 한 색이면 배경(그림자 포함)
    if NEAR: return np.abs(c - bg).sum(-1) < 40
    r = c / np.maximum(bg, 1)
    return (r.max(-1) - r.min(-1) < 0.12) & (r.mean(-1) > 0.4) & (r.mean(-1) < 1.15)

fg = ~bgish(im)
if NEAR:  # 픽셀 단위로 그림 바깥에서 배경을 채워 들어간다. 굵은 어두운 테두리에서 멈추므로, 배경과 비슷한 흰·크림색(셔츠·머리칼)도 안쪽이면 남는다
    ok = np.abs(im - bg).sum(-1) < 45
    outside = np.zeros((H, W), bool); outside[0, :] = ok[0, :]; outside[-1, :] = ok[-1, :]; outside[:, 0] = ok[:, 0]; outside[:, -1] = ok[:, -1]
    while True:
        nx = outside.copy(); nx[1:] |= outside[:-1]; nx[:-1] |= outside[1:]; nx[:, 1:] |= outside[:, :-1]; nx[:, :-1] |= outside[:, 1:]; nx &= ok
        if (nx == outside).all(): break
        outside = nx
    fg = ~outside
# 덩어리 나누기: 8px 칸으로 줄여 이어진 것끼리 (잎·줄기처럼 살짝 떨어진 것도 한 덩어리로)
B = 8; small = fg[:H // B * B, :W // B * B].reshape(H // B, B, W // B, B).any((1, 3))
lab = np.zeros(small.shape, int); n = 0
for sy, sx in zip(*np.nonzero(small)):
    if lab[sy, sx]: continue
    n += 1; st = [(sy, sx)]; lab[sy, sx] = n
    while st:
        y, x = st.pop()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if 0 <= yy < small.shape[0] and 0 <= xx < small.shape[1] and small[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; st.append((yy, xx))
boxes = []
for k in range(1, n + 1):
    ys, xs = np.nonzero(lab == k)
    if len(ys) < 20: continue  # 부스러기
    boxes.append((ys.min() * B, ys.max() * B + B, xs.min() * B, xs.max() * B + B))
boxes.sort(key=lambda b: (round(b[0] / 150), b[2]))  # 줄마다 왼쪽부터

def cell(P, ox, oy, cx, cy):  # 그림 밖으로 나간 칸은 빈 배열
    x0, y0, k = int(ox + cx * P + P * 0.25), int(oy + cy * P + P * 0.25), max(2, int(P * 0.5))
    if x0 < 0 or y0 < 0: return np.zeros((0, 3))
    return im[y0:y0 + k, x0:x0 + k].reshape(-1, 3)

for idx, (Y0, Y1, X0, X1) in enumerate(boxes):
    best = None
    for P in np.arange(PMIN, PMAX + 1e-6, 0.1):
        for ox in np.arange(0, P, 1.0):
            for oy in np.arange(0, P, 1.0):
                v = [c.std(0).sum() for c in (cell(P, ox, oy, cx, cy)
                     for cy in range(int((Y0 - oy) / P), int((Y1 - oy) / P) + 1, 2)  # 빠르게: 한 칸 걸러 본다
                     for cx in range(int((X0 - ox) / P), int((X1 - ox) / P) + 1, 2)) if len(c)]
                v = float(np.mean(v))
                if best is None or v < best[0]: best = (v, P, ox, oy)
    _, P, ox, oy = best
    cy0, cy1, cx0, cx1 = int((Y0 - oy) / P) - 1, int((Y1 - oy) / P) + 1, int((X0 - ox) / P) - 1, int((X1 - ox) / P) + 1
    grid, allc = {}, {}
    for cy in range(cy0, cy1 + 1):
        for cx in range(cx0, cx1 + 1):
            c = cell(P, ox, oy, cx, cy)
            if not len(c): continue
            allc[(cx, cy)] = c = np.median(c, 0)
            if not bgish(c[None])[0]: grid[(cx, cy)] = c
    if NEAR:  # 칸 가운데가 '바깥 배경'이면 배경
        def outer(cx, cy):
            x0, y0, k = int(ox + cx * P + P * 0.25), int(oy + cy * P + P * 0.25), max(2, int(P * 0.5))
            m = outside[max(0, y0):y0 + k, max(0, x0):x0 + k]
            return m.size == 0 or m.mean() > 0.5
        grid = {k: v for k, v in allc.items() if not outer(*k)}
    xs = [c[0] for c in grid]; ys = [c[1] for c in grid]
    gx0, gy0, w, h = min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    # 색 모으기: 테두리(아주 어두움)는 한 색, 나머지는 차이 24 미만끼리 많이 쓴 색으로
    cols = [tuple(int(v) for v in c) for c in grid.values()]
    dark = [c for c in cols if sum(c) < 200]
    line = max(set(dark), key=dark.count) if dark else None
    reps = []
    for c in sorted(set(cols), key=lambda c: -cols.count(c)):
        if sum(c) < 200: continue
        if not any(sum(abs(a - b) for a, b in zip(c, r)) < 24 for r in reps): reps.append(c)
    out = Image.new('RGBA', (w, h))
    for (cx, cy), c in grid.items():
        c = tuple(int(v) for v in c)
        c = line if sum(c) < 200 else min(reps, key=lambda r: sum(abs(a - b) for a, b in zip(c, r)))
        out.putpixel((cx - gx0, cy - gy0), c + (255,))
    padded = Image.new('RGBA', (w + 20, h + 20)); padded.paste(out, (10, 10))  # 고칠 때 여유 (PNG넣기가 여백은 잘라 낸다)
    padded.save(os.path.join(OUT, f'칸_{idx}.png'))
    # 비교 그림
    px0, py0 = ox + gx0 * P, oy + gy0 * P
    crop = img.crop((int(px0), int(py0), int(px0 + w * P), int(py0 + h * P))); d = ImageDraw.Draw(crop)
    for i in range(w + 1): d.line([(i * P, 0), (i * P, h * P)], fill=(255, 0, 255))
    for j in range(h + 1): d.line([(0, j * P), (w * P, j * P)], fill=(255, 0, 255))
    Z = int(round(P)); big = Image.new('RGBA', (w * Z, h * Z), (90, 90, 110, 255)); big.alpha_composite(out.resize((w * Z, h * Z), Image.NEAREST))
    cmp = Image.new('RGB', (crop.width + big.width + 10, max(crop.height, big.height)), (40, 40, 50)); cmp.paste(crop, (0, 0)); cmp.paste(big.convert('RGB'), (crop.width + 10, 0))
    cmp.save(os.path.join(OUT, f'비교_{idx}.png'))
    print(f'#{idx}: 칸 {P:.1f}px, {w}×{h}칸, {len(reps) + (1 if line else 0)}색')
