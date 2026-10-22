// 讀取與整理 content/site.json。
// 編輯器存檔前、Vite 建置前都會經過 normalizeContent，
// 缺少的欄位補成空值，多餘的欄位丟掉，確保兩邊看到的格式一致。
//
// 內容格式有版本號（version）。之後改格式時，在 migrate() 裡加一段轉換，
// 舊格式的內容會自動轉成新格式，不會因為更新程式而遺失。

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const CONTENT_VERSION = 4

// 經歷在 PDF 履歷裡的顯示方式
export const PDF_MODES = ['auto', 'full', 'brief', 'hide']

// ───────── 舊格式轉換 ─────────

const text = (v) => (typeof v === 'string' ? v.trim() : '')
const splitList = (v) =>
  text(v)
    .split(/[、,，;；]/)
    .map((s) => s.trim())
    .filter(Boolean)

// 作品的語言：接受陣列或用逗號（, ，、）隔開的文字，去掉空白與重複
export function splitLanguages(v) {
  const items = (Array.isArray(v) ? v : String(v ?? '').split(/[,，、]/))
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
  return [...new Set(items)]
}

// 第 1 版：履歷全部放在 about.blocks，用類別標題區分
function fromV1(raw) {
  const out = {
    ...raw,
    about: { heading: raw.about?.heading, lede: raw.about?.lede },
    education: [],
    experience: [],
    skills: [],
    certifications: [],
    interests: [],
  }
  const blocks = Array.isArray(raw.about?.blocks) ? raw.about.blocks : []
  for (const block of blocks) {
    const title = text(block?.title)
    const entries = Array.isArray(block?.entries) ? block.entries : []
    for (const e of entries) {
      if (title === '學歷') {
        out.education.push({ school: e?.title, detail: e?.detail, start: '', end: e?.when })
      } else if (title === '技能') {
        out.skills.push({ title: e?.title, items: splitList(e?.detail).map((name) => ({ name, level: 0 })) })
      } else if (title === '證照') {
        out.certifications.push({ title: e?.title, items: splitList(e?.detail).map((name) => ({ name })) })
      } else if (title === '興趣') {
        out.interests.push({ name: e?.title, detail: e?.detail })
      } else {
        // 工作、研究、教學，以及其他自訂類別，都放進經歷
        out.experience.push({ org: e?.title, role: '', start: '', end: e?.when, detail: e?.detail, duties: [], projects: [] })
      }
    }
  }
  delete out.version
  return out
}

// 第 2 版 → 第 3 版：學歷加「備註」（例如論文題目），經歷加「PDF 顯示方式」
function fromV2(raw) {
  return {
    ...raw,
    education: (Array.isArray(raw.education) ? raw.education : []).map((e) => ({ note: '', ...e })),
    experience: (Array.isArray(raw.experience) ? raw.experience : []).map((e) => ({ pdf: 'auto', ...e })),
  }
}

// 第 3 版 → 第 4 版：作品的「語言」從一項改成多項（languages），拿掉「更新月份」
function fromV3(raw) {
  return {
    ...raw,
    projects: (Array.isArray(raw.projects) ? raw.projects : []).map((p) => {
      const { language, updated, ...rest } = p || {}
      return { ...rest, languages: splitLanguages(rest.languages ?? language) }
    }),
  }
}

// 判斷內容是第幾版格式。版本號是第 2 版才加的，沒有版本號的舊檔用內容結構判斷：
// 有 about.blocks 是第 1 版，否則是第 2 版
export function versionOf(raw) {
  const v = Number(raw?.version)
  if (Number.isInteger(v) && v > 0) return v
  return Array.isArray(raw?.about?.blocks) ? 1 : 2
}

// 依序把舊格式一版一版轉到最新
export function migrate(raw) {
  const from = versionOf(raw)
  if (from > CONTENT_VERSION) {
    throw new Error(`內容是第 ${from} 版格式，比這份程式（第 ${CONTENT_VERSION} 版）新，請先更新程式`)
  }
  let data = raw
  if (from < 2) data = fromV1(data)
  if (from < 3) data = fromV2(data)
  if (from < 4) data = fromV3(data)
  // 之後改格式時接在這裡：if (from < 5) data = fromV4(data)
  return { data, from }
}

