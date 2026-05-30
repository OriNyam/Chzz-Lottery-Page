# FAIR CHZZK DRAW

치지직 채팅 참여자를 대상으로 추첨하는 Cloudflare Pages용 웹 앱입니다.

## 공정 추첨 방식

- 브라우저 Web Crypto API의 `crypto.getRandomValues()` 사용
- rejection sampling으로 모듈로 편향 제거
- Fisher-Yates 알고리즘으로 후보 전체 셔플
- 셔플된 배열의 첫 번째 참여자를 당첨자로 선정

슬롯 UI는 결과를 보여주는 애니메이션입니다. 당첨자는 애니메이션 시작 전에
공정 추첨 엔진에서 결정됩니다.

## 로컬 실행

```bash
npm install
npm run dev
```

Vite 개발 서버가 `/api/proxy/*` 요청을 치지직 API로 전달합니다.

## Cloudflare Pages 배포

- Build command: `npm run build`
- Build output directory: `dist`

`functions/api/proxy/*`의 Pages Functions가 배포 환경에서 치지직 API 요청을
전달합니다.

로컬에서 Pages Functions까지 함께 확인하려면 빌드 후 아래 명령을 실행합니다.

```bash
npm run pages:dev
```

Wrangler로 직접 배포할 때는 아래 명령을 사용합니다.

```bash
npm run deploy
```
