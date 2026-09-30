# -*- coding: utf-8 -*-
"""
되살린 도트가 원본보다 가로·세로로 늘어났는지 잰다.
우리 PNG의 실루엣을 원본 크기로 키워 원본 실루엣에 겹쳐 보며, 가장 잘 겹치는 가로 배율·세로 배율을 찾는다.
세로 배율 / 가로 배율 이 1보다 크면 세로로 늘어난 것.
쓰는 법: python 비율검사.py <원본.png> <칸크기> <상자JSON> <PNG들 JSON>
"""
import sys, json
import numpy as np
from PIL import Image

SRC, P, BOXES, PNGS = sys.argv[1], float(sys.argv[2]), json.loads(sys.argv[3]), json.loads(sys.argv[4])
im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
bg = np.median(np.concatenate([im[:30, :30], im[:30, -30:]]).reshape(-1, 3), 0)
sim = np.sqrt(((im - bg) ** 2).sum(2)) <= 38
m = np.zeros_like(sim); m[0, :] = sim[0, :]; m[-1, :] = sim[-1, :]; m[:, 0] = sim[:, 0]; m[:, -1] = sim[:, -1]
while True:
    n = m.copy(); n[1:] |= m[:-1]; n[:-1] |= m[1:]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]; n &= sim
    if (n == m).all(): break
    m = n
FG = ~m

def iou(a, b):
    return (a & b).sum() / max(1, (a | b).sum())

for (x0, y0, x1, y1), path in zip(BOXES, PNGS):
    ref = FG[y0:y1, x0:x1]
    ours = np.asarray(Image.open(path).convert('RGBA'))[..., 3] > 127
    best = (0, 1, 1, 0, 0)
    for sx in np.arange(0.8, 1.21, 0.02):
        for sy in np.arange(0.8, 1.21, 0.02):
            w, h = int(round(ours.shape[1] * P * sx)), int(round(ours.shape[0] * P * sy))
            if w >= ref.shape[1] or h >= ref.shape[0]: continue
            big = np.asarray(Image.fromarray(ours.astype(np.uint8) * 255).resize((w, h), Image.NEAREST)) > 127
            # 발밑(아래 15%)은 풀·그림자가 섞여 있어 빼고 겹친다
            cut = int(h * 0.85)
            for oy in range(0, ref.shape[0] - h, 4):
                for ox in range(0, ref.shape[1] - w, 4):
                    s = iou(ref[oy:oy + cut, ox:ox + w], big[:cut])
                    if s > best[0]: best = (s, sx, sy, ox, oy)
    s, sx, sy, _, _ = best
    print(f'{path.split("/")[-1][:-4]}: 겹침 {s:.2f}, 가로 {sx:.2f}배 세로 {sy:.2f}배 → 세로 늘어남 {100 * (sx / sy - 1):+.0f}%')
