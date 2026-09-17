import json
import re
from pathlib import Path
import requests
from bs4 import BeautifulSoup

USERNAME = "cesars-tamhead"
url = f"https://github.com/users/{USERNAME}/contributions"
response = requests.get(url, timeout=30, headers={"User-Agent": "profile-readme-refresh"})
response.raise_for_status()
soup = BeautifulSoup(response.text, "html.parser")
days = []
for cell in soup.select("[data-date]"):
    date = cell.get("data-date")
    level = int(cell.get("data-level", 0))
    tip = soup.select_one(f'tool-tip[for="{cell.get("id", "")}"]')
    match = re.search(r"([\d,]+) contribution", tip.get_text(" ", strip=True) if tip else "")
    count = int(match.group(1).replace(",", "")) if match else 0
    if date:
        days.append({"date": date, "level": level, "count": count})

if not days:
    raise RuntimeError("No contribution cells found")

target = Path(__file__).resolve().parents[1] / "data" / "contributions.json"
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps({"username": USERNAME, "days": days}, indent=2), encoding="utf-8")
