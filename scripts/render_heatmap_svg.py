import json
from datetime import date, datetime, timedelta
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data_path = root / "data" / "contributions.json"
raw = json.loads(data_path.read_text(encoding="utf-8")) if data_path.exists() else {"days": []}
by_date = {d["date"]: d for d in raw.get("days", [])}
today = date.today()
start = today - timedelta(days=364 + today.weekday())
palette = ["#142C3D", "#365F7B", "#4F83A7", "#FFCB05", "#FFD94A"]
size, gap, left, top = 11, 4, 44, 68
width, height = 860, 190
parts = [
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
    '<rect width="100%" height="100%" rx="14" fill="#001b2e"/>',
    '<rect x="1" y="1" width="858" height="188" rx="13" fill="none" stroke="#FFCB05" stroke-width="2"/>',
    '<style>text{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.day{opacity:0;transform:translateY(8px);animation:reveal .3s forwards}@keyframes reveal{to{opacity:1;transform:translateY(0)}}</style>',
    '<text x="24" y="32" fill="#FFCB05" font-size="17" font-weight="700">$ ./contributions.sh</text>',
    '<text x="24" y="51" fill="#78A9D4" font-size="11">consistency compounds — one square at a time</text>',
]
total = 0
for i in range(371):
    day = start + timedelta(days=i)
    if day > today:
        continue
    week = i // 7
    dow = day.weekday()
    item = by_date.get(day.isoformat(), {})
    level = min(4, int(item.get("level", 0)))
    total += int(item.get("count", 0))
    x, y = left + week * (size + gap), top + dow * (size + gap)
    parts.append(f'<rect class="day" x="{x}" y="{y}" width="{size}" height="{size}" rx="2" fill="{palette[level]}" style="animation-delay:{(week+dow)*.012:.3f}s"/>')
parts += [
    f'<text x="24" y="171" fill="#E6EEF4" font-size="12">{total:,} contributions in the last year</text>',
    '<text x="695" y="171" fill="#78A9D4" font-size="11">Less</text>',
]
for i, color in enumerate(palette):
    parts.append(f'<rect x="730" y="161" width="10" height="10" rx="2" fill="{color}"/>')
    parts[-1] = parts[-1].replace('x="730"', f'x="{730+i*15}"')
parts += ['<text x="808" y="171" fill="#78A9D4" font-size="11">More</text>', '</svg>']
(root / "contrib-heatmap.svg").write_text("\n".join(parts), encoding="utf-8")

