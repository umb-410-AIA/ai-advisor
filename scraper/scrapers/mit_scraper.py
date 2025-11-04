'''
MIT Course Catalog Scraper: Simply scrapes the MIT course catalog and outputs data into a JSON file

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


def scrape_mit(progress_position: Optional[int] = None):  # Codex-added: position for nested tqdm.
    base_url = "https://catalog.mit.edu"
    subjects_url = f"{base_url}/subjects/"
    response = requests.get(subjects_url)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    data = []

    # Step 1: find all subject links (each department)
    subjectLinks = [urljoin(base_url, a["href"]) for a in soup.find_all("a", class_="sitemaplink")]

    tqdm_kwargs = {"desc": "MIT departments", "unit": "dept", "leave": False}
    if progress_position is not None:
        tqdm_kwargs["position"] = progress_position

    iterator = tqdm(subjectLinks, **tqdm_kwargs)  # Codex-added: visualize department scraping progress.

    for subject in iterator:
        subjectResponse = requests.get(subject)
        subjectSoup = BeautifulSoup(subjectResponse.text, "html.parser")
        courseBlocks = subjectSoup.find_all('div', class_ = 'courseblock')
        for courseBlock in courseBlocks:
            courseName = courseBlock.find('h4', class_="courseblocktitle")
            courseBlockPreReq = courseBlock.find('span', class_="courseblockprereq")
            courseBlockHours = courseBlock.find('span', class_="courseblockhours")
            courseBlockDescrption = courseBlock.find('p', class_="courseblockdesc")
            prereq_text = courseBlockPreReq.get_text(" ", strip=True) if courseBlockPreReq else ""
            description_text = courseBlockDescrption.get_text(" ", strip=True) if courseBlockDescrption else ""
            if courseName:
                data.append({
                    "Course Name": courseName.text,
                    "Course Hours": courseBlockHours.text,
                    "courseBlockPreReq": prereq_text,
                    "courseBlockDescrption": description_text
                })
    return data
            
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

if __name__ == "__main__":
    courses = scrape_mit()

    data_dir = PROJECT_ROOT / "data"
    data_dir.mkdir(parents=True,exist_ok=True)

    output_path = data_dir/"mit_courses.json"
    output_path.write_text(
        json.dumps(courses,indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    
    print(f"Saved {len(courses)} courses to {output_path}")
