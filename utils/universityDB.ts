import supabase from "./supabaseClient";
import fs from "fs";
import path from "path";

const jsonDataPath = "./data/" 
export const UNIVERSITIES = ["UMASS_BOSTON", "MIT", "NYU", "UPENN", "YALE"]; 
        
export async function getCoursesByMajor(major: string, university_id: number) {
    // default to CS
    major = "CS"
    university_id = 0;
  
    const jsonPath = jsonDataPath + UNIVERSITIES[university_id] + "_coursecatalogstructured.json";
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

function getMajorsByUniversity(university: number) {
    return "not yet implemented";
}