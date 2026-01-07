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
  rt_cd?: string;
  msg1?: string;
};

const globalForKis = globalThis as unknown as { kisToken?: TokenCache };

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

  const token = await requestToken();
  globalForKis.kisToken = token;
  return token.accessToken;
}

export async function kisGet<T>(
  path: string,
  trId: string,
  query: Record<string, string>,
): Promise<T> {
  const baseUrl = getRequiredEnv("KIS_BASE_URL");
  const appKey = getRequiredEnv("KIS_APP_KEY");
  const appSecret = getRequiredEnv("KIS_APP_SECRET");
  const accessToken = await getAccessToken();

  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
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

  const output = payload.output ?? payload.output1;
  if (!output) {
    throw new Error("KIS response missing output.");
  }

  return output;
}
