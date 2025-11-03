'''
Yale Course Catalog Scraper: Simply scrapes the Yale course catalog and outputs data into a JSON file

Author: Keertan Patel

AI Usage: AI was used to add progress bars to the programs. All locations that a change was made by ChatGPT Codex are commented with Codex-added and then a description of the addtion. 
'''
import requests
from bs4 import BeautifulSoup
import json
import os
from urllib.parse import urljoin
from pathlib import Path
from typing import Optional  # Codex-added: progress bar support hook.

from tqdm import tqdm  # Codex-added: tqdm integration for per-scraper bars.


def scrape_yale(progress_position: Optional[int] = None):  # Codex-added: position for nested tqdm.
    base_url = "https://catalog.yale.edu/"
    subjects_url = f"{base_url}/ycps/courses/"
    response = requests.get(subjects_url)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    data = []

    # Step 1: find all subject links (each department)
    subjectLinks = soup.find_all("a", href=lambda href: href and href.startswith("/ycps/courses/"))

    tqdm_kwargs = {"desc": "Yale subjects", "unit": "dept", "leave": False}
    if progress_position is not None:
        tqdm_kwargs["position"] = progress_position

    for subject in tqdm(subjectLinks, **tqdm_kwargs):  # Codex-added: visualize subject scraping progress.
        fullUrl = urljoin(base_url, subject["href"])
        subjectResponse = requests.get(fullUrl)
        subjectSoup = BeautifulSoup(subjectResponse.text, "html.parser")
        courseBlocks = subjectSoup.find_all("div", class_ = "courseblock")
        for courseBlock in courseBlocks:
            courseName = courseBlock.find('p', class_= "courseblocktitle")
            courseDescription = courseBlock.find('p', class_="courseblockdesc")
            courseNameText = courseName.get_text(" ", strip=True) if courseName else ""
            courseDescriptionText = courseDescription.get_text(" ", strip=True) if courseDescription else ""
            data.append({
                "Course Name": courseNameText,
                "Course Descrpition": courseDescriptionText
            })
    return data
            
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

if __name__ == "__main__":
    courses = scrape_yale()

    data_dir = PROJECT_ROOT / "data"
    data_dir.mkdir(parents=True,exist_ok=True)

    output_path = data_dir/"yale_courses.json"
    output_path.write_text(
        json.dumps(courses,indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    
    print(f"Saved {len(courses)} courses to {output_path}")
