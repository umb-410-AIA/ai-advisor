#Vraj Soni Dec7 
import requests
from bs4 import BeautifulSoup
import json
import random
import re
import time

OUTPUT_FILE = "newData.json"
URL = "https://courses.umb.edu/course_catalog/courses/ugrd_CS_all"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def generate_credits():
    return random.randint(3, 9)

def generate_career_tag(description):
    desc_lower = description.lower()
    tags = []
    
    if "intelligence" in desc_lower or "ai" in desc_lower or "learning" in desc_lower or "neural" in desc_lower:
        tags.append("AI/ML Engineer")
    if "web" in desc_lower or "internet" in desc_lower or "html" in desc_lower or "css" in desc_lower or "javascript" in desc_lower:
        tags.append("Web Developer")
    if "database" in desc_lower or "sql" in desc_lower or "data management" in desc_lower:
        tags.append("Data Engineer")
    if "security" in desc_lower or "cryptography" in desc_lower or "cyber" in desc_lower or "network security" in desc_lower:
        tags.append("Cybersecurity Analyst")
    if "network" in desc_lower or "communication" in desc_lower:
        tags.append("Network Engineer")
    if "game" in desc_lower or "graphics" in desc_lower or "multimedia" in desc_lower:
        tags.append("Game Developer")
    if "interface" in desc_lower or "ui" in desc_lower or "ux" in desc_lower or "human-computer" in desc_lower:
        tags.append("UI/UX Designer")
    if "mobile" in desc_lower or "android" in desc_lower or "ios" in desc_lower:
        tags.append("Mobile App Developer")
    if "embedded" in desc_lower or "hardware" in desc_lower or "architecture" in desc_lower:
        tags.append("Embedded Systems Engineer")
    if "software" in desc_lower and "engineering" in desc_lower:
        tags.append("Software Engineer")
    if "algorithm" in desc_lower or "structure" in desc_lower or "theory" in desc_lower or "logic" in desc_lower:
        tags.append("Backend Developer")
    if not tags:
        tags.append("Software Developer")
    return list(set(tags))

def scrape_course_details(course_url):
    # CHANGE 2: scrape_course_details FUNCTION - Implemented (Lines 48-105)
    # Fetches and parses individual course pages from UMass Boston catalog
    # Extracts: course code, title, description, prerequisites, credits, career tags
    # Returns: Dictionary with complete course metadata or None on error
    try:
        response = requests.get(course_url, headers=HEADERS)
        if response.status_code != 200:
            print(f"Failed to load {course_url}")
            return None
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title_tag = soup.find("h2", class_="pageTitle")
        title = title_tag.get_text(strip=True) if title_tag else "Unknown Title"
        
        course_num = "Unknown"
        course_num_elem = soup.find("h3", string=re.compile("Course #:"))
        if course_num_elem:
            course_num = course_num_elem.get_text(strip=True).replace("Course #:", "").strip()
        
        description = ""
        desc_label = soup.find("strong", string=re.compile("Description:"))
        if desc_label:
            full_text = desc_label.parent.get_text(strip=True)
            description = full_text.replace("Description:", "").strip()
        
        pre_reqs = []
        pre_req_label = soup.find("strong", string=re.compile("Pre Requisites:"))
        if pre_req_label:
            pre_req_text = pre_req_label.parent.get_text(strip=True)
            matches = re.findall(r'\b[A-Z/]{2,5}\s\d{3}[A-Z]?\b', pre_req_text)
            pre_reqs = list(set(matches))

        credits = generate_credits()
        flags = generate_career_tag(description)

        return {
            "code": course_num.replace(" ", ""),
            "name": title,
            "credits": credits,
            "description": description,
            "prerequisites": pre_reqs,
            "flags": flags
        }

    except Exception as e:
        return None

