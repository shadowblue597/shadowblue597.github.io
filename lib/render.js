// 建置時在 Node 端執行：把 content/site.json 的內容轉成 HTML 片段，
// 取代版型裡的 <!-- render:名稱 參數 --> 註解。

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c])

// 首頁顯示的作品數
export const HOME_PROJECT_COUNT = 3

// 多行文字：空一行分段；整段每行都以「- 」開頭的，排成條列；段內單一換行保留
function richText(text) {
  return String(text ?? '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim())
      if (lines.every((l) => /^[-・•]\s*/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${esc(l.replace(/^[-・•]\s*/, ''))}</li>`).join('')}</ul>`
      }
      return `<p>${lines.map(esc).join('<br>')}</p>`
    })
    .join('')
}

// 起迄年份："2018 ~ 2020"；只有起 → "2018 ~ 至今"；只有迄 → "2020"
function period(start, end) {
  if (start && end) return `${start} ~ ${end}`
  if (start) return `${start} ~ 至今`
  return end || ''
}

// 所有作品用到的語言，依第一次出現的順序（一個作品可以有多種語言）
export function languagesOf(projects) {
  const seen = []
  for (const p of projects) {
    for (const lang of p.languages) {
      if (!seen.includes(lang)) seen.push(lang)
    }
  }
  return seen
}

function contactLinks(contact) {
  const links = []
  if (contact.github) links.push({ label: 'GitHub', href: contact.github })
  if (contact.orcid) links.push({ label: 'ORCID', href: contact.orcid })
  if (contact.email) links.push({ label: '寫信給我', href: `mailto:${contact.email}` })
  return links
}

// ───────── 履歷的各區 ─────────

function cvBlock(title, items, render, className = 'cv') {
  if (!items.length) return ''
  return `
      <div class="cv-block">
        <h3>${title}</h3>
        <ul class="${className}">${items.map(render).join('')}
        </ul>
      </div>`
}

const when = (start, end) => {
  const text = period(start, end)
  return text ? `<span class="when">${esc(text)}</span>` : ''
}

// 可以原地展開的一列：沒有可展開的內容時就是普通的一列
function expandable({ id, head, between = '', panel }) {
  if (!panel) {
    return `
          <li class="entry">
            <div class="row">${head}</div>${between}
          </li>`
  }
  return `
          <li class="entry">
            <button type="button" class="row toggle" aria-expanded="false" aria-controls="${id}">${head}</button>${between}
            <div class="reveal" id="${id}"><div class="reveal-inner"><div class="reveal-body">${panel}</div></div></div>
          </li>`
}

function educationItem(e) {
  return `
          <li class="entry">
            <div class="row">
              <span class="what"><b>${esc(e.school)}</b>${e.detail ? `<span class="detail">${esc(e.detail)}</span>` : ''}${e.note ? `<span class="note">${esc(e.note)}</span>` : ''}</span>
              ${when(e.start, e.end)}
            </div>
          </li>`
}

// 可以點開的列，名稱旁邊放一個小標籤，帶一個會翻轉的箭頭
const moreTag = (label) => `<span class="more-tag">${label}<span class="chev" aria-hidden="true"></span></span>`

// 先職稱、再公司，各佔一行；沒有職稱時，公司（單位）就放第一行
function experienceItem(e, i) {
  const count = e.projects.length ? moreTag(`${e.projects.length} 個專案`) : ''
  const first = e.role || e.org
  const second = e.role ? e.org : ''
  const head = `
              <span class="what"><span class="name"><b>${esc(first)}</b>${count}</span>${second ? `<span class="org">${esc(second)}</span>` : ''}${e.detail ? `<span class="detail">${esc(e.detail)}</span>` : ''}</span>
              ${when(e.start, e.end)}`
  const duties = e.duties.length
    ? `\n            <ul class="duties">${e.duties.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`
    : ''
  const panel = e.projects.length
    ? e.projects
        .map((p) => `<div class="proj"><h4>${esc(p.name)}</h4>${p.detail ? `<div class="rich">${richText(p.detail)}</div>` : ''}</div>`)
        .join('')
    : ''
  return expandable({ id: `job-${i + 1}`, head, between: duties, panel })
}

