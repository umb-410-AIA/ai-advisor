/*
Source: ChatGPT
Prompt:

Now write me the nextjs pages API route to handle the authentication. It should compare the token to one in a .env variable called "UNIVERSAL_PASSWORD"
*/
import { v4 as uuidv4 } from "uuid";
import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { upsertUserData } from "@/utils/userdata";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, token: existingToken } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password required" });
  }

  const universalPassword = process.env.UNIVERSAL_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!universalPassword) {
    console.error("Missing UNIVERSAL_PASSWORD env var");
    return res.status(500).json({ error: "Server not configured properly" });
  }

  // Compare password
  if (password !== universalPassword) {
    return res.status(401).json({ error: "Invalid password" });
  }

  // If client already has a token, decode it and reuse the user_id
  let userId = null;
  if (existingToken) {
    try {
      const decoded: any = jwt.verify(existingToken, jwtSecret);
      userId = decoded.user_id;
    } catch (_) {}
  }

  // First time login: create new user_id
  if (!userId) {
    userId = uuidv4();
  }

  // store user_id in database
  upsertUserData(userId, {});

  // Create JWT payload
  const token = jwt.sign(
    { authenticated: true, user_id: userId },
    jwtSecret,
    { expiresIn: "7d" } // Adjust expiration as needed
  );

  return res.status(200).json({ token: token, user_id: userId });
}
