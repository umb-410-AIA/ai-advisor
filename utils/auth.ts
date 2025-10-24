/* 
Source: ChatGPT
Prompt: Write me a typescript function that verifies a signed JWT given its jwt secret, and ensures that it is not expired
*/

import jwt, { JwtPayload } from "jsonwebtoken";
import { NextApiRequest } from "next";

/**
 * Verifies an HS256-signed JWT and ensures it's not expired.
 * Throws TokenExpiredError on expiration and JsonWebTokenError on other issues.
 */
export function verifyJwtSync(
  token: string,
  secret: string
): JwtPayload {
  const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });

  // `verify` already enforces `exp`. Cast to JwtPayload if you expect a payload object.
  if (typeof decoded === "string") {
    throw new Error("Unexpected JWT string payload");
  }
  return decoded;
}

/* --- end LLM output*/

export async function assertRequestHasValidJwt(req: NextApiRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error("Missing 'Authorization' header from request.");

  const jwt = authHeader.split(' ')?.[1];
  if (!jwt) throw new Error("Invalid auth header value, should be 'Bearer <JWT>'.");

  verifyJwtSync(jwt, process.env.JWT_SECRET);
}
