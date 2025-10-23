import os
import json
from typing import Dict
import dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

dotenv.load_dotenv()

COURSE_CATALOG_PATH = os.getenv('COURSE_CATALOG_DATA_PATH')
assert COURSE_CATALOG_PATH
COURSE_CATALOG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), COURSE_CATALOG_PATH))

PROMPT_TEMPLATE = """
Given the following natural-language rule, write a python function that will take in a dictionary of the following shape, and return out either `True` or `False`, indicating whether the student has the satisfied prerequisites to take this course. Do not print anything, under any condition. If it cannot be determined based on the information provided, print a warning and return `False`. Ignore any "with permission of instructor" clause. Do not include comments or blank lines. Additionally, do not import anything, and do not include any code to test the function, just the function itself. Do not return markdown formatted code, just literal code. Make sure that the function is called `check`.

If a particular course code contains a space between the letter and the number, remove it in the query, and strip any leading or trailing whitespace from the string.

Natural-language rule:
"{input}"

Shape of JSON:
```json
{{
"courses_taken": string[],
"name_of_college": string,
"major": string,
"is_grad_student": boolean,
"total_credits_taken": number
}}
```

Respond with only python code.
"""

# Since we have thousands of coruses, write to the json data after every `FILE_WRITE_INTERVAL` more courses have been processed,
# to avoid losing data
FILE_WRITE_INTERVAL = 20

if not os.environ["OPENAI_API_KEY"]:
    print("Error: missing openai api key")
    exit(1)

llm = ChatOpenAI()
output_parser = StrOutputParser()

def write_json_file(file_name: str, json_dict: Dict) -> None:
    print(f"💿 Writing to {file_name}.")
    with open(file_name, 'w') as f:
        json.dump(json_dict, f, indent=4)

def process_course_data(input_file, output_filename):
    with open(input_file, 'r') as f:
        course_data = json.load(f)
    
    # The output JSON data
    course_to_function_map = {
        # "CS110": <serialized function code>,
        # "CS420": <serialized function code>
    }

    i = 0
    for course_name, details in course_data.items():
        print(f"🤖 Generating code for course: {course_name} @ # {i}")
        descriptors = details.get("course_descriptors", {})
        prerequisites: str = descriptors.get("pre requisites", "")
        if not prerequisites:
            continue

        prompt = ChatPromptTemplate.from_messages([
            ("system", "Your job is to write reasonable python code."),
            ("user", PROMPT_TEMPLATE)
        ])

        chain = prompt | llm | output_parser
        
        try:
            code = chain.invoke({"input": prerequisites})
            course_to_function_map[course_name] = code
        except Exception as e:
            print(f"Error processing {course_name}: {e}")
        i += 1
        if i % FILE_WRITE_INTERVAL == 0 and i != 0:
            write_json_file(output_filename, course_to_function_map)

    write_json_file(output_filename, course_to_function_map)

if __name__ == "__main__":
    input_file = os.path.join(COURSE_CATALOG_PATH, "data_available.json")  # Input JSON file path
    output_file = os.path.join(COURSE_CATALOG_PATH, "data_with_prereq_code.json")  # Output JSON file path
    process_course_data(input_file, output_file)