function stars(levelValue) {
  return `<span class="stars" role="img" aria-label="熟練度 ${levelValue}／5"><span class="on">${'★'.repeat(levelValue)}</span><span class="off">${'★'.repeat(5 - levelValue)}</span></span>`
}

function skillItem(g, i) {
  const items = g.items.filter((s) => s.name)
  // 這個類別裡有任何一項設定了熟練度，才可以展開看星數
  const rated = items.some((s) => s.level > 0)
  const head = `
              <span class="what"><span class="name"><b>${esc(g.title)}</b>${rated ? moreTag('熟練度') : ''}</span>${items.length ? `<span class="detail">${items.map((s) => esc(s.name)).join('、')}</span>` : ''}</span>`
  const panel = rated
    ? `<ul class="levels">${items.map((s) => `<li><span>${esc(s.name)}</span>${s.level ? stars(s.level) : ''}</li>`).join('')}</ul>`
    : ''
  return expandable({ id: `skill-${i + 1}`, head, panel })
}

function certItem(g) {
  const items = g.items.filter((c) => c.name)
  return `
          <li class="entry">
            <div class="what"><b>${esc(g.title)}</b>${items.length ? `<ul class="certs">${items.map((c) => `<li>${esc(c.name)}</li>`).join('')}</ul>` : ''}</div>
          </li>`
}

function interestItem(it) {
  return `
          <li class="entry">
            <div class="what"><b>${esc(it.name)}</b>${it.detail ? `<div class="rich muted">${richText(it.detail)}</div>` : ''}</div>
          </li>`
}

function contactBlock(contact) {
  const others = contactLinks(contact).filter((l) => !l.href.startsWith('mailto:'))
  if (!contact.email && !others.length) return ''
  return `
      <div class="cv-block">
        <h3>聯絡</h3>
        <ul class="cv contact">
          ${contact.email ? `<li><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></li>` : ''}
          ${others.length ? `<li class="links">${others.map((l) => `<a href="${esc(l.href)}">${l.label}</a>`).join('')}</li>` : ''}
        </ul>
      </div>`
}

// ───────── 版型裡的各個區塊 ─────────

// 一個作品：名稱、說明、每種語言一個標籤。data-langs 給作品集的篩選用（用 | 隔開）
function projectItem(p) {
  const name = p.url ? `<a href="${esc(p.url)}">${esc(p.name)}</a>` : esc(p.name)
  const tags = p.languages.map((l) => `<span class="tag">${esc(l)}</span>`).join('')
  return `
        <li data-langs="${esc(p.languages.join('|'))}">
          <div class="title">${name}</div>
          ${p.description ? `<p class="excerpt">${esc(p.description)}</p>` : ''}
          ${tags ? `<div class="meta">${tags}</div>` : ''}
        </li>`
}

