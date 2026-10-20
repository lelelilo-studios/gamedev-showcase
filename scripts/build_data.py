#!/usr/bin/env python3
"""Build data/showcases.js and showcases/*/TUTORIAL.md.

Inputs: data/tools.json (tool facts from the wiki), shared/HOUSE_RULES.md,
showcases/<slug>/PROMPT.md (the brief) and showcases/<slug>/meta.json (written by the builder).
Run from anywhere:  python3 -I scripts/build_data.py
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = "https://lelelilo-studios.github.io/gamedev-showcase"
REPO = "https://github.com/lelelilo-studios/gamedev-showcase"
SISTER = "https://lelelilo-studios.github.io/frontend-showcase/"

tools = json.loads((ROOT / "data/tools.json").read_text())
house = (ROOT / "shared/HOUSE_RULES.md").read_text().strip()
cats = {c["id"]: c for c in tools["categories"]}


def read(p):
    return p.read_text().strip() if p.exists() else ""


def steps_for(t, m):
    tool = t["tool"]
    skill = "skill" in t["kind"]
    s = ["Install Claude Code (`npm install -g @anthropic-ai/claude-code`) and sign in."]
    if skill:
        s.append(f"Get the {tool} skills with the commands in **Install**, and read their `SKILL.md` files before you use them.")
    else:
        s.append(f"Nothing to install for a quick start: the game loads {tool} from a CDN at a pinned version (see **Built with**). For a real project use the npm command in **Install**.")
    s.append("Give the agent a way to play its own game: Playwright MCP (`claude mcp add playwright npx @playwright/mcp@latest`), or `node scripts/inspect.mjs` from this repo, whose `--steps` option plays a scripted round with real key presses, clicks and taps and screenshots it.")
    s.append("Make an empty folder, open a terminal in it and run `claude`.")
    s.append("Paste the full prompt from **Prompt** (the brief followed by the house rules). Outside this repo, drop the line about `shared/tag.js`; it only adds this collection's corner label.")
    s.append("Let it build, then ask it to play a full round, from the title screen to the end screen, at desktop and phone sizes, look at the screenshots and fix what's off. Ask for the `window.__game` test hooks early: they let it replay a seed and check that inputs really change the game.")
    s.append("Expect a different game from the one here: the same prompt gives a new design each run. Read **Notes** for the snags this build hit.")
    return s


def tutorial_md(t, m, prompt):
    title = m.get("title") or t["tool"]
    repo_url = f"https://github.com/{t['repo']}" if t.get("repo") else ""
    out = [f"# How to recreate cartridge {t['no']}: {title}", ""]
    out.append(f"**Tool:** {t['tool']} ({t['kind']})" + (f" · [{t['repo']}]({repo_url})" if repo_url else ""))
    out.append(f"**Play it:** {PAGES}/showcases/{t['slug']}/")
    if t.get("lib_repo"):
        out.append(f"**Browser build:** [{t['lib_repo']}](https://github.com/{t['lib_repo']})")
    out.append("")
    out.append(m.get("summary") or t["why"])
    out += ["", "## Steps", ""]
    out += [f"{i}. {x}" for i, x in enumerate(steps_for(t, m), 1)]
    out += ["", "## Install", ""]
    for c in t["install"]:
        out += [f"{c['label']}:", "", "```", c["cmd"], "```", ""]
    out += ["## Prompt", "", "The exact brief the builder received:", "", "````markdown", prompt, "````", "",
            "It also received the house rules, pasted after the brief:", "", "````markdown", house, "````", "",
            f"and the repo's operating instructions ([docs/BUILD.md]({REPO}/blob/main/docs/BUILD.md)), which cover file paths and screenshot checks, not design.", ""]
    ctr = m.get("controls") or []
    if ctr:
        out += ["## Controls", "", "| Action | Keyboard and mouse | Touch |", "|---|---|---|"]
        out += [f"| {c.get('action', '')} | {c.get('keys', '')} | {c.get('touch', '')} |" for c in ctr]
        out.append("")
    libs = m.get("libraries") or []
    if libs:
        out += ["## Built with", ""]
        out += [f"- {l.get('name')} {l.get('version', '')}" + (f": {l['url']}" if l.get("url") else "") for l in libs]
        out.append("")
    if m.get("fonts"):
        out += [f"Fonts: {', '.join(m['fonts'])} (Google Fonts)", ""]
    if m.get("skill_files_read"):
        srepo = t.get("skill_repo") or t.get("repo")
        out += ["## Skill files the builder read", ""]
        ref = t.get("skill_ref") or "main"
        out += [f"- [{p}](https://github.com/{srepo}/blob/{ref}/{p})" for p in m["skill_files_read"]]
        out += ["", f"They were downloaded as plain text at commit `{ref[:7]}` and reviewed first; nothing from the skill repo was installed or run.", ""]
    notes = m.get("lessons") or []
    if notes or m.get("deviations"):
        out += ["## Notes from the build", ""]
        out += [f"- {x}" for x in notes]
        if m.get("deviations"):
            out += ["", f"Departures from the brief: {m['deviations']}"]
        out.append("")
    if t.get("caveats"):
        out += ["## Caveats", ""] + [f"- {x}" for x in t["caveats"]] + [""]
    stars = (f"{t['stars']:,} stars " + (t.get("stars_note") or f"on {tools['snapshot']}")) if t.get("stars") else ""
    out += ["## Source facts", "",
            f"- Licence: {t['license']}" + (f" · {stars}" if stars else ""),
            f"- Browser support: {m.get('browser_support', 'any modern browser')}",
            f"- Checked: {m.get('checked', '')}", ""]
    return "\n".join(out)


items = []
for t in tools["tools"]:
    d = ROOT / "showcases" / t["slug"]
    prompt = read(d / "PROMPT.md")
    meta_p = d / "meta.json"
    m = json.loads(meta_p.read_text()) if meta_p.exists() else {}
    if not m.get("title"):
        q = re.search(r'"([^"]+)"', prompt)
        m["title"] = q.group(1) if q else t["tool"]
    (d / "TUTORIAL.md").write_text(tutorial_md(t, m, prompt) + "\n")
    srepo = t.get("skill_repo") or t.get("repo")
    items.append({
        **{k: t.get(k) for k in ("no", "slug", "tool", "kind", "category", "repo", "lib_repo", "homepage", "stars", "stars_note", "license", "why", "install", "caveats", "skill_ref")},
        "category_name": cats[t["category"]]["name"],
        "skill_repo": srepo if "skill" in t["kind"] else None,
        "title": m.get("title"),
        "tagline": m.get("tagline", ""),
        "summary": m.get("summary", t["why"]),
        "libraries": m.get("libraries", []),
        "fonts": m.get("fonts", []),
        "palette": m.get("palette", []),
        "controls": m.get("controls", []),
        "features": m.get("features", []),
        "skill_files_read": m.get("skill_files_read", []),
        "lessons": m.get("lessons", []),
        "deviations": m.get("deviations", ""),
        "browser_support": m.get("browser_support", ""),
        "checked": m.get("checked", ""),
        "prompt": prompt,
        "steps": steps_for(t, m),
        "thumb": f"thumbs/{t['slug']}.webp",
        "href": f"showcases/{t['slug']}/",
        "ready": meta_p.exists(),
    })

payload = {"snapshot": tools["snapshot"], "categories": tools["categories"], "house_rules": house,
           "pages": PAGES, "repo": REPO, "sister": SISTER, "items": items}
js = "// Generated by scripts/build_data.py. Edit data/tools.json, PROMPT.md or meta.json instead.\n"
js += "window.SHOWCASES = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n"
(ROOT / "data/showcases.js").write_text(js)
print(f"{len(items)} showcases, {sum(i['ready'] for i in items)} with meta.json")


# ── README.md and CREDITS.md ──────────────────────────────────────────────
rows = []
for it in items:
    repo = f"[{it['repo']}](https://github.com/{it['repo']})" if it["repo"] else "no repo"
    rows.append(f"| {it['no']} | [{it['title']}]({PAGES}/showcases/{it['slug']}/) | {it['tool']} · {repo} | {it['kind']} | [how to recreate](showcases/{it['slug']}/TUTORIAL.md) |")
readme = f"""# The Cartridge Shelf

