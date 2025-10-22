/*
Source: ChatGPT
Prompt:

Now write me the nextjs pages API route to handle the authentication. It should compare the token to one in a .env variable called "UNIVERSAL_PASSWORD"
*/

import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password required" });
  }

  const universalPassword = process.env.UNIVERSAL_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET || "default_dev_secret";

  if (!universalPassword) {
    console.error("Missing UNIVERSAL_PASSWORD env var");
    return res.status(500).json({ error: "Server not configured properly" });
  }

  // Compare password
  if (password !== universalPassword) {
    return res.status(401).json({ error: "Invalid password" });
  }

  // Create JWT payload
  const token = jwt.sign(
    { authenticated: true },
    jwtSecret,
    { expiresIn: "7d" } // Adjust expiration as needed
  );

  return res.status(200).json({ token });
}