const renderers = {
  head(c, pageTitle) {
    const title = pageTitle ? `${pageTitle}｜${c.site.name}` : c.site.name
    // 請搜尋引擎不要收錄這一頁、也不要沿著頁面上的連結繼續爬
    return `<meta name="robots" content="noindex, nofollow">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(c.site.intro)}">`
  },

  masthead(c, page, { base }) {
    const onProjects = page === 'projects'
    const current = (yes) => (yes ? ' aria-current="page"' : '')
    const langs = languagesOf(c.projects)
      .map((l) => `<li><a href="${base}projects/#${encodeURIComponent(l)}">${esc(l)}</a></li>`)
      .join('\n              ')
    const foot = contactLinks(c.contact)
      .map((l) => `<a href="${esc(l.href)}">${l.label}</a>`)
      .join('\n      ')

    return `<header class="masthead" id="masthead">
    <div class="identity">
      <a class="site-name" href="${base}">${esc(c.site.name)}</a>
      <div class="intro-wrap">
        <p class="site-intro" id="siteIntro">${esc(c.site.intro)}</p>
      </div>
    </div>

    <button class="tab" id="menuTab" aria-expanded="false" aria-controls="menuPanel">
      <span class="label">目錄</span>
    </button>

    <nav class="panel" id="menuPanel" aria-label="網站目錄">
      <ul class="menu">
        <li><a href="${base}"${current(page === 'home')}>首頁</a></li>
        <li>
          <button aria-expanded="${onProjects}" aria-controls="sub-work">作品集<span class="caret" aria-hidden="true"></span></button>
          <div class="sub" id="sub-work">
            <ul>
              <li><a href="${base}projects/"${current(onProjects)}>全部作品</a></li>
              ${langs}
            </ul>
          </div>
        </li>
      </ul>
      ${foot ? `<div class="panel-foot">\n      ${foot}\n      </div>` : ''}
    </nav>
  </header>`
  },

  // 桌機分兩欄：左欄學歷、經歷；右欄技能、證照、興趣、聯絡。手機與平板依序排成一欄。
  resume(c) {
    const main = [
      cvBlock('學歷', c.education.filter((e) => e.school || e.detail), educationItem),
      cvBlock('經歷', c.experience.filter((e) => e.org || e.role || e.detail), experienceItem),
    ].join('')
    const side = [
      cvBlock('技能', c.skills.filter((g) => g.title || g.items.some((s) => s.name)), skillItem),
      cvBlock('證照', c.certifications.filter((g) => g.title || g.items.some((x) => x.name)), certItem),
      cvBlock('興趣', c.interests.filter((i) => i.name), interestItem),
      contactBlock(c.contact),
    ].join('')

    return `<section class="about" aria-labelledby="h-about">
      <h2 id="h-about">${esc(c.about.heading)}</h2>
      ${c.about.lede ? `<div class="lede">${richText(c.about.lede)}</div>` : ''}
      <div class="cv-grid">
        <div class="cv-col">${main}
        </div>
        <div class="cv-col side">${side}
        </div>
      </div>
    </section>`
  },

  'projects-top'(c, _arg, { base }) {
    if (!c.projects.length) return ''
    const shown = c.projects.slice(0, HOME_PROJECT_COUNT).map(projectItem).join('')
    const more =
      c.projects.length > HOME_PROJECT_COUNT
        ? `\n      <p class="see-all"><a href="${base}projects/">看全部作品</a></p>`
        : ''
    return `<section aria-labelledby="h-work">
      <h2 id="h-work">作品</h2>
      <ul class="entries">${shown}
      </ul>${more}
    </section>`
  },

  'projects-all'(c) {
    const chips = languagesOf(c.projects)
      .map((l) => `<a class="chip" href="#${encodeURIComponent(l)}" data-filter="${esc(l)}">${esc(l)}</a>`)
      .join('\n        ')
    return `<section aria-labelledby="h-all">
      <h2 id="h-all">作品集</h2>
      <nav class="filters" aria-label="依語言篩選">
        <a class="chip" href="#" data-filter="" aria-current="true">全部</a>
        ${chips}
      </nav>
      <ul class="entries" id="projectList">${c.projects.map(projectItem).join('')}
      </ul>
      <p class="empty" id="projectEmpty" hidden>這個分類還沒有作品。</p>
    </section>`
  },

  footer(c) {
    return `<footer class="site">© ${new Date().getFullYear()} ${esc(c.site.name)}</footer>`
  },
}

export function renderPlaceholders(html, content, ctx) {
  return html.replace(/<!--\s*render:([\w-]+)(?:[ \t]+([^>]*?))?\s*-->/g, (_, name, arg) => {
    const render = renderers[name]
    if (!render) throw new Error(`版型裡有不認得的區塊：render:${name}`)
    return render(content, arg?.trim(), ctx)
  })
}
