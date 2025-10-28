"""
Name : build_catalog.py
Description : Scraper tool for pulling all the UMB course catalog, formatting it and saving it to JSON for RAG pipelines
Author : Blake Moody
Date : 11-8-2024
"""
from extract_urls import extract_urls
from urllib.request import urlopen
from bs4 import BeautifulSoup
from tqdm import tqdm
import json
import os
from datetime import datetime

COURSE_CATALOG_PATH = os.getenv('COURSE_CATALOG_DATA_PATH')
assert COURSE_CATALOG_PATH
COURSE_CATALOG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), COURSE_CATALOG_PATH))

semester_urls = [
    'https://courses.umb.edu/course_catalog/subjects/2026%20Spring',
]

catalog_data = {}

def extract_course_id(soup: BeautifulSoup) -> str:
    code = soup.find_all(name="h3")[-1]
    return "".join(code.text.split(": ")[-1].split())

def extract_course_title(soup: BeautifulSoup) -> str:
    content = soup.find_all(name="div", attrs={"id":"body-content"})[-1]
    return content.find_all(name="h2", attrs={"class": "page-title"})[-1].text

def extract_course_descriptors(soup: BeautifulSoup) -> dict[str, str]:
    content = soup.find_all(name="div", attrs={"id":"body-content"})[-1]
    return {s.text.split(":")[0].lower(): s.next_sibling.next_sibling for s in content.find_all(name="p")[-1].find_all(name="strong")}

def extract_course_sessions(soup: BeautifulSoup) -> list[dict[str, str]]:
    table = soup.find_all(name='table')[-1]
    rows = table.find_all(name="tr", attrs={"class":"class-info-rows"})
    extra_rows = table.find_all(name="tr", attrs={"class":"extra-info"})
    sessions = [{field.get('data-label').replace(" ", "_").lower(): "".join("".join(field.text.split("\t")).split("\n")) for field in row.find_all(name="td")} for row in rows]
    for i, row in enumerate(extra_rows):
        for field in row.find_all(name="span", attrs={"class":"class-div-header"}):
            sessions[i][field.text.split(":")[0].lower()] = "".join("".join(field.next_sibling.next_sibling.text.split("\t")).split("\n"))

    return sessions

if __name__ == "__main__":
    for semester_url in semester_urls:
        program_urls = extract_urls(semester_url, "course_catalog/courses")
        for program_url in tqdm(program_urls):
            course_urls = extract_urls(program_url, "course_info")
            for course_url in tqdm(course_urls):
                soup = BeautifulSoup(urlopen(course_url))
                course_id = extract_course_id(soup)
                catalog_data[course_id] = {
                    "id": course_id,
                    "title": extract_course_title(soup),
                    "course_descriptors": extract_course_descriptors(soup),
                    "sessions": extract_course_sessions(soup)
                }

    with open(os.path.join(COURSE_CATALOG_PATH, f"course-catalog-scraper-{datetime.today().strftime('%Y-%m-%d')}.json"), "w") as outfile: 
        json.dump(catalog_data, outfile, indent=4)
