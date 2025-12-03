import fs from "fs";

const jsonDataPath = "./data/" 
export const UNIVERSITIES = ["UMASS_BOSTON"]; // only umass boston for now
        
export async function getCoursesByMajor(major: string, university_id: number) {
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

export async function getMajorByUniversity(university: number) {
    if (university === 0) { // UMASS_BOSTON
        return [
            "CS", // just cs for now
        ];
    }
}