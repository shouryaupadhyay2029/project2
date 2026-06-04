const https = require("https");
const jwt = require("jsonwebtoken");

const FIREBASE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const DEFAULT_FIREBASE_PROJECT_ID = "devstage-872b1";

let cachedCerts = null;
let certsExpiresAt = 0;

function getExpectedFirebaseProjectId() {
  return process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
}

function parseMaxAge(cacheControl) {
  const match = /max-age=(\d+)/i.exec(cacheControl || "");
  return match ? Number(match[1]) * 1000 : 60 * 60 * 1000;
}

function fetchFirebaseCerts() {
  return new Promise((resolve, reject) => {
    https
      .get(FIREBASE_CERTS_URL, (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode !== 200) {
            reject(new Error(`Firebase cert fetch failed: ${response.statusCode}`));
            return;
          }

          try {
            cachedCerts = JSON.parse(body);
            certsExpiresAt =
              Date.now() + parseMaxAge(response.headers["cache-control"]);
            resolve(cachedCerts);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function getFirebaseCerts() {
  if (cachedCerts && Date.now() < certsExpiresAt) {
    return cachedCerts;
  }

  return fetchFirebaseCerts();
}

async function verifyFirebaseIdToken(token) {
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
    throw new Error("Malformed Firebase token");
  }

  const certs = await getFirebaseCerts();
  const cert = certs[decodedHeader.header.kid];
  if (!cert) {
    throw new Error("Unknown Firebase token key");
  }

  const projectId = getExpectedFirebaseProjectId();
  return jwt.verify(token, cert, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });
}

module.exports = {
  verifyFirebaseIdToken,
  getExpectedFirebaseProjectId,
};
