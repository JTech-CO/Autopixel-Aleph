# AutoPixel

> 2.2.0: 공식 도안 자동 비교 · PNG 재첨부 없음 · 색 확인 후 칠하기 · 안전/빠름/터보 10/20/30px/s 상한.

[English](README.md) | **한국어**

[wplace.live](https://wplace.live/)와 [youplace.live](https://youplace.live/)에서 도안 오버레이를 보고
픽셀을 자동으로 찍어 주는 도구 모음입니다.

| | [**AutoPixel-ℵ**](autopixel-aleph/README-KR.md) | [AutoPixel](legacy/README-KR.md) |
|---|---|---|
| 플랫폼 | 크롬 / 크로미움 확장 (MV3) | Windows + AutoHotkey v2 |
| 입력 방식 | 페이지 내부 합성 이벤트 | 실제 마우스·키보드 |
| 커서 점유 | 없음 | 실행 내내 점유 |
| 상태 | 유지보수 중 | 동결, [LEGACY.md](legacy/LEGACY.md) 참고 |

## AutoPixel-ℵ

도안 위로 선택 영역을 지정하면 격자를 따라가며 칸마다 합성 입력을 보냅니다. 각 단계 사이를 고정
`sleep`이 아니라 **렌더 프레임**으로 기다리는 것이 속도의 핵심이며, 이 방식은
[JTech-CO/wplace-hover](https://github.com/JTech-CO/wplace-hover)에서 가져왔습니다.

- [README](autopixel-aleph/README-KR.md) · [사용법](autopixel-aleph/사용법.md)
- 설치: `chrome://extensions` → 개발자 모드 → **압축해제된 확장 프로그램을 로드** → `autopixel-aleph/`

## 구조

```text
AutoPixel/
├── autopixel-aleph/ # 크롬 확장 (v2.2.0) — 현행
├── autopixel-x/     # 기존 확장 원본 — 변경 없음
├── legacy/          # AHK 레거시와 Aleph 2.1.4 보존본
├── README.md
└── README-KR.md
```

## ⚠️ 주의

두 도구 모두 입력을 자동화합니다. 해당 사이트가 자동화를 제한할 수 있으며 계정 제재를 포함한 결과의
**책임은 전적으로 사용자에게** 있습니다. 본인 계정과 본인 충전량 안에서만 사용하세요. MIT 라이선스.
