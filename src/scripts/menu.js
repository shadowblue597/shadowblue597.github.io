// 書籤選單開合、往下捲時收起簡介

const root = document.documentElement
const tab = document.getElementById('menuTab')
const panel = document.getElementById('menuPanel')
const label = tab.querySelector('.label')
const masthead = document.getElementById('masthead')
const intro = document.getElementById('siteIntro')

const isOpen = () => tab.getAttribute('aria-expanded') === 'true'

function setOpen(open) {
  tab.setAttribute('aria-expanded', String(open))
  panel.classList.toggle('open', open)
  label.textContent = open ? '收起' : '目錄'
}

tab.addEventListener('click', () => setOpen(!isOpen()))

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen()) {
    setOpen(false)
    tab.focus()
  }
})

// 點選單以外的地方就收起
document.addEventListener('click', (e) => {
  if (isOpen() && !panel.contains(e.target) && !tab.contains(e.target)) setOpen(false)
})

// 點了選單裡的連結也收起（同一頁換篩選時用得到）
panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)))

// 子選單開合
panel.querySelectorAll('.menu > li > button').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.setAttribute('aria-expanded', String(btn.getAttribute('aria-expanded') !== 'true'))
  })
})

// 量出簡介完整展開時的高度，讓內文從頂端下方開始
function measureIntro() {
  if (intro) root.style.setProperty('--intro-h', `${intro.scrollHeight}px`)
}
measureIntro()
window.addEventListener('resize', measureIntro)
document.fonts?.ready.then(measureIntro)

// 往下捲時收起簡介
function onScroll() {
  masthead.classList.toggle('scrolled', window.scrollY > 24)
}
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()
