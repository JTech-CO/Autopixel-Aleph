/* AutoPixel-ℵ — i18n (EN / KO) */
(() => {
  'use strict';
  const NS = (window.__APX = window.__APX || {});
  if (NS.i18n) return;

  const TX = {
    "diag_verify": {en:"Check {phase}: target {expected}, selected {selected}, attempt {attempt}",ko:"확인 {phase}: 목표 {expected}, 결과 {selected}, {attempt}회"},
    "verify_prepare": {en:"prepare",ko:"준비"},
    "verify_pending": {en:"previous response",ko:"이전 응답"},
    "verify_arm": {en:"picker",ko:"피커"},
    "verify_sample": {en:"sample",ko:"색 추출"},
    "verify_retry-color": {en:"retry",ko:"재확인"},
    "verify_paint": {en:"paint",ko:"칠하기"},
    "verify_done": {en:"done",ko:"완료"},
    "verify_deferred": {en:"unpainted",ko:"미도색"},
    "verify_idle": {en:"idle",ko:"대기"},

    'compare_native-picker': {en:'Could not activate the picker. Open the game paint controls and retry.',ko:'피커 전환을 확인하지 못했습니다. 게임의 페인트 창을 연 뒤 다시 시작하세요.'},
    'compare_native-pending': {en:'Still waiting for the previous sample. Retry after it completes; reload the game only if it never responds.',ko:'이전 색 추출 응답을 기다리는 중입니다. 색 선택이 끝난 뒤 다시 시작하세요. 응답이 계속 없을 때만 게임을 새로고침하세요.'},
    st_deferred: {en:'{n} cells left unpainted after color retries',ko:'색 재확인 실패 {n}칸 미도색'},

    "compare_native-alliance-reopen": {en:"Reopen the official Alliance overlay once so its original pixels can be read.",ko:"원본 픽셀을 읽을 수 있도록 Alliance 공식 도안을 한 번 닫았다 다시 열어 주세요."},
    "compare_auto": { en: "Official auto", ko: "공식 자동" },
    "compare_manual": { en: "PNG snapshot", ko: "PNG 비교" },
    "tip_native_auto": { en: "Keep the official build overlay visible. No PNG or size input. Two i presses arm the picker; paint follows only after the sampled color is confirmed. The official incorrect-pixel highlight is enabled during a run and restored afterward.", ko: "공식 도안의 빌드 화면을 열어 두세요. PNG·크기 입력 없이 읽습니다. i 두 번 후 색 추출이 확인되어야 칠합니다. 실행 중 공식 오색 표시를 켜고 종료 시 복원합니다." },
    "compare_native-ready": { en: "Official overlay: auto-read at Start", ko: "공식 도안: 시작 시 자동 비교" },
    "compare_native-current": { en: "Current color: official overlay checks inactive", ko: "현재색: 공식 도안 비교 미적용" },
    "compare_native-modules": { en: "Stopped: official site modules not detected. Reload the updated extension and game tab, then reopen the official template.", ko: "중단: 공식 사이트 모듈을 감지하지 못했습니다. 수정된 확장과 게임 탭을 새로고침한 뒤 공식 도안을 다시 여세요." },
    "compare_native-module-load": { en: "Stopped: official site module failed to load. Reload the game tab and reopen the official template.", ko: "중단: 공식 사이트 모듈을 불러오지 못했습니다. 게임 탭을 새로고침하고 공식 도안을 다시 여세요." },
    "compare_native-protocol": { en: "Stopped: official site data structure has changed. The adapter needs an update.", ko: "중단: 공식 사이트의 데이터 구조가 달라 연결할 수 없습니다. 호환성 수정이 필요합니다." },
    "compare_native-unsupported": { en: "Stopped: unreadable official template data or coordinates. No unchecked paint.", ko: "중단: 공식 도안의 데이터 또는 좌표를 읽을 수 없습니다. 미확인 칸은 칠하지 않았습니다." },
    "compare_native-overlay": { en: "Open the visible official build overlay, then retry.", ko: "공식 도안의 빌드 화면에서 도안을 표시한 후 다시 시작하세요." },
    "compare_native-canvas": { en: "Stopped: selected canvas does not match the official map.", ko: "중단: 선택한 캔버스와 공식 도안 지도가 일치하지 않습니다." },
    "compare_native-loading": { en: "Stopped: official pixel comparison is not ready. Wait for the overlay to finish loading.", ko: "중단: 공식 픽셀 비교가 아직 준비되지 않았습니다. 도안 로딩 완료 후 다시 시작하세요." },
    "compare_native-color": { en: "Stopped: template color cannot be confirmed.", ko: "중단: 도안의 정확한 색상을 확인할 수 없습니다." },
    "compare_native-session": { en: "Stopped: overlay session changed. Start again.", ko: "중단: 도안 상태가 바뀌었습니다. 다시 시작하세요." },
    "compare_native-timeout": { en: "Stopped: official overlay did not respond. Reload the game tab.", ko: "중단: 공식 도안 응답이 없습니다. 게임 탭을 새로고침하세요." },
    "compare_native-selection": { en: "Stopped before painting: sampled color was not confirmed.", ko: "칠하기 전 중단: 색상 확인 실패. 확인되지 않은 색은 칠하지 않았습니다." },
    btn_anchor: { en: 'Set image top-left', ko: '도안 좌상단 지정' },
    btn_capture: { en: 'Read board with native overlay hidden', ko: '오버레이 숨긴 실제 그림 읽기' },
    compare_native: { en: 'Native Wplace', ko: 'Wplace 자체 도안' },
    compare_separate: { en: 'Separate canvas', ko: '분리 캔버스' },
    tip_native_capture: { en: 'Native Wplace: hide its template overlay, set artwork opacity to 100%, and Read board once. Restore the overlay before Start. Do not pan or zoom. Read again after painting.',
      ko: 'Wplace 자체 도안을 잠시 숨기고 그림 불투명도를 100%로 맞춘 뒤 아래 버튼을 누르세요. 도안을 다시 켜고 시작합니다. 지도 이동·확대 및 칠하기 후에는 다시 읽으세요.' },
    st_anchor_hint: { en: 'Click the centre of the original image’s top-left pixel', ko: '원본 이미지의 맨 왼쪽 위 픽셀 중앙을 클릭하세요' },
    compare_disabled: { en: 'Skipping disabled', ko: '건너뛰기 꺼짐' },
    'compare_no-image': { en: 'No PNG: transparency and color skipping inactive', ko: 'PNG 없음: 투명·동일 색상 건너뛰기 미적용' },
    compare_anchor: { en: 'Set image top-left: selection and PNG sizes differ', ko: 'PNG와 구획 크기가 다릅니다: 도안 좌상단을 지정하세요' },
    'compare_no-board': { en: 'Transparency ready; choose a board for color comparison', ko: '투명 칸 준비됨 · 동일 색상 비교용 캔버스를 선택하세요' },
    'compare_alpha-only': { en: 'Current color: template transparency only', ko: '현재색: 도안의 투명 칸만 건너뜀' },
    compare_capture: { en: 'Transparency ready; read the overlay-free board for color comparison', ko: '투명 칸 준비됨 · 동일 색상은 오버레이 숨긴 그림을 먼저 읽으세요' },
    compare_ready: { en: 'Transparency and exact-color comparison ready', ko: '투명·동일 색상 건너뛰기 준비됨' },
    compare_reading: { en: 'Reading actual board…', ko: '실제 그림 읽는 중…' },
    'compare_no-render': { en: 'No render: move the cursor over the canvas while reading', ko: '새 렌더 없음: 읽기 중 캔버스 위로 포인터를 이동하세요' },
    compare_unreadable: { en: 'Board unreadable: reload game tab after updating extension', ko: '그림 읽기 실패: 확장 업데이트 후 게임 탭을 새로고침하세요' },
    diag_timing: { en: 'Frame {frame}ms · input {paint}ms/cell · compare {compare}ms/cell', ko: '프레임 {frame}ms · 입력 {paint}ms/칸 · 비교 {compare}ms/칸' },
    shape_rect: { en: 'Rectangle', ko: '사각형' },
    shape_ellipse: { en: 'Ellipse', ko: '타원' },
    shape_lasso: { en: 'Freehand', ko: '자유곡선' },
    sel_replace: { en: 'Replace', ko: '새로 선택' },
    sel_add: { en: 'Add', ko: '추가' },
    sel_subtract: { en: 'Subtract', ko: '빼기' },
    lbl_comparison: { en: 'Skip matching pixels · setup', ko: '동일 색상 건너뛰기 · 설정' },
    tip_comparison: { en: 'Load the original PNG cropped to the selection bounds (1 image pixel = 1 grid cell), then choose the actual board canvas, not a template overlay. Transparent template pixels are skipped. Nothing is uploaded.',
      ko: '선택 영역의 외곽 크기에 맞춘 원본 PNG를 불러오세요 (이미지 1px = 격자 1칸). 도안 오버레이가 아닌 실제 그림 캔버스를 선택하세요. 투명한 도안 칸도 건너뜁니다. 파일은 전송하지 않습니다.' },
    lbl_skip: { en: 'Skip exact colors', ko: '정확한 색상 건너뛰기' },
    btn_refresh: { en: 'Refresh', ko: '새로고침' },
    select_canvas: { en: 'Choose actual board canvas', ko: '실제 그림 캔버스 선택' },
    st_compare_ready: { en: 'Comparison ready (overlay color mode)', ko: '비교 준비됨 (오버레이 색상 모드)' },
    st_compare_setup: { en: 'Choose a canvas and a PNG matching the selection width × height.', ko: '캔버스와 구획 가로×세로 칸수에 맞는 PNG가 필요합니다.' },
    st_template_error: { en: 'Cannot read image (maximum 1 million pixels).', ko: '이미지를 읽지 못했습니다 (최대 100만 픽셀).' },
    st_lasso_hint: { en: 'Trace an outline; release to close it', ko: '원하는 외곽선을 그린 후 놓으면 닫힙니다' },
    st_area_invalid: { en: 'Invalid or oversized area (maximum 1 million cells)', ko: '영역이 유효하지 않거나 너무 큽니다 (최대 100만 칸)' },
    st_matching: { en: '{n} already correct', ko: '{n}칸 동일 색상' },
    st_transparent: { en: '{n} transparent', ko: '{n}칸 투명' },
    st_compare_unknown: { en: 'No valid board data; matching colors were not skipped', ko: '유효한 그림 데이터 없음: 동일 색상 건너뛰기 미적용' },
    st_error: { en: 'Run stopped after an error. Recalibrate and retry.', ko: '오류로 중단되었습니다. 다시 보정 후 시도하세요.' },
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
    val_area:        { en: '{w} × {h} · {n} px',        ko: '{w} × {h} · {n} px' },
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
    sp_safe:         { en: 'Safe 10',                      ko: '안전 10' },
    sp_fast:         { en: 'Fast 20',                      ko: '빠름 20' },
    sp_turbo:        { en: 'Turbo 30',                     ko: '터보 30' },
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
    st_area_hint:    { en: 'Drag the selected shape over the template',            ko: '도안 위로 선택한 모양을 드래그' },
    st_area_small:   { en: 'Area too small — drag a bigger box',      ko: '구획이 너무 작습니다 — 더 크게 드래그' },
    st_cancelled:    { en: 'Cancelled',                               ko: '취소됨' },
    st_running:      { en: '{done}/{total} · {rate} px/s · skip {skipped} · {eta}', ko: '{done}/{total} · {rate} px/s · 건너뜀 {skipped} · {eta}' },
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
