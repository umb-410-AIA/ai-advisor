import supabase from "./supabaseClient";
import fs from "fs";
import path from "path";

const jsonDataPath = "@/data/" 
export const UNIVERSITIES = ["MIT", "NYU", "UMASS_BOSTON", "UPENN", "YALE"]; 
        

export async function getCoursesByMajor(major: string, university_id: number) {
    const jsonPath = jsonDataPath + UNIVERSITIES[university_id];
    const raw = fs.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(raw);

    // Convert the object into an array of classes
    const classes = Object.values(data);

    const prunedClasses = classes
                              .filter((cls: any) => cls.id.startsWith(major.toUpperCase()))
                              .map(
                                (cls: any) => `${cls.id} — ${cls.title}\n${cls.course_descriptors.description}`
                              )
                              .join("\n\n");
        return prunedClasses;

}

function getMajorsByUniversity(university: number) {
    return "not yet implemented";
}