const str = (v) => (typeof v === 'string' ? v : '').replace(/\r\n/g, '\n').trim()
const arr = (v) => (Array.isArray(v) ? v : [])

// 一行一項的清單：接受陣列或多行文字，去掉空行
const lines = (v) =>
  (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map(str).filter(Boolean)

// 熟練度：0（未設定）到 5
const level = (v) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(5, Math.max(0, n)) : 0
}

export function normalizeContent(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('內容格式不正確')
  }
  const { data: raw } = migrate(input)

  const content = {
    version: CONTENT_VERSION,
    site: {
      name: str(raw.site?.name),
      intro: str(raw.site?.intro),
    },
    about: {
      heading: str(raw.about?.heading) || '關於我',
      lede: str(raw.about?.lede),
    },

    // 學歷：學校、系所與學位、起迄年份、備註（例如論文題目）
    education: arr(raw.education).map((e) => ({
      school: str(e?.school),
      detail: str(e?.detail),
      start: str(e?.start),
      end: str(e?.end),
      note: str(e?.note),
    })),

    // 經歷：職稱、公司（單位）、起迄年份、說明、細節工作（一行一項）、底下的專案、PDF 顯示方式
    experience: arr(raw.experience).map((e) => ({
      org: str(e?.org),
      role: str(e?.role),
      start: str(e?.start),
      end: str(e?.end),
      detail: str(e?.detail),
      duties: lines(e?.duties),
      projects: arr(e?.projects).map((p) => ({
        name: str(p?.name),
        detail: str(p?.detail),
      })),
      pdf: PDF_MODES.includes(e?.pdf) ? e.pdf : 'auto',
    })),

    // 技能：類別＋技能（各有 0～5 的熟練度）
    skills: arr(raw.skills).map((g) => ({
      title: str(g?.title),
      items: arr(g?.items).map((s) => ({
        name: str(s?.name),
        level: level(s?.level),
      })),
    })),

    // 證照：大項＋證照名稱，不記年份
    certifications: arr(raw.certifications).map((g) => ({
      title: str(g?.title),
      items: arr(g?.items).map((c) => ({ name: str(c?.name) })),
    })),

    // 興趣：名稱＋說明，不記年份
    interests: arr(raw.interests).map((i) => ({
      name: str(i?.name),
      detail: str(i?.detail),
    })),

    contact: {
      email: str(raw.contact?.email),
      orcid: str(raw.contact?.orcid),
      github: str(raw.contact?.github),
    },

    projects: arr(raw.projects).map((project) => ({
      name: str(project?.name),
      description: str(project?.description),
      languages: splitLanguages(project?.languages),
      url: str(project?.url),
    })),
  }

  if (!content.site.name) {
    throw new Error('網站名稱不能空白')
  }
  return content
}

export function readContent(file) {
  return normalizeContent(JSON.parse(readFileSync(file, 'utf-8')))
}

// 你的內容在 site.json；還沒建立時先用範例內容。
// content/private/ 放只給 PDF 履歷用、不上傳的資料（名字、電話、照片）。
export function contentPaths(root) {
  return {
    contentFile: join(root, 'content', 'site.json'),
    exampleFile: join(root, 'content', 'site.example.json'),
    backupDir: join(root, 'content', 'backups'),
    privateDir: join(root, 'content', 'private'),
    profileFile: join(root, 'content', 'private', 'profile.json'),
    outputDir: join(root, 'output'),
  }
}

// 只存在本機的履歷資料
export function normalizeProfile(raw) {
  return {
    name: str(raw?.name),
    phone: str(raw?.phone),
    photo: /^photo\.(jpg|png|webp)$/.test(raw?.photo || '') ? raw.photo : '',
  }
}
