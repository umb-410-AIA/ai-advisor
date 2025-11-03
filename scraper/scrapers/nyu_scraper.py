'''
NYU Course Catalog Scraper: Simply scrapes the NYU course catalog and outputs data into a JSON file

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


def scrape_nyu(progress_position: Optional[int] = None):  # Codex-added: position for nested tqdm.
    base_url = "https://bulletins.nyu.edu"
    subjects_url = f"{base_url}/courses/"
    response = requests.get(subjects_url)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    data = []

    # Step 1: find all subject links (each department)
    subjectLinks = soup.find_all("a", href=lambda href: href and href.startswith("/courses/"))

    tqdm_kwargs = {"desc": "NYU subjects", "unit": "dept", "leave": False}
    if progress_position is not None:
        tqdm_kwargs["position"] = progress_position

    for subject in tqdm(subjectLinks, **tqdm_kwargs):  # Codex-added: visualize subject scraping progress.
        fullUrl = urljoin(base_url, subject["href"])
        subjectResponse = requests.get(fullUrl)
        subjectSoup = BeautifulSoup(subjectResponse.text, "html.parser")

        courseBlocks = subjectSoup.find_all('div', class_="courseblock")
        for courseBlock in courseBlocks:
            classCode = courseBlock.find("span", class_="detail-code")
            classCodeText = classCode.getText(" ", strip=True) if classCode else ""

            classTitle = courseBlock.find("span", class_="detail-title")
            classTitleText = classTitle.getText(" ", strip=True) if classTitle else ""

            classCredits = courseBlock.find("span", class_="detail-hours")
            classCreditsText = classCredits.getText(" ", strip = True) if classCredits else ""

            classDescription = courseBlock.find("div", class_="courseblockextra")
            classDescriptionText = classDescription.getText(" ", strip=True) if classDescription else ""

            classGrading = courseBlock.find("span", class_="detail-grading")
            classGradingText = classGrading.getText(" ", strip=True) if classGrading else ""

            classRepeatable = courseBlock.find("span", class_="detail-repeatability")
            classRepeatableText = classRepeatable.getText(" ", strip=True) if classRepeatable else ""
            
            classPreReq = courseBlock.find("span", class_="detail-prerequisites")
            classPreReqText = classPreReq.getText(" ", strip=True) if classPreReq else ""

            classAntiReq = courseBlock.find("span", class_="detail-antirequisites")
            classAntiReqText = classAntiReq.getText(" ", strip=True) if classAntiReq else ""

            data.append({
                "Class Code": classCodeText,
                "Class Title": classTitleText,
                "Class Credits": classCreditsText,
                "Class Description": classDescriptionText,
                "Class Grading": classGradingText,
                "Class Repeatable": classRepeatableText,
                "Class Prerequisites": classPreReqText,
                "Class Antirequisities": classAntiReqText
            })
    return data
            
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

if __name__ == "__main__":
    courses = scrape_nyu()

    data_dir = PROJECT_ROOT / "data"
    data_dir.mkdir(parents=True,exist_ok=True)

    output_path = data_dir/"nyu_courses.json"
    output_path.write_text(
        json.dumps(courses,indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    
    print(f"Saved {len(courses)} courses to {output_path}")
