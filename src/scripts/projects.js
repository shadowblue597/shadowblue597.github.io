// 作品集頁：依網址 # 後面的語言篩選，例如 /projects/#Python。
// 一個作品有多種語言時，只要其中一種符合就會顯示。

const list = document.getElementById('projectList')
const empty = document.getElementById('projectEmpty')
const chips = [...document.querySelectorAll('.chip')]

function applyFilter() {
  const wanted = decodeURIComponent(location.hash.slice(1))
  let shown = 0
  for (const item of list.children) {
    const match = !wanted || (item.dataset.langs || '').split('|').includes(wanted)
    item.hidden = !match
    if (match) shown++
  }
  for (const chip of chips) {
    if (chip.dataset.filter === wanted) chip.setAttribute('aria-current', 'true')
    else chip.removeAttribute('aria-current')
  }
  empty.hidden = shown > 0
}

if (list) {
  window.addEventListener('hashchange', applyFilter)
  applyFilter()
}