**Ten game-dev tools, each made into a game you can play.**
Play: **{PAGES}/**

Ten game-development libraries and agent skill packs, picked from a personal research wiki of saved tools: physics, destruction, fire, navigation, procedural maps, level geometry, level of detail, narrative scripting, and two skill packs that make a coding agent work like a game team. Each one became an original browser game built with the tool by Claude Code, and each comes with the exact prompt that made it and the steps to make it again. Open the shelf, pick a cartridge, press **Manual**.

| Cart | Game | Tool | Kind | Recreate |
|---|---|---|---|---|
""" + "\n".join(rows) + f"""

The sister collection, [Front-End Cabinet]({SISTER}), does the same for twenty front-end tools.

## How it was made

One Claude Code session (Claude Opus 5.5) chose the tools, wrote a brief for each game and ran ten builder agents in parallel, one game each. Every builder got the game's brief (`showcases/<slug>/PROMPT.md`), the shared [house rules](shared/HOUSE_RULES.md) and the repo's [operating instructions](docs/BUILD.md). For the two skill packs, the skills' own text was downloaded at a fixed commit, reviewed and followed; nothing from those repos was installed or run. Every game was played in headless Chrome at 1440×900 and 390×844 with [`scripts/inspect.mjs`](scripts/inspect.mjs), whose `--steps` option drives a round with real key presses, clicks, taps and drags, and every game exposes `window.__game` hooks so a seed and its inputs can be replayed.

## Run it locally

No build step. Serve the folder and open it:

```
python3 -m http.server 8000
# then open http://localhost:8000/
```

Most games also open straight from disk. Fire Pro's game (05) needs a browser with WebGPU. `node scripts/inspect.mjs showcases/03-joltphysics/` screenshots a game and lists console errors (needs Node 22+ and Google Chrome).

## Layout

```
index.html, assets/        the shelf and the instruction booklets
data/tools.json            tool facts from the wiki (stars and licences as of {tools['snapshot']})
data/showcases.js          generated: everything the index shows
showcases/NN-slug/         one game per folder: index.html, PROMPT.md, TUTORIAL.md, meta.json
shared/                    house rules and the corner label every game loads
scripts/                   build_data.py (regenerates data, tutorials, README, credits), inspect.mjs, thumbs.sh
thumbs/                    poster images
```

After editing a brief, `meta.json` or `data/tools.json`, run `python3 -I scripts/build_data.py`.

## Fine print

An independent, unofficial showcase: not affiliated with or endorsed by the makers of any tool here. Every place, character and company in the games is fictional. This repo's code is MIT licensed ([LICENSE](LICENSE)); the tools and libraries keep their own licences ([CREDITS.md](CREDITS.md)).
"""
(ROOT / "README.md").write_text(readme)

cred = ["# Credits", "",
        "The games load these tools and libraries from public CDNs at pinned versions. They keep their own licences; this repo's MIT licence covers only the code written here.", ""]
for it in items:
    cred.append(f"## {it['no']} · {it['title']}")
    cred.append("")
    cred.append(f"- Tool: {it['tool']}" + (f" ([{it['repo']}](https://github.com/{it['repo']}))" if it["repo"] else "") + f", licence: {it['license']}")
    if it.get("lib_repo"):
        cred.append(f"- Browser build: [{it['lib_repo']}](https://github.com/{it['lib_repo']})")
    for l in it["libraries"]:
        cred.append(f"- Library: {l.get('name')} {l.get('version', '')}")
    if it["fonts"]:
        cred.append(f"- Fonts: {', '.join(it['fonts'])}, served by Google Fonts under their own licences (mostly the SIL Open Font License)")
    if it["skill_files_read"]:
        cred.append(f"- Followed the text of the skills in [{it['skill_repo'] or it['repo']}](https://github.com/{it['skill_repo'] or it['repo']}) (MIT) at commit `{(it.get('skill_ref') or 'main')[:7]}`")
    extra = ROOT / "showcases" / it["slug"] / "CREDITS.md"
    if extra.exists():
        cred.append(f"- More credits, including images: [showcases/{it['slug']}/CREDITS.md](showcases/{it['slug']}/CREDITS.md)")
    cred.append("")
cred += ["## Index", "", "- Fonts: Bricolage Grotesque, Schibsted Grotesk and Martian Mono, served by Google Fonts (SIL Open Font License).", ""]
(ROOT / "CREDITS.md").write_text("\n".join(cred))
print("README.md and CREDITS.md written")
