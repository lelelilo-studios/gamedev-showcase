# Playtest plan for Hold the Cold, seed 20261019: writes pt-desktop.json and pt-phone.json,
# step files for scripts/inspect.mjs --steps (real clicks, keys, taps and long-presses, synced
# to the game clock by small in-page waits). Written for the 2026-10-19 scripted playtest.
import json, sys
POS = {
 'desktop': {'bay0':[606,676],'bay1':[753,676],'bay2':[901,676],'gen':[720,450],'shed':[496,234],'play':[154,546],'pause':[1392,46]},
 'phone':   {'bay0':[123,563],'bay1':[216,563],'bay2':[310,563],'gen':[195,420],'shed':[53,283],'play':[127,541],'pause':[360,30],'work':[330,785]},
}
def build(kind):
    P = POS[kind]; S = []
    touch = kind == 'phone'
    def ev(js): S.append({'eval': js})
    def probe(js, name): S.append({'probe': js, 'as': name})
    def shot(n): S.append({'shot': n})
    def walk(st):
        if touch: S.append({'tap': P[st]})
        else: S.append({'click': P[st]})
        ev("__wf(function(){return __at('%s')}, 16000)" % st)
    def hold(ms):
        if touch: S.append({'drag': [P['work'], P['work']], 'ms': 40, 'touch': True, 'hold': ms})
        else: S.append({'key': 'Space', 'hold': ms})
    def press():
        if touch: S.append({'tap': P['work']})
        else: S.append({'press': 'Space'})
    def until(t): ev("__wf(function(){return __S().t >= %s || __S().result}, 120000)" % t)
    def cycle():
        for b in ('bay0','bay1','bay2'):
            walk(b); hold(1700)
    def fuel(n, crank_after=False):
        walk('shed'); hold(800)
        if n == 1: shot('outside-with-can')
        probe("JSON.stringify({t:__S().t, carrying:__S().carrying, warmth:__S().warmth})", 'fuel%d-pickup' % n)
        walk('gen'); hold(1300)
        probe("JSON.stringify({t:__S().t, fuel:__S().gen.fuel, cans:__S().stats.cans, stalled:__S().stalled})", 'fuel%d-poured' % n)
    def crank(n):
        walk('gen')
        ev("__wf(function(){return __S().stalled || __S().result}, 9000)")
        if n == 1: shot('stalled-crank')
        for i in range(6):
            ev("__wf(function(){return !__S().stalled || Math.abs(__game.debug.needle())<0.1}, 3000)")
            press(); S.append({'wait': 140})
        probe("JSON.stringify({t:__S().t, running:__S().gen.running, stalled:__S().stalled, restarts:__S().stats.restarts, collection:__S().collection})", 'crank%d' % n)
    # helpers in the page
    ev("window.__wf=function(fn,ms){return new Promise(function(r){var t0=performance.now();(function w(){var v=false;try{v=fn()}catch(e){}if(v||performance.now()-t0>ms)r(!!v);else setTimeout(w,15)})()})};"
       "window.__S=function(){return __game.snapshot()};"
       "window.__at=function(id){var s=__S(),st={bay0:[184,2],bay1:[334,2],bay2:[484,2],gen:[300,1],shed:[72,0]}[id];return s.keeper.floor===st[1]&&Math.abs(s.keeper.x-st[0])<0.6};"
       "try{localStorage.removeItem('hold-the-cold:best')}catch(e){}")
    probe("JSON.stringify({state:__game.state(), seed:__game.seed})", 'title')
    if touch: S.append({'tap': P['play']})
    else: S.append({'click': P['play']})
    S.append({'wait': 300})
    probe("JSON.stringify({state:__game.state(), t:__S().t, demo:__S().demo})", 'started')
    walk('bay0'); hold(1700); shot('first-scrape')
    walk('bay1'); hold(1700); walk('bay2'); hold(1700)
    for i in range(4): cycle()
    until(56)
    fuel(1)
    cycle()
    probe("JSON.stringify({t:__S().t, collection:__S().collection, fuel:__S().gen.fuel})", 'before-stall1')
    crank(1)
    if not touch:
        S.append({'key': 'ArrowDown', 'hold': 2600})       # keys only: down the hall to the ladder and down it
        S.append({'key': 'ArrowRight', 'hold': 700})
    for i in range(3): cycle()
    probe("JSON.stringify({t:__S().t, storm:__S().storm, collection:__S().collection, bays:__S().bays})", 'peak')
    shot('peak-storm')
    fuel(2)
    crank(2)
    for i in range(3): cycle()
    crank(3)
    until(217)
    S.append({'wait': 600})
    probe("JSON.stringify({state:__game.state(), result:__S().result, score:__S().score, bays:__S().bays.map(function(b){return b.accessions}), stats:__S().stats, best:localStorage.getItem('hold-the-cold:best')})", 'end')
    shot('end-screen')
    # Play again, then pause and resume by the visible controls
    if touch:
        ev("(function(){var r=document.querySelector('[data-k=again]').getBoundingClientRect();window.__again=[r.x+r.width/2,r.y+r.height/2]})()")
    probe("JSON.stringify(window.__again||null)", 'againAt')
    return S
for kind in ('desktop','phone'):
    json.dump(build(kind), open('pt-%s.json' % kind, 'w'), indent=0)
    print(kind, len(build(kind)), 'steps')
