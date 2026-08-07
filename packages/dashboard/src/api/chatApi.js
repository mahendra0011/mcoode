import { api } from './client.js';

// ── API Keys ──

export async function listKeys() {
  const { data } = await api.get('/keys');
  return data;
}

export async function saveKey({ providerId, envVar, displayName, apiKey }) {
  const { data } = await api.post('/keys', { providerId, envVar, displayName, apiKey });
  return data;
}

export async function deleteKey(id) {
  const { data } = await api.delete(`/keys/${id}`);
  return data;
}

export async function listModels() {
  const { data } = await api.get('/keys/models');
  return data; // { models, providers, hasKeys }
}

export async function testKey({ providerId, apiKey }) {
  const { data } = await api.post('/keys/test', { providerId, apiKey });
  return data; // { valid }
}

// ── Workspaces ──

export async function listWorkspaces() {
  const { data } = await api.get('/workspaces');
  return data; // { workspaces }
}

export async function createZipWorkspace(formData) {
  const { data } = await api.post('/workspaces', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data; // { workspace }
}

export async function createGitWorkspace({ name, repoUrl, branch, branchName }) {
  const { data } = await api.post('/workspaces', { name, source: 'git', repoUrl, branch, branchName });
  return data;
}

export async function listFiles(workspaceId) {
  const { data } = await api.get(`/workspaces/${workspaceId}/files`);
  return data; // { files: [{ path, name }] }
}

export async function readFile(workspaceId, filePath) {
  const { data } = await api.get(`/workspaces/${workspaceId}/file`, { params: { path: filePath } });
  return data; // { path, content }
}

export async function writeFile(workspaceId, filePath, content) {
  const { data } = await api.put(`/workspaces/${workspaceId}/file`, { content }, { params: { path: filePath } });
  return data; // { ok }
}
