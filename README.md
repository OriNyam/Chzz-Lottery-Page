# 치지직 추첨기: FAIR VOTE

치지직 채팅 참여자를 대상으로 추첨하는 Cloudflare Pages용 웹 앱입니다.

## 주요 기능

- 치지직 채널 URL 또는 채널 ID 등록
- 채팅 참여자 모집, 구독자 전용 추첨, 기존 당첨자 제외
- 당첨자 전용 채팅창 표시 및 한국어 기본 음성 TTS 재생

## 공정 추첨 방식

- 브라우저 Web Crypto API의 `crypto.getRandomValues()` 사용
- rejection sampling으로 모듈로 편향 제거
- Fisher-Yates 알고리즘으로 후보 전체 셔플
- 셔플된 배열의 첫 번째 참여자를 당첨자로 선정

슬롯 UI는 결과를 보여주는 애니메이션입니다. 당첨자는 애니메이션 시작 전에
공정 추첨 엔진에서 결정됩니다.

## Google Search Console 등록

- 사이트 주소: `https://vote.nyamlovelove.org/`
- 사이트맵: `https://vote.nyamlovelove.org/sitemap.xml`
- 크롤링 설정: `public/robots.txt` — 홈과 정적 리소스 허용, API 경로 제외
- 검색·공유 제목, 설명, 대표 주소와 `WebSite` 구조화 데이터: `index.html`

1. 변경 내용을 배포한 뒤 `/robots.txt`와 `/sitemap.xml`이 정상적으로 열리는지 확인합니다.
2. [Search Console](https://search.google.com/search-console)에 위 사이트 주소를 URL 접두어 속성으로 추가합니다.
3. 소유권 확인 화면의 HTML 태그 방식을 사용하면 Google에서 발급한 `google-site-verification` 메타태그를 `index.html`의 `<head>` 안에 그대로 추가한 뒤 재배포합니다. HTML 파일 방식을 사용하면 발급받은 파일을 이름과 내용 변경 없이 `public/`에 넣고 재배포합니다. 인증값은 계정별로 발급되므로 임의로 작성하지 않습니다.
4. 소유권 확인 후 **Sitemaps**에서 `sitemap.xml`을 제출하고 홈 URL 검사를 진행합니다.

도메인 속성을 선택하면 DNS TXT 레코드로 소유권을 확인해야 합니다. 이미 소유권이 확인된 속성은 해당 인증 방식을 유지하면 됩니다. [Google 소유권 확인 안내](https://support.google.com/webmasters/answer/9008080?hl=ko)

현재 탭은 독립 URL이 없는 앱 내부 상태이므로 사이트맵에는 홈만 포함합니다. 도메인을 변경할 때는 `index.html`, `public/robots.txt`, `public/sitemap.xml`의 주소를 함께 수정합니다.
