import type { ApiErrorResponse, CheckRequest, CheckResponse, SitesResponse } from "../../shared";

export async function fetchSites(): Promise<SitesResponse> {
  const response = await fetch("/api/sites", {
    headers: {
      accept: "application/json",
    },
  });
  return readApiResponse<SitesResponse>(response);
}

export async function runCheck(request: CheckRequest): Promise<CheckResponse> {
  const response = await fetch("/api/check", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });
  return readApiResponse<CheckResponse>(response);
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(
      isApiErrorResponse(payload)
        ? payload.error
        : `Request failed with status ${response.status}.`,
    );
  }
  return payload as T;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error(`Response was not valid JSON for ${response.url}.`);
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    value !== null &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
  );
}
