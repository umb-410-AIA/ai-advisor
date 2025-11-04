/*
Source: ChatGPT
Prompt: 

Write me a typescript schema for this bad boy
{
        "id": "AF210",
        "title": "Financial Accounting",
        "course_descriptors": {
            "description": "Presents the theory and techniques of financial accounting. The course encompasses the basic functions of collecting, processing, and reporting accounting information for interested third parties (e.g. owners, investors, and government) and enables students to analyze, interpret, and use accounting information effectively.",
            "pre requisites": "  Pre-req = a minimum of 15 credits.  MGT students only."
        },
        "sessions": [
            {
                "section": "01",
                "class_number": "1538",
                "schedule/time": "TuTh11:00 - 12:15 pm",
                "instructor": "Park,Koeun",
                "location": "McCormack M02-0417",
                "more_info": "",
                "session": "Regular",
                "class dates": "01/26/2026 - 05/13/2026",
                "capacity": "24",
                "enrolled": "0",
                "status": "Open",
                "credits": "3/3",
                "class notes": "",
                "pre requisites": "  Pre-req = a minimum of 15 credits.  MGT students only.",
                "course attributes": " "
            },
            {
                "section": "02",
                "class_number": "4285",
                "schedule/time": "MW11:00 - 12:15 pm",
                "instructor": "Radding,Mark",
                "location": "McCormack M02-0423",
                "more_info": "",
                "session": "Regular",
                "class dates": "01/26/2026 - 05/13/2026",
                "capacity": "35",
                "enrolled": "0",
                "status": "Open",
                "credits": "3/3",
                "class notes": "",
                "pre requisites": "  Pre-req = a minimum of 15 credits.  MGT students only.",
                "course attributes": " "
            },
            {
                "section": "03",
                "class_number": "4286",
                "schedule/time": "MW12:30 - 1:45 pm",
                "instructor": "Tinaikar,Surjit",
                "location": "Wheatley-Peters W01-0029",
                "more_info": "",
                "session": "Regular",
                "class dates": "01/26/2026 - 05/13/2026",
                "capacity": "35",
                "enrolled": "0",
                "status": "Open",
                "credits": "3/3",
                "class notes": "",
                "pre requisites": "  Pre-req = a minimum of 15 credits.  MGT students only.",
                "course attributes": " "
            },
            {
                "section": "04",
                "class_number": "4287",
                "schedule/time": "TuTh9:30 - 10:45 am",
                "instructor": "Park,Koeun",
                "location": "Wheatley-Peters W02-0198",
                "more_info": "",
                "session": "Regular",
                "class dates": "01/26/2026 - 05/13/2026",
                "capacity": "35",
                "enrolled": "0",
                "status": "Open",
                "credits": "3/3",
                "class notes": "",
                "pre requisites": "  Pre-req = a minimum of 15 credits.  MGT students only.",
                "course attributes": " "
            },
            {
                "section": "05",
                "class_number": "4288",
                "schedule/time": "TuTh12:30 - 1:45 pm",
                "instructor": "Chen,Ting",
                "location": "Wheatley-Peters W01-0041",
                "more_info": "",
                "session": "Regular",
                "class dates": "01/26/2026 - 05/13/2026",
                "capacity": "35",
                "enrolled": "0",
                "status": "Open",
                "credits": "3/3",
                "class notes": "",
                "pre requisites": "  Pre-req = a minimum of 15 credits.  MGT students only.",
                "course attributes": " "
            },
            {
                "section": "06",
                "class_number": "4289",
                "schedule/time": "TuTh4:00 - 5:15 pm",
                "instructor": "Ahn,Jaehan",
                "location": "University Hall Y02-2330",
                "more_info": "",
                "session": "Regular",
                "class dates": "01/26/2026 - 05/13/2026",
                "capacity": "35",
                "enrolled": "0",
                "status": "Open",
                "credits": "3/3",
                "class notes": "",
                "pre requisites": "  Pre-req = a minimum of 15 credits.  MGT students only.",
                "course attributes": " "
            },
            {
                "section": "08",
                "class_number": "7373",
                "schedule/time": " - ",
                "instructor": "Kim,Sangwan",
                "location": "On-line course",
                "more_info": "",
                "session": "Regular",
                "class dates": "01/26/2026 - 05/13/2026",
                "capacity": "35",
                "enrolled": "0",
                "status": "Open",
                "credits": "3/3",
                "class notes": "",
                "pre requisites": "  Pre-req = a minimum of 15 credits.  MGT students only.",
                "course attributes": " "
            }
        ]
    }

And a zod validator */

import { z } from "zod";

/** ---------- TypeScript types (raw, key-for-key) ---------- */

export interface CourseData {
  id: string;
  title: string;
  course_descriptors: {
    description: string;
    "pre requisites": string;
  };
  sessions: SessionData[];
}

export interface SessionData {
  section: string;
  class_number: string;
  "schedule/time": string;
  instructor: string;
  location: string;
  more_info: string;
  session: string;
  "class dates": string;         // e.g. "01/26/2026 - 05/13/2026"
  capacity: string;              // numeric in a string (e.g. "35")
  enrolled: string;              // numeric in a string (e.g. "0")
  status: string;                // e.g. "Open"
  credits: string;               // e.g. "3/3"
  "class notes": string;
  "pre requisites": string;
  "course attributes": string;
}

/** ---------- Zod schemas (raw, key-for-key) ---------- */

export const rawSessionSchema = z
  .object({
    section: z.string(),
    class_number: z.string(),
    "schedule/time": z.string(),
    instructor: z.string(),
    location: z.string(),
    more_info: z.string(),
    session: z.string(),
    "class dates": z.string(),
    capacity: z.string(),
    enrolled: z.string(),
    status: z.string(),
    credits: z.string(),
    "class notes": z.string(),
    "pre requisites": z.string(),
    "course attributes": z.string(),
  })
  .strict();

export const rawCourseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    course_descriptors: z
      .object({
        description: z.string(),
        "pre requisites": z.string(),
      })
      .strict(),
    sessions: z.array(rawSessionSchema).nonempty(),
  })
  .strict();

/** ---------- Inferred types from Zod (optional) ---------- */

export type CourseFromSchema = z.infer<typeof rawCourseSchema>;
export type SessionFromSchema = z.infer<typeof rawSessionSchema>;


