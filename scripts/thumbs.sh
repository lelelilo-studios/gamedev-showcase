#!/usr/bin/env bash
# Make poster images: thumbs/<slug>.webp (1200 px wide) from a 1440×900 screenshot of each site.
#   scripts/thumbs.sh            all showcases + the index
#   scripts/thumbs.sh 03-joltphysics    just one
# Needs Node 22+, Google Chrome and ffmpeg. Full-size screenshots go to $GS_SCRATCH/thumbs-png.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${GS_SCRATCH:-}" ]; then if [ -d /data/scratch ]; then GS_SCRATCH=/data/scratch/gamedev-showcase; else GS_SCRATCH="${TMPDIR:-/tmp}/gamedev-showcase"; fi; fi
OUT="$GS_SCRATCH/thumbs-png"
mkdir -p "$OUT" thumbs

# Per-game options for a good poster moment (extra inspect.mjs flags), set into the EXTRA array.
# SHOT names a {"shot": ...} label from a --steps playtest to use instead of the first screenshot.
set_opts() {
  EXTRA=(--wait 5000); QUERY=""; SHOT=""
  case "$1" in
    # headless can't screenshot a WebGPU canvas directly; ?mirror copies each frame into a 2D canvas
    # Fire Pro needs shader-f16; Chrome on Linux + NVIDIA only offers it with the Dawn toggle below
    05-fire-pro) EXTRA=(--webgpu --wait 12000); QUERY="?mirror"
      export WEBGPU_FLAGS="${WEBGPU_FLAGS:---enable-unsafe-webgpu --enable-features=Vulkan --use-angle=vulkan --ignore-gpu-blocklist --enable-dawn-features=vulkan_enable_f16_on_nvidia}" ;;
    # the title sews a fresh chart over and over; wait until a patchwork one is finished
    07-wavefunctioncollapse) EXTRA=(--wait 1500 --steps '[{"eval":"new Promise(r => { const t0 = Date.now(), t = setInterval(() => { const s = document.body.innerText; if ((/Patchwork ·/.test(s) && /sewn (first time|after)/.test(s)) || Date.now() - t0 > 30000) { clearInterval(t); r(); } }, 100); })"},{"wait":600},{"shot":"poster"}]'); SHOT=poster ;;
    10-inkjs) EXTRA=(--wait 6000) ;;
  esac
}

shoot() {
  local slug=$1 path=$2
  set_opts "$slug"
  node scripts/inspect.mjs "$path$QUERY" --sizes 1440x900 --name "$slug" --out "$OUT" --hide "[data-specimen-tag]" "${EXTRA[@]}" > "$OUT/$slug.json"
  local png="$OUT/$slug-1440x900.png"; [ -n "$SHOT" ] && png="$OUT/$slug-1440x900-$SHOT.png"
  ffmpeg -loglevel error -y -i "$png" -vf "scale=1200:-2" -c:v libwebp -quality 80 "thumbs/$slug.webp"
  printf '%-26s %6s KB  errors: %s\n' "$slug" "$(( $(stat -c %s "thumbs/$slug.webp") / 1024 ))" \
    "$(python3 -I -c "import json,sys; print(json.load(open(sys.argv[1]))['errors'])" "$OUT/$slug.json")"
}

if [ $# -gt 0 ]; then
  for s in "$@"; do shoot "$s" "showcases/$s/"; done
else
  for d in showcases/*/; do s=$(basename "$d"); [ -f "$d/index.html" ] && shoot "$s" "$d"; done
  shoot index index.html
fi
