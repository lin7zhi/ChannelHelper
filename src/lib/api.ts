const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://your-hf-space.hf.space'

let initData = ''

export function setInitData(data: string) {
  initData = data
}

export function getInitData() {
  return initData
}

async function request(path: string, method = 'GET', body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Init-Data': initData,
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API_BASE}${path}`, opts)
  return res.json()
}

export async function fetchData() {
  return request('/api/data')
}

export async function addGroup(data: { name: string; src: string; tgt: string[] }) {
  return request('/api/groups', 'POST', data)
}

export async function deleteGroup(idx: number) {
  return request(`/api/groups/${idx}`, 'DELETE')
}

export async function addChannel(id: string, name: string) {
  return request('/api/channels', 'POST', { id, name })
}

export async function deleteChannel(cid: string) {
  return request(`/api/channels/${encodeURIComponent(cid)}`, 'DELETE')
}

export async function addStat(data: Record<string, unknown>) {
  return request('/api/stats', 'POST', data)
}

export async function editStat(idx: number, field: string, value: string) {
  return request(`/api/stats/${idx}`, 'PUT', { field, value })
}

export async function deleteStat(idx: number) {
  return request(`/api/stats/${idx}`, 'DELETE')
}

export async function addDir(data: Record<string, unknown>) {
  return request('/api/dirs', 'POST', data)
}

export async function editDir(idx: number, field: string, value: string) {
  return request(`/api/dirs/${idx}`, 'PUT', { field, value })
}

export async function deleteDir(idx: number) {
  return request(`/api/dirs/${idx}`, 'DELETE')
}

export async function sendBtnNew(data: Record<string, unknown>) {
  return request('/api/btn_new', 'POST', data)
}

export async function sendBtnNewMedia(formData: FormData) {
  const res = await fetch(`${API_BASE}/api/btn_new_media`, {
    method: 'POST',
    headers: { 'X-Init-Data': initData },
    body: formData,
  })
  return res.json()
}

export async function sendBtnOld(data: Record<string, unknown>) {
  return request('/api/btn_old', 'POST', data)
}

export async function sendBtnMulti(data: Record<string, unknown>) {
  return request('/api/btn_multi', 'POST', data)
}

export async function genDir(chId: string) {
  return request('/api/gen_dir', 'POST', { ch_id: chId })
}

export async function replaceTag(data: Record<string, unknown>) {
  return request('/api/replace_tag', 'POST', data)
}

export async function startBackup(data: Record<string, unknown>) {
  return request('/api/backup', 'POST', data)
}

export async function backupMembers(chId: string) {
  return request('/api/backup_members', 'POST', { ch_id: chId })
}

export async function batchCreate(data: Record<string, unknown>) {
  return request('/api/batch_create', 'POST', data)
}

export async function healthCheck() {
  return request('/api/health')
}
