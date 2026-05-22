"use client";

import styles from "./partnership-footer.module.css";

const PARTNER_SITES = [
  {
    name: "핫딜존",          // ← 여기서 이름 변경
    domain: "hot.hongzi.us",   // ← 여기서 도메인 변경
    description: "오늘의 핫딜",  // ← 여기서 설명 변경
    href: "https://hot.hongzi.us",
  },
  null,
];

export default function PartnerSiteGrid() {
  return (
    <section className={styles.partnerSection}>
      <h2 className={styles.sectionTitle}>제휴 사이트</h2>
      <div className={styles.partnerGrid}>
        {PARTNER_SITES.map((partner, i) =>
          partner ? (
            <a
              key={partner.domain}
              className={styles.partnerCard}
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.partnerName}>{partner.name}</span>
              <span className={styles.partnerDomain}>{partner.domain}</span>
              <span className={styles.partnerDesc}>{partner.description}</span>
            </a>
          ) : (
            <div key={i} className={`${styles.partnerCard} ${styles.partnerEmpty}`}>
              <span className={styles.partnerEmptyLabel}>광고 / 제휴 문의</span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
