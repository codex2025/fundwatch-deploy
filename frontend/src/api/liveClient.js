import { auth } from '../firebase';

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`;

async function req(path, options = {}) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Request failed (${res.status})` }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export function fetchCases(status) {
  const q = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
  return req(`/cases${q}`);
}

export function fetchCase(caseId) {
  return req(`/cases/${caseId}`);
}

export function generateCases() {
  return req(`/cases/generate`, { method: "POST" });
}

export function actOnNotice(caseId, action, text) {
  return req(`/cases/${caseId}/notice`, {
    method: "PATCH",
    body: JSON.stringify({ action, text }),
  });
}

export function submitAgencyResponse(caseId, text, documents) {
  return req(`/cases/${caseId}/response`, {
    method: "PATCH",
    body: JSON.stringify({ text, documents }),
  });
}

export function submitMPVerification(caseId, status, notes) {
  return req(`/cases/${caseId}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
}

export function resolveCase(caseId, outcome, notes) {
  return req(`/cases/${caseId}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ outcome, notes }),
  });
}

export function fetchAudit(caseId) {
  const q = caseId ? `?case_id=${encodeURIComponent(caseId)}` : "";
  return req(`/audit${q}`);
}

export function fetchCompliance() {
  return req(`/compliance`);
}

export function fetchGovernance() {
  return req(`/governance`);
}

export function fetchPublicSummary() {
  return req(`/public/summary`);
}
