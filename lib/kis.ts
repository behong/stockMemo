import { prisma } from "@/lib/db";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

type KisTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type KisResponse<T> = {
  output?: T;
  output1?: T;
  output2?: unknown;
  rt_cd?: string;
  msg_cd?: string;
  msg1?: string;
};

const globalForKis = globalThis as unknown as {
  kisToken?: TokenCache;
  kisTokenPromise?: Promise<TokenCache>;
};

const KIS_TOKEN_NAME = "kis";
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
const TOKEN_EXPIRED_CODES = new Set(["EGW00123"]);
const FETCH_RETRY_DELAYS_MS = [500, 1000, 2000];
const REQUEST_SPACING_MS = 350;

function isTokenExpiredMessage(message: string, code?: string): boolean {
  if (code && TOKEN_EXPIRED_CODES.has(code)) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("token") &&
    (lower.includes("만료") || lower.includes("expired"))
  );
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set.`);
  }
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  debug: boolean,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < FETCH_RETRY_DELAYS_MS.length; attempt += 1) {
    if (REQUEST_SPACING_MS > 0) {
      await sleep(REQUEST_SPACING_MS);
    }
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (debug) {
        console.warn(
          `[KIS] fetch error attempt ${attempt + 1}/${FETCH_RETRY_DELAYS_MS.length}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (attempt < FETCH_RETRY_DELAYS_MS.length - 1) {
        await sleep(FETCH_RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastError;
}

async function requestToken(): Promise<TokenCache> {
  const baseUrl = getRequiredEnv("KIS_BASE_URL");
  const appKey = getRequiredEnv("KIS_APP_KEY");
  const appSecret = getRequiredEnv("KIS_APP_SECRET");
  const debug =
    process.env.KIS_DEBUG === "1" || process.env.KIS_DEBUG === "true";

  if (debug) {
    console.log(
      `[KIS] token request base=${baseUrl} keyLen=${appKey.length} secretLen=${appSecret.length}`,
    );
  }

  const response = await fetch(`${baseUrl}/oauth2/tokenP`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: appKey,
      appsecret: appSecret,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`KIS token request failed (${response.status}). ${text}`);
  }

  const data = (await response.json()) as KisTokenResponse;
  const expiresAt = Date.now() + Math.max(0, data.expires_in - 60) * 1000;
  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

function isTokenValid(expiresAt: number): boolean {
  return expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS;
}

async function readTokenFromDb(): Promise<TokenCache | null> {
  try {
    const cached = await prisma.serviceToken.findUnique({
      where: { name: KIS_TOKEN_NAME },
    });
    if (!cached) return null;
    const expiresAt = cached.expiresAt.getTime();
    if (!isTokenValid(expiresAt)) return null;
    return {
      accessToken: cached.accessToken,
      expiresAt,
    };
  } catch (error) {
    const debug =
      process.env.KIS_DEBUG === "1" || process.env.KIS_DEBUG === "true";
    if (debug) {
      console.warn(
        `[KIS] token db read failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return null;
  }
}

async function writeTokenToDb(token: TokenCache): Promise<void> {
  try {
    await prisma.serviceToken.upsert({
      where: { name: KIS_TOKEN_NAME },
      update: {
        accessToken: token.accessToken,
        expiresAt: new Date(token.expiresAt),
      },
      create: {
        name: KIS_TOKEN_NAME,
        accessToken: token.accessToken,
        expiresAt: new Date(token.expiresAt),
      },
    });
  } catch (error) {
    const debug =
      process.env.KIS_DEBUG === "1" || process.env.KIS_DEBUG === "true";
    if (debug) {
      console.warn(
        `[KIS] token db write failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

async function getAccessToken(): Promise<string> {
  const cached = globalForKis.kisToken;
  if (cached && isTokenValid(cached.expiresAt)) {
    return cached.accessToken;
  }

  const stored = await readTokenFromDb();
  if (stored) {
    globalForKis.kisToken = stored;
    return stored.accessToken;
  }

  if (!globalForKis.kisTokenPromise) {
    globalForKis.kisTokenPromise = requestToken();
  }

  try {
    const token = await globalForKis.kisTokenPromise;
    globalForKis.kisToken = token;
    await writeTokenToDb(token);
    return token.accessToken;
  } finally {
    globalForKis.kisTokenPromise = undefined;
  }
}

async function invalidateToken(reason?: string): Promise<void> {
  const debug =
    process.env.KIS_DEBUG === "1" || process.env.KIS_DEBUG === "true";
  if (debug) {
    console.warn(`[KIS] token invalidated${reason ? `: ${reason}` : ""}`);
  }
  globalForKis.kisToken = undefined;
  globalForKis.kisTokenPromise = undefined;
  try {
    await prisma.serviceToken.deleteMany({ where: { name: KIS_TOKEN_NAME } });
  } catch (error) {
    if (debug) {
      console.warn(
        `[KIS] token db delete failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export async function kisGet<T>(
  path: string,
  trId: string,
  query: Record<string, string>,
): Promise<T> {
  const debug =
    process.env.KIS_DEBUG === "1" || process.env.KIS_DEBUG === "true";
  const baseUrl = getRequiredEnv("KIS_BASE_URL");
  const appKey = getRequiredEnv("KIS_APP_KEY");
  const appSecret = getRequiredEnv("KIS_APP_SECRET");

  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  if (debug) {
    console.log(`[KIS] request url=${url.toString()} tr_id=${trId}`);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const accessToken = await getAccessToken();
    let response: Response;
    try {
      response = await fetchWithRetry(
        url.toString(),
        {
          method: "GET",
          headers: {
            "content-type": "application/json; charset=utf-8",
            authorization: `Bearer ${accessToken}`,
            appkey: appKey,
            appsecret: appSecret,
            tr_id: trId,
            custtype: "P",
          },
        },
        debug,
      );
    } catch (error) {
      throw new Error(
        `KIS request failed (network). ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      if (attempt === 0 && isTokenExpiredMessage(text)) {
        await invalidateToken(text);
        continue;
      }
      throw new Error(`KIS request failed (${response.status}). ${text}`);
    }

    const payload = (await response.json()) as KisResponse<T>;
    if (payload.rt_cd && payload.rt_cd !== "0") {
      const message = payload.msg1 || "KIS request failed.";
      if (attempt === 0 && isTokenExpiredMessage(message, payload.msg_cd)) {
        await invalidateToken(message);
        continue;
      }
      throw new Error(message);
    }

    if (debug) {
      const outputValue = payload.output ?? payload.output1 ?? null;
      const outputKeys =
        outputValue && typeof outputValue === "object"
          ? Object.keys(outputValue as Record<string, unknown>)
          : [];
      const output2Info = Array.isArray(payload.output2)
        ? `array(${payload.output2.length})`
        : payload.output2
          ? "object"
          : "none";
      console.log(
        `[KIS] ${trId} ${path} query=${JSON.stringify(query)} rt_cd=${payload.rt_cd ?? "?"}`,
      );
      console.log(`[KIS] output keys=${outputKeys.join(",")}`);
      if (outputValue) {
        console.log(`[KIS] output sample=${JSON.stringify(outputValue)}`);
      }
      console.log(`[KIS] output2=${output2Info}`);
    }

    const output = payload.output ?? payload.output1;
    if (!output) {
      throw new Error("KIS response missing output.");
    }

    return output;
  }

  throw new Error("KIS request failed after token refresh.");
}
