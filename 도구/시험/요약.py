# -*- coding: utf-8 -*-
# 진행 시험 결과 폴더를 묶음(이름_s씨앗)별로 요약한다:  python 도구/시험/요약.py <결과 폴더> [자세히]
import glob, json, os, re, statistics as st, sys
folder = sys.argv[1]; detail = len(sys.argv) > 2
groups = {}
for f in sorted(glob.glob(os.path.join(folder, '*.json'))):
    d = json.load(open(f, encoding='utf-8'))
    if 'end' not in d: continue
    groups.setdefault(re.sub(r'_s\d+$', '', os.path.splitext(os.path.basename(f))[0]), []).append(d)
def med(xs): return st.median(xs) if xs else '-'
def p90(xs): xs = sorted(xs); return xs[min(len(xs) - 1, int(len(xs) * 0.9))] if xs else '-'
print(f"{'묶음':<14}{'단계 중앙/P10':<14}{'레벨':<6}{'사망':<5}{'보스 승/시도':<12}{'실패(시간/사망)':<16}{'골드 수입/지출':<18}{'드롭 0/1/2/3/4':<18}{'판타':<5}{'첫보스(초)':<10}지역 진입(분)")
for name, L in groups.items():
    stg = [d['end']['stageN'] for d in L]
    stgs = sorted(stg); p10 = stgs[max(0, int(len(stgs) * 0.1))]
    drops = [sum(d['drops'][g] for d in L) // len(L) for g in range(5)]
    reg = {}
    for d in L:
        for r, t in d['regionAt'].items(): reg.setdefault(r, []).append(round(t / 60))
    regs = ' '.join(f"{r}:{med(v)}" for r, v in sorted(reg.items(), key=lambda x: int(x[0])))
    print(f"{name:<14}{str(med(stg)) + '/' + str(p10):<14}{med([d['end']['lv'] for d in L]):<6}{med([d['deaths'] for d in L]):<5}{str(sum(d['boss']['wins'] for d in L)) + '/' + str(sum(d['boss']['tries'] for d in L)):<12}{str(sum(d['boss']['failTime'] for d in L)) + '/' + str(sum(d['boss']['failDead'] for d in L)):<16}{str(med([d['gold']['earned'] for d in L])) + '/' + str(med([d['gold']['spent'] for d in L])):<18}{'/'.join(map(str, drops)):<18}{sum(d['fantasia'] for d in L):<5}{str(med([round(d['boss']['firstWinAt'] or 0) for d in L])):<10}{regs}")
    if detail:
        d = L[0]; e = d['end']
        print('   끝:', e['stage'], 'Lv', e['lv'], 'dps', e['dps'], 'hp', e['hp'], 'def', e['def'], '등급', e['eqGrades'], '강화', e['enh'], '어빌', e['abLv'], '가방', e['bag'], '골드', e['gold'], '남은 점수', e['pts'])
        print('   분별 단계:', ' '.join(f"{s['m']}:{s['st']}" for s in d['samples'] if s['m'] % 5 == 0))
        print('   사건:', '; '.join(f"{t // 60}분 {m}" for t, m in d['events'][:14]))
