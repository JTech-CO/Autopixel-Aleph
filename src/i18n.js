/* AutoPixel-ℵ — i18n (EN / KO) */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.i18n) return;

  const TX = {
    /* header */
    lang_btn:        { en: '한국어',                    ko: 'ENG' },
    fold_open:       { en: 'Collapse',                  ko: '접기' },
    tip_resize:      { en: 'Drag to make the panel shorter',
                       ko: '드래그해서 패널 높이를 줄입니다' },
    fold_closed:     { en: 'Expand',                    ko: '펼치기' },

    /* section 1 — cell size */
    sec_cell:        { en: 'Cell size',                 ko: '1칸 크기' },
    btn_calib:       { en: 'Calibrate',                 ko: '보정' },
    btn_recalib:     { en: 'Recalibrate',               ko: '다시 보정' },
    lbl_gap:         { en: 'Apart',                     ko: '칸수' },
    lbl_pitch:       { en: 'Cell',                      ko: '1칸' },
    val_unset:       { en: 'not set',                   ko: '미보정' },
    tip_fine:        { en: 'Fine-tune cell size',       ko: '1칸 크기 미세 조정' },
    tip_gap:         { en: 'How many cells apart the two calibration clicks are. Bigger is more accurate.',
                       ko: '보정 클릭 두 지점이 몇 칸 떨어져 있는지. 클수록 정확합니다.' },

    /* section 2 — area */
    sec_area:        { en: 'Area',                      ko: '구획' },
    btn_area:        { en: 'Select area',               ko: '구획 선택' },
    btn_clear:       { en: 'Clear',                     ko: '지우기' },
    lbl_area:        { en: 'Area',                      ko: '구획' },
    val_area:        { en: '{w} × {h} = {n} px',        ko: '{w} × {h} = {n} px' },
    val_area_none:   { en: 'none',                      ko: '없음' },
    lbl_grid:        { en: 'Grid',                      ko: '격자' },
    tip_grid:        { en: 'Draw the grid lines over the selected area',
                       ko: '선택한 구획 위에 격자선을 그립니다' },
    lbl_nudge:       { en: 'Nudge',                     ko: '이동' },
    tip_nudge:       { en: 'Move the area by one cell',
                       ko: '구획을 한 칸씩 이동' },

    /* section 3 — run */
    sec_run:         { en: 'Run',                       ko: '실행' },
    lbl_speed:       { en: 'Speed',                     ko: '속도' },
    sp_safe:         { en: 'Safe',                      ko: '안전' },
    sp_fast:         { en: 'Fast',                      ko: '빠름' },
    sp_turbo:        { en: 'Turbo',                     ko: '터보' },
    sp_custom:       { en: 'Custom',                    ko: '직접' },
    lbl_source:      { en: 'Color',                     ko: '색상' },
    src_overlay:     { en: 'Overlay (i)',               ko: '오버레이 (i)' },
    src_current:     { en: 'Current',                   ko: '현재색' },
    tip_source:      { en: 'Overlay: press i on every cell to pick the template colour. Current: skip i and paint with the colour already selected in the palette (faster, solid fill).',
                       ko: '오버레이: 칸마다 i를 눌러 도안 색을 인식. 현재색: i를 생략하고 팔레트에 이미 선택된 색으로 채움 (더 빠름, 단색 채우기).' },
    lbl_order:       { en: 'Order',                     ko: '순서' },
    ord_snake:       { en: 'Snake',                     ko: '지그재그' },
    ord_rows:        { en: 'Rows',                      ko: '행' },
    ord_cols:        { en: 'Cols',                      ko: '열' },
    ord_random:      { en: 'Random',                    ko: '무작위' },
    lbl_delay:       { en: 'Delay',                     ko: '딜레이' },
    lbl_jitter:      { en: 'Jitter',                    ko: '지터' },
    lbl_limit:       { en: 'Limit',                     ko: '최대' },
    tip_delay:       { en: 'Extra wait between cells, in milliseconds.',
                       ko: '칸 사이 추가 대기 시간 (밀리초).' },
    tip_jitter:      { en: 'Randomises the delay by ± this percentage. No effect when delay is 0.',
                       ko: '딜레이를 ± 이 비율만큼 무작위로 흔듭니다. 딜레이가 0이면 효과 없음.' },
    tip_limit:       { en: 'Maximum cells for this run. 0 paints the whole area.',
                       ko: '이번 실행에서 찍을 최대 칸 수. 0이면 구획 전체.' },
    lbl_frames:      { en: 'Frames',                    ko: '프레임' },
    lbl_move_f:      { en: 'move',                      ko: '이동' },
    lbl_hold_f:      { en: 'hold',                      ko: '누름' },
    lbl_gap_f:       { en: 'gap',                       ko: '간격' },
    lbl_clicks:      { en: 'click',                     ko: '클릭' },
    lbl_guard:       { en: 'Map guard',                 ko: '맵 보호' },
    lbl_cguard:      { en: 'Canvas only',               ko: '캔버스만' },
    tip_guard:       { en: 'Stop automatically when you scroll, drag or type on the page.',
                       ko: '페이지에서 스크롤·드래그·타이핑이 감지되면 자동으로 멈춥니다.' },
    tip_cguard:      { en: 'Skip any cell that is covered by the site UI, so the run never clicks a real button.',
                       ko: '사이트 UI에 가려진 칸은 건너뜁니다. 실제 버튼을 잘못 누르지 않습니다.' },

    btn_start:       { en: 'Start',                     ko: '시작' },
    btn_pause:       { en: 'Pause',                     ko: '일시정지' },
    btn_resume:      { en: 'Resume',                    ko: '재개' },
    btn_stop:        { en: 'Stop',                      ko: '정지' },
    est_speed:       { en: '≈ {rate} px/s · {eta}',     ko: '≈ {rate} px/s · {eta}' },

    /* status line */
    st_need_pitch:   { en: 'Calibrate the cell size to begin',        ko: '1칸 크기 보정부터 시작하세요' },
    st_need_area:    { en: 'Select an area over your template',       ko: '도안 위로 구획을 선택하세요' },
    st_ready:        { en: 'Ready · {n} px',                          ko: '준비됨 · {n} px' },
    st_calib_1:      { en: 'Click the centre of any cell',            ko: '아무 칸의 중앙을 클릭' },
    st_calib_2:      { en: 'Now click a cell {n} cells away',         ko: '이제 {n}칸 떨어진 칸을 클릭' },
    st_calib_same:   { en: 'Same spot — click farther away',          ko: '같은 지점입니다 — 더 멀리 클릭' },
    st_calib_done:   { en: 'Cell ≈ {px} px',                          ko: '1칸 ≈ {px} px' },
    st_area_hint:    { en: 'Drag a box over the template',            ko: '도안 위로 사각형을 드래그' },
    st_area_small:   { en: 'Area too small — drag a bigger box',      ko: '구획이 너무 작습니다 — 더 크게 드래그' },
    st_cancelled:    { en: 'Cancelled',                               ko: '취소됨' },
    st_running:      { en: '{done} / {total} · {rate} px/s · {eta}',  ko: '{done} / {total} · {rate} px/s · {eta}' },
    st_paused:       { en: 'Paused · {done} / {total}',               ko: '일시정지 · {done} / {total}' },
    st_pause_guard:  { en: 'Paused — map input detected',             ko: '일시정지 — 맵 조작 감지' },
    st_pause_hidden: { en: 'Paused — tab is not visible',             ko: '일시정지 — 탭이 보이지 않음' },
    st_stopped:      { en: 'Stopped · {done} / {total}',              ko: '정지됨 · {done} / {total}' },
    st_done:         { en: 'Done · {done} px in {time}',              ko: '완료 · {done} px / {time}' },
    st_offscreen:    { en: '{n} off-screen',                          ko: '{n}칸 화면 밖' },
    st_covered:      { en: '{n} covered by the page',                 ko: '{n}칸 페이지에 가려짐' },
    st_guard_all:    { en: 'Nothing painted: "Canvas only" rejected every cell. Turn it off and retry.',
                       ko: '하나도 못 찍었습니다: "캔버스만"이 모든 칸을 막았습니다. 끄고 다시 시도하세요.' },
    st_resized:      { en: 'Window resized — recalibrate',            ko: '창 크기 변경 — 다시 보정하세요' },

    /* misc */
    aria_panel:      { en: 'AutoPixel-ℵ control panel',               ko: 'AutoPixel-ℵ 제어판' },
    tip_nudge_grid:  { en: 'Shift the whole grid by one pixel, to line it up with the template',
                       ko: '격자 전체를 1px씩 옮겨 도안에 맞춥니다' },
  };

  let lang = 'en';
  const listeners = new Set();

  function t(key, vars) {
    const row = TX[key];
    let s = row ? (row[lang] || row.en || key) : key;
    if (vars) {
      for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
    }
    return s;
  }

  NS.i18n = {
    t,
    get lang() { return lang; },
    set(next) {
      const v = next === 'ko' ? 'ko' : 'en';
      if (v === lang) return;
      lang = v;
      listeners.forEach((fn) => { try { fn(lang); } catch {} });
    },
    toggle() { NS.i18n.set(lang === 'en' ? 'ko' : 'en'); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();
