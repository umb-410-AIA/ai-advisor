"""
Author: Keertan Patel

Simple script that filters the data in the umass boston course catalog to have only the CS courses and outputs into a new file tha has all umb cs courses. 

"""


import json

DEFAULT_INPUT_FILE = "../data/UMASS_BOSTON_coursecatalogstructured.json"
DEFAULT_OUTPUT_FILE = "../data/UMASS_BOSTON_CS_courses.json"

def filter_cs_courses(input_file=DEFAULT_INPUT_FILE, output_file=DEFAULT_OUTPUT_FILE):
    with open(input_file, 'r', encoding= "utf-8") as infile:
        courses = json.load(infile)

    cs_courses = []

    for course in courses:
        if not isinstance(course, dict):
            continue
        courseid = str(course.get("courseid", ""))

        if courseid.startswith("CS") and not courseid.startswith("CSP"):
            cs_courses.append(course)

    with open(output_file, "w", encoding="utf-8") as outfile:
        json.dump(cs_courses, outfile, indent=2, ensure_ascii= False)



if __name__ == "__main__":
    filter_cs_courses()