def main():
    # Entry point for course catalog scraping workflow
    # Orchestrates: page fetching → link extraction → course detail scraping → data compilation
    # Output: Generates newData.json with complete degree structure and course catalog
    response = requests.get(URL, headers=HEADERS)
    if response.status_code != 200:
        return

    soup = BeautifulSoup(response.content, 'html.parser')
    
    more_info_links = soup.find_all("a", string="More Info")
    
    
    courses_data = []
    processed_urls = set()
    
    for link in more_info_links:
        href = link.get('href')
        if not href:
            continue
            
        full_url = href if href.startswith("http") else f"https://courses.umb.edu{href}"
        
        if full_url in processed_urls:
            continue
            
        details = scrape_course_details(full_url)
        if details:
            courses_data.append(details)
        
        processed_urls.add(full_url)
        time.sleep(0.5)

    final_data = {
        "degrees": [
            {
                "id": 1,
                "name": "Computer Science",
                "degree_subjects": [
                        {
                            "year": "Freshman",
                            "terms": [
                                {
                                    "term": "Fall",
                                    "subjects": [
                                        {
                                            "code": "CS110",
                                            "name": "Introduction to Computing",
                                            "credits": 4,
                                            "description": "An introduction to computer programming: the concepts involved in use of a higher level language and the program development process. The goal of this course is proficiency in the design and implementation of programs of significant size and complexity. This course is quite demanding because of the length of the programming exercises assigned. This is the first course in the computer science sequence.",
                                            "prerequisites": [
                                                "MATH130"
                                            ]
                                        },
                                        {
                                            "code": "MATH140",
                                            "name": "Calculus I",
                                            "credits": 4,
                                            "description": "The first course in a sequence of calculus courses that cover single-variable calculus. Topics include limits, derivatives, and integrals.",
                                            "prerequisites": [
                                                "MATH130"
                                            ]
                                        },
                                        {
                                            "code": "AF211",
                                            "name": "First Year Seminar",
                                            "credits": 4,
                                            "description": "A seminar to help freshmen transition into university life, focusing on academic skills, research, and critical thinking.",
                                            "prerequisites": []
                                        },
                                        {
                                            "code": "EN101",
                                            "name": "English 101",
                                            "credits": 3,
                                            "description": "An introductory course in composition, focusing on academic writing and argumentation.",
                                            "prerequisites": []
                                        }
                                    ]
                                },
                                {
                                    "term": "Spring",
                                    "subjects": [
                                        {
                                            "code": "CS210",
                                            "name": "Data Structures",
                                            "credits": 4,
                                            "description": "This course focuses on the organization and manipulation of data structures, such as lists, stacks, queues, trees, and graphs.",
                                            "prerequisites": [
                                                "CS110"
                                            ]
                                        },
                                        {
                                            "code": "CS240",
                                            "name": "Discrete Structures",
                                            "credits": 3,
                                            "description": "Introduction to mathematical structures and their application in computing.",
                                            "prerequisites": [
                                                "MATH140"
                                            ]
                                        },
                                        {
                                            "code": "MATH141",
                                            "name": "Calculus II",
                                            "credits": 4,
                                            "description": "Second course in the calculus sequence focusing on integrals, series, and applications.",
                                            "prerequisites": [
                                                "MATH140"
                                            ]
                                        },
                                        {
                                            "code": "EN102",
                                            "name": "English 102",
                                            "credits": 3,
                                            "description": "Continuation of English 101, focusing on research writing and critical analysis.",
                                            "prerequisites": [
                                                "EN101"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "year": "Sophomore",
                            "terms": [
                                {
                                    "term": "Fall",
                                    "subjects": [
                                        {
                                            "code": "CS260",
                                            "name": "Computer Architecture",
                                            "credits": 4,
                                            "description": "This course covers the architecture of modern computers and how they execute instructions.",
                                            "prerequisites": [
                                                "CS110"
                                            ]
                                        },
                                        {
                                            "code": "CS220",
                                            "name": "Algorithms",
                                            "credits": 4,
                                            "description": "Introduction to algorithm design and analysis.",
                                            "prerequisites": [
                                                "CS210"
                                            ]
                                        },
                                        {
                                            "code": "CS285L",
                                            "name": "Computer Systems Laboratory",
                                            "credits": 3,
                                            "description": "Laboratory component for CS220, focusing on practical applications of algorithms and data structures.",
                                            "prerequisites": [
                                                "CS220"
                                            ]
                                        },
                                        {
                                            "code": "GE",
                                            "name": "General Education Elective",
                                            "credits": 3,
                                            "description": "A general education elective chosen by the student.",
                                            "prerequisites": []
                                        }
                                    ]
                                },
                                {
                                    "term": "Spring",
                                    "subjects": [
                                        {
                                            "code": "CS420",
                                            "name": "Operating Systems",
                                            "credits": 4,
                                            "description": "Study of operating system design and implementation, including process management, memory management, and file systems.",
                                            "prerequisites": [
                                                "CS220"
                                            ]
                                        },
                                        {
                                            "code": "CS444",
                                            "name": "Software Engineering",
                                            "credits": 4,
                                            "description": "Introduction to software development life cycles, methodologies, and project management.",
                                            "prerequisites": [
                                                "CS210"
                                            ]
                                        },
                                        {
                                            "code": "CS446",
                                            "name": "Introduction to Databases",
                                            "credits": 3,
                                            "description": "Study of database design, relational databases, and SQL.",
                                            "prerequisites": [
                                                "CS220"
                                            ]
                                        },
                                        {
                                            "code": "PHYS113",
                                            "name": "Physics I",
                                            "credits": 3,
                                            "description": "Introduction to mechanics, thermodynamics, and wave motion.",
                                            "prerequisites": [
                                                "MATH141"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "year": "Junior",
                            "terms": [
                                {
                                    "term": "Fall",
                                    "subjects": [
                                        {
                                            "code": "CS410",
                                            "name": "Advanced Algorithms",
                                            "credits": 3,
                                            "description": "Advanced study in algorithm design, including NP-completeness, approximation algorithms, and algorithmic game theory.",
                                            "prerequisites": [
                                                "CS220"
                                            ]
                                        },
                                        {
                                            "code": "CS455",
                                            "name": "Computer Networks",
                                            "credits": 3,
                                            "description": "Study of computer networks, protocols, and security.",
                                            "prerequisites": [
                                                "CS220"
                                            ]
                                        },
                                        {
                                            "code": "CS441",
                                            "name": "Machine Learning",
                                            "credits": 4,
                                            "description": "Introduction to machine learning concepts and algorithms.",
                                            "prerequisites": [
                                                "CS220"
                                            ]
                                        },
                                        {
                                            "code": "GE",
                                            "name": "General Education Elective",
                                            "credits": 3,
                                            "description": "A general education elective chosen by the student.",
                                            "prerequisites": []
                                        }
                                    ]
                                },
                                {
                                    "term": "Spring",
                                    "subjects": [
                                        {
                                            "code": "CS451",
                                            "name": "Compiler Design",
                                            "credits": 3,
                                            "description": "Study of compilers, including lexical analysis, parsing, and code generation.",
                                            "prerequisites": [
                                                "CS220"
                                            ]
                                        },
                                        {
                                            "code": "CS449",
                                            "name": "Cloud Computing",
                                            "credits": 3,
                                            "description": "Study of cloud platforms, architectures, and technologies.",
                                            "prerequisites": [
                                                "CS420"
                                            ]
                                        },
                                        {
                                            "code": "PHYS114",
                                            "name": "Physics II",
                                            "credits": 3,
                                            "description": "Continuation of Physics I, focusing on electricity, magnetism, and optics.",
                                            "prerequisites": [
                                                "PHYS113"
                                            ]
                                        },
                                        {
                                            "code": "MATH345",
                                            "name": "Linear Algebra",
                                            "credits": 3,
                                            "description": "Study of linear equations, matrices, determinants, and vector spaces.",
                                            "prerequisites": [
                                                "MATH141"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "year": "Senior",
                            "terms": [
                                {
                                    "term": "Fall",
                                    "subjects": [
                                        {
                                            "code": "CS511",
                                            "name": "Artificial Intelligence",
                                            "credits": 3,
                                            "description": "Study of artificial intelligence concepts, algorithms, and applications.",
                                            "prerequisites": [
                                                "CS220"
                                            ]
                                        },
                                        {
                                            "code": "CS450",
                                            "name": "Software Security",
                                            "credits": 3,
                                            "description": "Introduction to software security principles, including cryptography, secure coding, and threat modeling.",
                                            "prerequisites": [
                                                "CS420"
                                            ]
                                        },
                                        {
                                            "code": "GE",
                                            "name": "General Education Elective",
                                            "credits": 3,
                                            "description": "A general education elective chosen by the student.",
                                            "prerequisites": []
                                        },
                                        {
                                            "code": "ELEC",
                                            "name": "Elective",
                                            "credits": 3,
                                            "description": "A general elective course chosen by the student.",
                                            "prerequisites": []
                                        }
                                    ]
                                },
                                {
                                    "term": "Spring",
                                    "subjects": [
                                        {
                                            "code": "CS470",
                                            "name": "Cloud Computing",
                                            "credits": 3,
                                            "description": "Advanced topics in cloud computing, including distributed systems, cloud architectures, and security.",
                                            "prerequisites": [
                                                "CS449"
                                            ]
                                        },
                                        {
                                            "code": "CS481",
                                            "name": "Capstone Project",
                                            "credits": 4,
                                            "description": "A culminating project integrating the knowledge and skills learned throughout the degree program.",
                                            "prerequisites": [
                                                "CS420"
                                            ]
                                        },
                                        {
                                            "code": "GE",
                                            "name": "General Education Elective",
                                            "credits": 3,
                                            "description": "A general education elective chosen by the student.",
                                            "prerequisites": []
                                        },
                                        {
                                            "code": "ELEC",
                                            "name": "Elective",
                                            "credits": 3,
                                            "description": "A general elective course chosen by the student.",
                                            "prerequisites": []
                                        }
                                    ]
                                }
                            ]
                        }
                ],
                "all_subjects": courses_data
            }
        ]
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(final_data, f, indent=2)
    
    print(f"Scraping complete. Saved {len(courses_data)} courses to {OUTPUT_FILE}.")

if __name__ == "__main__":
    main()
