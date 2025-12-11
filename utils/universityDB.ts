import fs from "fs";
import { UMB_MAJORS } from "../data/UMB/majors.js";

const jsonDataPath = "./data/" 
export const UNIVERSITIES = [
    null, // index 0 unused so IDs can start at 1
    {
        name: "UMB",
        majors: UMB_MAJORS
    },
] as const;
        
export async function getCoursesByMajor(major: string, university_id: number) {
    const name = UNIVERSITIES[university_id]?.name
    const jsonPath = jsonDataPath + name + "/" + major + "_courses.json";
    console.log("Fetching courses from:", jsonPath);
    const raw = fs.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(raw);
    // Convert the object into an array of classes
    const classes = Object.values(data);

    const prunedClasses = classes
      .filter((cls: any) =>
        cls.courseid.startsWith(major.toUpperCase()) ||
        cls.courseid.startsWith(major.toLowerCase())
      )
      .map((cls: any) =>
        `${cls.courseid} — ${cls.coursename}\n${cls.coursedescription}`
      )
      .join("\n\n");

    return prunedClasses;

}

export async function getMajorByUniversity(university_id: number) {
    return UNIVERSITIES[university_id]?.majors ?? [];
}
