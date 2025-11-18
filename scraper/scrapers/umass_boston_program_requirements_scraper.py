import requests
from bs4 import BeautifulSoup
import json
from urllib.parse import urljoin
from pathlib import Path


def scrape_umass_boston_programs():
    base_url = "https://www.umb.edu"
    programs_url = f"{base_url}/academics/program-finder/"
    session = requests.Session()

    def fetch_page(url: str):
        response = session.get(url)
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")

    def extract_program_links(soup: BeautifulSoup):
        return [
            urljoin(base_url, a["href"])
            for a in soup.select("a.button-program[href]")
        ]

    soup = fetch_page(programs_url)
    program_links = extract_program_links(soup)

    pagination = soup.select_one("nav.pagination")
    max_page = 1
    if pagination:
        for link in pagination.select("a[href]"):
            text = link.get_text(strip=True)
            if text.isdigit():
                max_page = max(max_page, int(text))

    def extract_curriculum(soup: BeautifulSoup):
        accordion = soup.select("div.accordion details")
        for section in accordion:
            header = section.select_one("summary h3")
            if not header:
                continue
            if header.get_text(strip=True).lower().startswith("curriculum"):
                content = section.find("div", class_="content")
                if content:
                    return content.get_text("\n", strip=True)
        return None

    for page in range(2, max_page + 1):
        page_soup = fetch_page(f"{programs_url}?page={page}")
        program_links.extend(extract_program_links(page_soup))

    data = []
    for program_link in program_links:
        program_soup = fetch_page(program_link)
        program_name = program_soup.find("div", class_="hero__title")
        program_name_text = program_name.get_text(" ", strip=True) if program_name else ""
        curriculum = extract_curriculum(program_soup)
        data.append(
            {
                "program_name": program_name_text,
                "url": program_link,
                "curriculum": curriculum,
            }
        )
        print(f"{program_name_text} -> curriculum found: {bool(curriculum)}")

    return data

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

if __name__ == "__main__":
    program_requirements = scrape_umass_boston_programs()
    data_dir = PROJECT_ROOT / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    output_path = data_dir / "umb_program_cirriculums.json"
    output_path.write_text(
        json.dumps(program_requirements, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Saved curriculum data for {len(program_requirements)} programs to {output_path}")
