[English](README.md) | **한국어**

# StageDeck: DevDay 스타일 키노트 프레젠테이션 스킬

테크 컨퍼런스 키노트의 대형 LED 무대 화면처럼 보이고 움직이는 발표 자료를, **HTML 파일 하나**로 만들어 주는 에이전트 스킬입니다.
**Claude**(Claude Code, claude.ai)와 **Codex**(CLI, ChatGPT 데스크톱 앱)에서 같은 스킬을 씁니다.

> 비공식 프로젝트입니다. OpenAI와 관계가 없으며, DevDay 2026 키노트 영상의 화면 구성과 모션을 프레임 단위로 분석해 처음부터
> 다시 구현했습니다. OpenAI의 로고, 폰트, 이미지, 영상 프레임은 포함하지 않습니다. 데모 속 브랜드(Orbit, Pulse, Relay 등)는 전부 가상입니다.

**데모:** https://lastdance.kr/OPENAI-DevDay-Presentation-Template/
(또는 [`docs/index.html`](docs/index.html)을 내려받아 브라우저로 여세요). →/클릭 다음, ← 이전, F 전체화면, O 전체 보기.

## 설치

### Claude Code: 플러그인 (권장)
```bash
claude plugin marketplace add JiminLee-way/OPENAI-DevDay-Presentation-Template
```
```bash
claude plugin install stagedeck@stagedeck
```
세션 안에서는 `/plugin marketplace add …`, `/plugin install stagedeck@stagedeck`. 실행은 `/stagedeck:stagedeck`이고,
발표 자료를 요청하면 알아서 불러옵니다.

### Claude Code: 개인 스킬로 복사
```bash
git clone https://github.com/JiminLee-way/OPENAI-DevDay-Presentation-Template.git && cd OPENAI-DevDay-Presentation-Template && scripts/install.sh claude
```
`~/.claude/skills/stagedeck/`에 설치되고 `/stagedeck`로 실행합니다.

### claude.ai (웹·데스크톱 앱)
`scripts/package.sh`로 `dist/stagedeck.zip`을 만들거나(Releases에 올라와 있다면 그 파일을 받아서) 설정의 Skills 메뉴에서 업로드합니다.

### Codex: 플러그인
```bash
codex plugin marketplace add JiminLee-way/OPENAI-DevDay-Presentation-Template
```
```bash
codex plugin add stagedeck@stagedeck
```
ChatGPT 데스크톱 앱에서는 Plugins Directory에서 이 마켓플레이스를 골라 설치할 수도 있습니다.

### Codex: 개인 스킬로 복사
```bash
scripts/install.sh codex
```
`~/.agents/skills/stagedeck/`에 설치되고 `$stagedeck`로 실행합니다. Codex 안에서 이렇게 시켜도 됩니다:
`$skill-installer install https://github.com/JiminLee-way/OPENAI-DevDay-Presentation-Template/tree/main/plugins/stagedeck/skills/stagedeck`

## 사용 예
```text
$stagedeck   (Claude Code에서는 /stagedeck:stagedeck)
우리 팀 3분기 제품 발표를 키노트 스타일로 20장 만들어줘. 오프닝은 캐릭터 인트로,
연사 소개는 도트 이름, 지표는 숫자 카운트업, 마지막은 로고 파티클로.
```
에이전트는 스킬 안의 **참고 HTML**(`examples/showcase.html`, 38개 패턴)을 먼저 열고, 필요한 슬라이드를 골라 마크업을 그대로 복사한 뒤
내용만 바꿉니다. 그다음 린트, 단일 HTML 번들까지 진행합니다.

## 무엇이 들어 있나
```
plugins/stagedeck/
  .claude-plugin/plugin.json      Claude Code 플러그인 매니페스트
  plugin.json                     OpenAI 공통 플러그인 매니페스트 (ChatGPT·Codex)
  .codex-plugin/plugin.json       Codex 호환 매니페스트
  skills/stagedeck/               ← 스킬 본체 (Claude·Codex 공용)
    SKILL.md                      작업 순서, 참고 HTML 사용법, 콘텐츠·모션 규칙
    agents/openai.yaml            Codex·ChatGPT 표시 정보
    assets/stagedeck.{css,js}     엔진 (의존성 없음)
    examples/showcase.html        참고 HTML: 패턴 38종
    templates/starter.html        새 덱 시작점
    reference/layouts.md          슬라이드 유형 카탈로그
    reference/motion.md           효과·속성·스프링 프리셋 레퍼런스
    scripts/                      new_deck.sh · check_deck.py · bundle.py
.claude-plugin/marketplace.json   Claude Code 마켓플레이스
.agents/plugins/marketplace.json  Codex 마켓플레이스
docs/index.html                   단일 파일 데모 (GitHub Pages)
docs/research/                    키노트 프레임 분석 노트
scripts/install.sh · package.sh   설치 / 배포 파일 생성
```

## "쫀득한" 모션의 정의
스프링 물리(Apple의 duration + bounce 모델)에 키노트 영상 실측값을 맞춰 정했습니다.
1. **빠른 출발, 끈적하게 긴 안착:** 처음 30% 시간에 대부분 이동하고 약 1초에 걸쳐 멈춥니다.
2. **오버슈트는 한 번, 약 4.6%:** bounce 0.3, 감쇠비 약 0.7.
3. **젤리:** 가로·세로 스케일에 주기가 다른 스프링을 걸어 착지할 때 한 번 찌그러집니다.
4. **투명도는 0.3초, 위치는 1초.** 빠른 이동에는 블러와 진행 방향 늘어남을 줍니다.
5. **어디에 쓰는지가 중요합니다.** 캐릭터·제목·레이아웃 이동에만 쓰고, UI 목업·스크린샷·로고는 0.2–0.4초 페이드로만 등장시킵니다.

## 분석 범위
0:00–17:00은 30초 단위로 연속 분석했고, 17:05–31:00은 30초 구간 10개를 샘플링했으며, 나머지는 10초 간격 썸네일로 구조만 봤습니다.
노트는 [`docs/research/`](docs/research/)에 있습니다.

## 제한
- `.pptx`로 내보내기는 지원하지 않습니다(모션이 유지되지 않음). Chrome에서 인쇄하면 슬라이드마다 한 페이지씩 PDF가 나옵니다.
- 폰트 [Pretendard](https://github.com/orioncactus/pretendard)(OFL)는 CDN에서 불러옵니다. 오프라인이면 시스템 폰트로 바뀝니다.

## License
MIT. 자세한 내용은 [LICENSE](LICENSE)를 보세요.

