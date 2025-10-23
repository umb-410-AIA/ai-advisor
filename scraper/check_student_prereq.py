import json
from typing import List, TypedDict
from typing_extensions import IntVar
import os

COURSE_CATALOG_PATH = os.getenv('COURSE_CATALOG_DATA_PATH')
assert COURSE_CATALOG_PATH
COURSE_CATALOG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), COURSE_CATALOG_PATH))

class StudentData(TypedDict):
    courses_taken: List[str]
    total_credits_taken: int
    name_of_college: str
    major: str
    is_grad_student: bool

def student_meets_prereqs(course_code: str, student_data: StudentData, print_warnings=False)-> bool:
    global COURSE_CATALOG_PATH
    assert COURSE_CATALOG_PATH
    json_data = None
    if __name__ == "__main__":
        with open(os.path.join(COURSE_CATALOG_PATH, 'data_with_prereq_code.json'), 'r') as file:
            json_data = json.load(file)
    else: # If running from root of proj directory
        with open(os.path.join(COURSE_CATALOG_PATH, 'data_with_prereq_code.json'), 'r') as file:
            json_data = json.load(file)
    if not course_code.strip() in json_data:
        if print_warnings:
            print(f"Warning!: Prereq data for course code {course_code} not available. Returning True.")
        return True
    func_str = json_data[course_code.strip()]
    exec(func_str, globals())
    try:
         return check(student_data) # This is not a real error, as `check` is declared when `exec(...)` is run
    except:
        raise Exception("Unable to execute code:", func_str)

if __name__ == "__main__":
    data: StudentData = {
        "courses_taken": ["Math 101", "CS 110"],
        "total_credits_taken": 35,
        "name_of_college": "College of Management",
        "major": "MGT",
        "is_grad_student": False
    }
    print(student_meets_prereqs("AF210", data))
