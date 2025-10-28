import json
from tqdm import tqdm
import os

COURSE_CATALOG_PATH = os.getenv('COURSE_CATALOG_DATA_PATH')
assert COURSE_CATALOG_PATH
COURSE_CATALOG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), COURSE_CATALOG_PATH))

if not os.path.exists(COURSE_CATALOG_PATH):
    os.mkdir(COURSE_CATALOG_PATH)

data = None
with open("data.json", "r") as outfile:
    data = json.load(outfile)

new_data = {}
for k, v in tqdm(data.items()):
    has_a_available_session = False
    for session in v['sessions']:
        if "D" not in session['section'] and session['schedule/time'] != " - ":
            has_a_available_session = True
            break

    if has_a_available_session:
        new_data[k] = v

print(len(new_data))
with open(os.path.join(COURSE_CATALOG_PATH, f"filter-catalog-output.json"), "w") as outfile: 
    json.dump(new_data, outfile, indent=4)