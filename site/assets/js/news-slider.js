/* 뉴스 사진 슬라이더 (_includes/news-media.html) — 화살표·카운터 동기화 */
document.querySelectorAll('.news-media.has-many').forEach(function (box) {
  var track = box.querySelector('.news-track');
  var counter = box.querySelector('.news-counter b');
  var total = track.children.length;
  function sync() {
    var w = track.clientWidth || 1;
    var i = Math.round(track.scrollLeft / w) + 1;
    if (counter) counter.textContent = Math.min(Math.max(i, 1), total);
    box.querySelector('.prev').disabled = track.scrollLeft <= 4;
    box.querySelector('.next').disabled = track.scrollLeft >= track.scrollWidth - w - 4;
  }
  box.querySelectorAll('.news-arrow').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      track.scrollBy({ left: track.clientWidth * Number(btn.dataset.dir), behavior: 'smooth' });
    });
  });
  track.addEventListener('scroll', sync);
  window.addEventListener('resize', sync);
  sync();
});
