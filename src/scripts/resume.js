// 履歷裡可以原地展開的列：經歷底下的專案、技能的熟練度。
// 點一下展開，再點一下收起；收起時裡面的連結不會被 Tab 鍵選到。

for (const button of document.querySelectorAll('.toggle[aria-controls]')) {
  const panel = document.getElementById(button.getAttribute('aria-controls'))
  if (!panel) continue

  panel.inert = true

  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true'
    button.setAttribute('aria-expanded', String(open))
    panel.classList.toggle('open', open)
    panel.inert = !open
  })
}
