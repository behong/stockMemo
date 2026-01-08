# Codex 작업 요약 가이드 (Neon 기반 자동 기록 사이트)

## 프로젝트 목표
- 매일 자동으로 “시간별 데이터”를 수집해 DB에 저장
- 날짜별로 누적된 데이터를 표 형태로 조회하는 웹사이트
- DB는 **Neon(PostgreSQL)** 사용
- 초기 버전은 로그인 없이 개인용

---

## 기술 스택
- Next.js (App Router) + TypeScript
- Neon Serverless PostgreSQL
- Prisma ORM
- 배포: Vercel
- 자동 수집 스케줄: GitHub Actions cron
- 타임존 기준: Asia/Seoul

---

## 환경 변수 (.env)
- DATABASE_URL=Neon Postgres connection string
- INGEST_API_KEY=임의의 긴 문자열
- FETCH_MODE=mock | real
- TZ=Asia/Seoul

---Approve thie session

## 데이터 모델 (Prisma)
- 테이블명: Record
- 날짜(date) + 시간(time) 기준으로 1행
- 같은 시간 재수집 시 **upsert**

필드:
- date (YYYY-MM-DD)
- time (HH:MM)
- kospi: 개인 / 외인 / 기관 / 변동(%)
- kosdaq: 개인 / 외인 / 기관 / 변동(%)
- nasdaq 변동(%)
- usdkrw 환율
- createdAt / updatedAt

제약:
- unique(date, time)
- index(date)

---

## API 구현
### POST /api/ingest
- 헤더: x-api-key 검사
- 현재 시각(KST) 기준 date/time 생성
- fetcher에서 데이터 수집
- Prisma upsert로 DB 저장
- 실패 시 저장하지 않고 에러 반환

### GET /api/records?date=YYYY-MM-DD
- date 없으면 오늘(KST)
- 해당 날짜 데이터 time 오름차순 반환

---

## 데이터 수집(fetcher)
- lib/fetchers 구조로 분리
- FETCH_MODE에 따라 분기
  - mock: 랜덤/고정 샘플 데이터
  - real: 실제 데이터 소스 연동(추후)
- fetcher는 항상 동일한 객체 형태 반환

---

## 자동 실행(스케줄)
- GitHub Actions cron 사용
- N분 간격(예: 15분)
- workflow에서 curl로 POST /api/ingest 호출
- INGEST_API_KEY는 GitHub Secrets로 관리
- KST 기준 장중 시간만 실행하도록 조건 처리

---

## UI 요구사항
- `/` 페이지 하나
- 날짜 선택(기본 오늘)
- API에서 데이터 로드 후 테이블 렌더
- 컬럼:
  - 시간
  - 코스피(개인/외인/기관/변동)
  - 코스닥(개인/외인/기관/변동)
  - 나스닥 변동
  - 환율
- 표시 규칙:
  - 숫자 천단위 콤마
  - % 소수점 2자리
  - 음수는 빨강, 양수는 파랑
  - 컬럼별 배경색 고정

---

## 프로젝트 구조
- app/
  - page.tsx
  - api/
    - ingest/route.ts
    - records/route.ts
- lib/
  - db.ts
  - time.ts (KST 처리)
  - format.ts (포맷/색상)
  - fetchers/
- prisma/schema.prisma

---

## 완료 기준
- ingest 호출 시 DB에 시간별 데이터 누적
- 같은 시간 재호출 시 중복 없이 업데이트
- 날짜 변경 시 해당 날짜 데이터 정확히 조회
- UI에서 표 형태로 정상 표시

끝.