"""
Source: ChatGPT Codex

Prompt: Write a main.py to run all scrapers I wrote at once. Include a progress bar using tqdm inorder to help visualize the process. 
"""

import json
from pathlib import Path
from typing import Callable, Dict, List, Optional  # Codex-added: supports passing tqdm position hints.

from scrapers.mit_scraper import scrape_mit
from scrapers.nyu_scraper import scrape_nyu
from scrapers.upenn_scraper import scrape_upenn
from scrapers.yale_scraper import scrape_yale
from tqdm import tqdm  # Codex-added: master progress visualization.


ScraperFunc = Callable[[Optional[int]], List[Dict[str, str]]]


SCRAPERS: Dict[str, ScraperFunc] = {
    "mit": scrape_mit,
    "nyu": scrape_nyu,
    "upenn": scrape_upenn,
    "yale": scrape_yale,
}


def run_all_scrapers() -> None:
    project_root = Path(__file__).resolve().parent.parent
    data_dir = project_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    items = list(SCRAPERS.items())
    for idx, (school, scraper) in enumerate(
        tqdm(items, desc="Scraping", unit="site", leave=False), start=1
    ):  # Codex-added: drive individual progress bars with stable ordering.
        tqdm.write(f"Running {school.upper()} scraper...")
        try:
            courses = scraper(progress_position=idx)  # Codex-added: hand off position to nested tqdm.
        except Exception as exc:
            tqdm.write(f"⚠️  Failed to scrape {school.upper()}: {exc}")
            continue

        output_path = data_dir / f"{school}_courses.json"
        output_path.write_text(
            json.dumps(courses, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        tqdm.write(f"✅  Saved {len(courses)} courses to {output_path}")


if __name__ == "__main__":
    run_all_scrapers()
