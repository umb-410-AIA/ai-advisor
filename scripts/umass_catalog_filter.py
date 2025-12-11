"""
Author: Keertan Patel

Simple script that filters the data in the umass boston course catalog to have only the CS courses and outputs into a new file tha has all umb cs courses. 

"""


import json

DEFAULT_INPUT_FILE = "../data/UMB/UMASS_BOSTON_coursecatalogstructured.json"
DEFAULT_OUTPUT_PATH = "../data/UMB/"

def filter_cs_courses(input_file=DEFAULT_INPUT_FILE, output_file=DEFAULT_OUTPUT_PATH + "CS_courses.json"):
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


def filter_all_courses(input_file=DEFAULT_INPUT_FILE, output_path=DEFAULT_OUTPUT_PATH, dept_codes=[]):
    with open(input_file, 'r', encoding="utf-8") as infile:
        courses = json.load(infile)
    for dept in dept_codes:
        dept_courses = []
        for course in courses:
            if not isinstance(course, dict):
                continue
            courseid = str(course.get("courseid", ""))
            if courseid.startswith(dept):
                dept_courses.append(course)
        if dept_courses:
            with open(output_path + f"{dept}_courses.json", "w", encoding="utf-8") as outfile:
                json.dump(dept_courses, outfile, indent=2, ensure_ascii=False)
            
    
    


def get_dept_codes(input_file=DEFAULT_INPUT_FILE):
    with open(input_file, 'r', encoding="utf-8") as infile:
        courses = json.load(infile)
    dept_codes = []

    for course in courses:
        if not isinstance(course, dict):
            continue
        courseid = str(course.get("courseid", ""))
        dept_id = extract_dept_from_string(courseid)
        if dept_id not in dept_codes:
            dept_codes.append(dept_id)
    return dept_codes
        

def extract_dept_from_string(x):
    code = ""
    for i in x:
        if i.isalpha():
            code += i
    return code

if __name__ == "__main__":
    dept_codes = get_dept_codes()
    filter_all_courses(dept_codes=dept_codes)
