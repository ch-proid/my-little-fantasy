# -*- coding: utf-8 -*-
"""
도트 명암 정리: 재료마다 명암 4단계 이하 + 잡티 정리 (도트 규칙 3-1, 3-2)

 1. 테두리: 아주 어두운 색(L<24)은 모두 테두리 한 색으로.
 2. 재료 나누기: 색(색상·채도)이 비슷한 것끼리 묶는다. 밝기 차이는 덜 따진다 (같은 재료의 명암이니까).
 3. 재료마다 밝기로 4단계(밝음·기본·그늘·깊은 그늘)까지만 남긴다. 각 단계의 색은 원래 있던 색 중에서 고른다.
 4. 잡티: 같은 재료 안에서 둘레 8칸 중 같은 색이 하나도 없고 5칸 이상이 한 색이면 그 색으로.
    (눈·볼처럼 다른 재료의 작은 점은 건드리지 않는다)
쓰는 법: python 명암정리.py <입력.png> <출력.png> [단계수=4] [재료묶음거리=14]
"""
import sys
import numpy as np
from PIL import Image

SRC, DST = sys.argv[1], sys.argv[2]
LEVELS = int(sys.argv[3]) if len(sys.argv) > 3 else 4
MERGE = float(sys.argv[4]) if len(sys.argv) > 4 else 14  # 이 거리보다 가까운 색은 같은 재료
im = np.asarray(Image.open(SRC).convert('RGBA')).copy()
h, w = im.shape[:2]
op = im[..., 3] >= 128

def lab(c):
    c = np.asarray(c, np.float64) / 255.0; c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    X = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]])
    X = X / np.array([0.9505, 1.0, 1.089]); f = np.where(X > 0.008856, np.cbrt(X), 7.787 * X + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

cols, inv, cnt = np.unique(im[op][:, :3], axis=0, return_inverse=True, return_counts=True)
L = lab(cols)
idx = np.full((h, w), -1); idx[op] = inv.reshape(-1)
n = len(cols)

# 1. 테두리
outline = L[:, 0] < 24
out_col = cols[outline][cnt[outline].argmax()] if outline.any() else None

# 2. 재료 나누기 (색상·채도 거리 + 밝기는 0.35배만) — 가까운 것부터 합치는 방식
C = np.hypot(L[:, 1], L[:, 2])  # 채도
def dist(i, j):  # 채도가 크게 다르면(회색 대 선명한 파랑) 다른 재료로 본다
    return np.sqrt(((L[i, 0] - L[j, 0]) * 0.35) ** 2 + (L[i, 1] - L[j, 1]) ** 2 + (L[i, 2] - L[j, 2]) ** 2) + 0.8 * abs(C[i] - C[j])
groups = [[i] for i in range(n) if not outline[i]]
def gdist(a, b): return min(dist(i, j) for i in a for j in b)  # 가장 가까운 두 색 사이 (명암 사다리가 이어지게)
while True:
    best = (1e9, -1, -1)
    for x in range(len(groups)):
        for y in range(x + 1, len(groups)):
            d = gdist(groups[x], groups[y])
            if d < best[0]: best = (d, x, y)
    if best[0] > MERGE: break
    _, x, y = best; groups[x] += groups[y]; del groups[y]

# 3. 재료마다 밝기 단계 줄이기
remap = {}
for g in groups:
    g = sorted(g, key=lambda i: L[i, 0])
    if len(g) <= LEVELS:
        for i in g: remap[i] = i
        continue
    Ls = np.array([L[i, 0] for i in g]); wts = np.array([cnt[i] for i in g], float)
    cent = np.quantile(np.repeat(Ls, wts.astype(int)), np.linspace(0.08, 0.92, LEVELS))
    for _ in range(30):
        a = np.abs(Ls[:, None] - cent[None]).argmin(1)
        for k in range(LEVELS):
            if (a == k).any(): cent[k] = np.average(Ls[a == k], weights=wts[a == k])
    a = np.abs(Ls[:, None] - cent[None]).argmin(1)
    for k in range(LEVELS):
        mem = [g[t] for t in range(len(g)) if a[t] == k]
        if not mem: continue
        # 그 단계를 대표할 색: 단계 평균 밝기에 가깝고 많이 쓰인 원래 색
        rep = min(mem, key=lambda i: abs(L[i, 0] - cent[k]) - 0.02 * cnt[i])
        for i in mem: remap[i] = rep
for i in range(n):
    if outline[i]: remap[i] = -2  # 테두리

group_of = {}
for gi, g in enumerate(groups):
    for i in g: group_of[i] = gi
new = np.full((h, w), -1)
for y in range(h):
    for x in range(w):
        if idx[y, x] >= 0: new[y, x] = remap[idx[y, x]]

# 4. 잡티 (같은 재료 안에서만)
for _ in range(2):
    fixed = new.copy()
    for y in range(h):
        for x in range(w):
            c = new[y, x]
            if c < 0: continue
            nb = [new[yy, xx] for yy in range(y - 1, y + 2) for xx in range(x - 1, x + 2) if (yy, xx) != (y, x) and 0 <= yy < h and 0 <= xx < w]
            if c in nb: continue
            same = [v for v in nb if v >= 0 and group_of.get(v) == group_of.get(c)]
            if not same: continue
            vals, k = np.unique(same, return_counts=True)
            if k.max() >= 4: fixed[y, x] = vals[k.argmax()]
    new = fixed

out = np.zeros_like(im)
for y in range(h):
    for x in range(w):
        c = new[y, x]
        if c == -1: continue
        out[y, x, :3] = out_col if c == -2 else cols[c]; out[y, x, 3] = 255
Image.fromarray(out, 'RGBA').save(DST)
before, after = len(cols), len(set(new[new >= 0].tolist())) + (1 if (new == -2).any() else 0)
print(f'{SRC.split("/")[-1]}: {before}색 → {after}색 (재료 {len(groups)}개, 재료당 최대 {LEVELS}단계)')
