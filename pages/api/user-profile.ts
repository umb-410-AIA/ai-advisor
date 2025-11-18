import type { NextApiRequest, NextApiResponse } from "next";
import { assertRequestHasValidJwt } from "@/utils/auth";

// In-memory storage (replace with database in production)
const userProfiles: Record<string, any> = {};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify authentication
  try {
    assertRequestHasValidJwt(req);
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "POST") {
    // Save user profile
    try {
      const { name, college, major, collegeYear, graduationYear } = req.body;

      // Validate required fields
      if (!name || !college || !major || !collegeYear || !graduationYear) {
        return res.status(400).json({ 
          error: "All fields are required" 
        });
      }

      // Extract user ID from JWT (you may need to adjust this based on your JWT structure)
      const token = req.headers.authorization?.split(" ")[1];
      const userId = token || "default_user"; // In production, decode JWT to get actual user ID

      // Store profile (in production, save to database)
      userProfiles[userId] = {
        name,
        college,
        major,
        collegeYear,
        graduationYear,
        createdAt: new Date().toISOString(),
      };

      console.log("User profile saved:", userProfiles[userId]);

      return res.status(200).json({ 
        success: true,
        message: "Profile saved successfully",
        profile: userProfiles[userId]
      });

    } catch (error) {
      console.error("Error saving profile:", error);
      return res.status(500).json({ 
        error: "Failed to save profile" 
      });
    }
  } else if (req.method === "GET") {
    // Retrieve user profile
    try {
      const token = req.headers.authorization?.split(" ")[1];
      const userId = token || "default_user";

      const profile = userProfiles[userId];

      if (!profile) {
        return res.status(404).json({ 
          error: "Profile not found" 
        });
      }

      return res.status(200).json({ 
        success: true,
        profile 
      });

    } catch (error) {
      console.error("Error retrieving profile:", error);
      return res.status(500).json({ 
        error: "Failed to retrieve profile" 
      });
    }
  } else {
    return res.status(405).json({ 
      error: "Method not allowed" 
    });
  }
}