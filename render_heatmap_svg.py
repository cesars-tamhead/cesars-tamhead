"""Render the profile's blue-and-maize calendar from fetched contribution data."""
import json
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PALETTE = ["#14243a", "#004c99", "#367caf", "#c0b75d", "#ffcb05"]


def render(days):
    by_date = {item["date"]: item for item in days}
    if not by_date:
        raise ValueError("Cannot render an empty contribution calendar")
    first = date.fromisoformat(min(by_date))
    start = first - timedelta(days=(first.weekday() + 1) % 7)
    end = date.fromisoformat(max(by_date))
    columns = (end - start).days // 7 + 1
    total = sum(int(item.get("count", 0)) for item in by_date.values())
    width, height = 860, 226
    left, top = 57, 78
    pitch = (width - left - 25) / columns
    size = pitch - 2.5
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">',
        '<title id="title">Contribution activity</title>',
        f'<desc id="desc">{total:,} contributions from {first.isoformat()} to {end.isoformat()}. Blue and maize indicate increasing contribution levels.</desc>',
        '<rect width="860" height="226" fill="#0b1829"/>',
        '<g font-family="Arial,Helvetica,sans-serif" font-weight="400">',
        '<text x="26" y="36" fill="#ffcb05" font-size="21">Contribution activity</text>',
        f'<text x="834" y="36" text-anchor="end" fill="#b6c7de" font-size="13">{total:,} contributions in the last year</text>',
    ]
    for row, label in [(1, "Mon"), (3, "Wed"), (5, "Fri")]:
        parts.append(f'<text x="26" y="{top + row * pitch + size * .8:.2f}" fill="#b6c7de" font-size="12">{label}</text>')
    previous_month = None
    for week in range(columns):
        day = start + timedelta(weeks=week)
        if day.month != previous_month:
            if week < columns - 2:
                parts.append(f'<text x="{left + week * pitch:.2f}" y="63" fill="#b6c7de" font-size="12">{day:%b}</text>')
            previous_month = day.month
    for iso, item in sorted(by_date.items()):
        day = date.fromisoformat(iso)
        week, row = (day - start).days // 7, (day.weekday() + 1) % 7
        level = max(0, min(4, int(item.get("level", 0))))
        count = int(item.get("count", 0))
        parts.append(f'<rect x="{left + week * pitch:.2f}" y="{top + row * pitch:.2f}" width="{size:.2f}" height="{size:.2f}" rx="2" fill="{PALETTE[level]}" data-date="{iso}" data-count="{count}"><title>{count} contributions on {iso}</title></rect>')
    parts.append('<text x="26" y="207" fill="#e4edf8" font-size="12">GitHub</text>')
    parts.append('<text x="657" y="207" fill="#b6c7de" font-size="12">Less</text>')
    for index, color in enumerate(PALETTE):
        parts.append(f'<rect x="{693 + index * 16}" y="196" width="12" height="12" rx="2" fill="{color}"/>')
    parts.extend(['<text x="780" y="207" fill="#b6c7de" font-size="12">More</text>', '</g>', '</svg>'])
    return "\n".join(parts) + "\n"


if __name__ == "__main__":
    data = json.loads((ROOT / "data/contributions.json").read_text(encoding="utf-8"))
    (ROOT / "contrib-heatmap.svg").write_text(render(data["days"]), encoding="utf-8")
