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
  msg1?: string;
};

const globalForKis = globalThis as unknown as {
  kisToken?: TokenCache;
  kisTokenPromise?: Promise<TokenCache>;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set.`);
  }
  return value;
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

async function getAccessToken(): Promise<string> {
  const cached = globalForKis.kisToken;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  if (!globalForKis.kisTokenPromise) {
    globalForKis.kisTokenPromise = requestToken();
  }

  try {
    const token = await globalForKis.kisTokenPromise;
    globalForKis.kisToken = token;
    return token.accessToken;
  } finally {
    globalForKis.kisTokenPromise = undefined;
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
  const accessToken = await getAccessToken();

  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  if (debug) {
    console.log(`[KIS] request url=${url.toString()} tr_id=${trId}`);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${accessToken}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: trId,
      custtype: "P",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`KIS request failed (${response.status}). ${text}`);
  }

  const payload = (await response.json()) as KisResponse<T>;
  if (payload.rt_cd && payload.rt_cd !== "0") {
    throw new Error(payload.msg1 || "KIS request failed.");
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
