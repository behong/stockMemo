"use client";

import { useEffect, useState } from "react";

import styles from "./partnership-footer.module.css";

const PARTNER_SITES = [
  {
    name: "HOT 홍지",
    domain: "hot.hongzi.us",
    description: "핸드피키드 전문 사이트",
    href: "https://hot.hongzi.us",
  },
  null,
];

export default function PartnershipFooter() {
  const title = "제휴 문의";
  const subtitle =
    "데이터 제공, 광고, 협업 관련 문의를 환영합니다.";
  const ctaLabel = "제휴 문의하기";
  const site =
    process.env.NEXT_PUBLIC_PARTNERSHIP_SITE || "stockmemo";
  const baseUrl =
    process.env.NEXT_PUBLIC_PARTNERSHIP_BASE || "https://contact.hongzi.us/new";
  const fallbackReturn =
    process.env.NEXT_PUBLIC_SITE_URL || "https://stockmemo.vercel.app/";
  const fallbackHref = `${baseUrl}?site=${site}&return_url=${encodeURIComponent(
    fallbackReturn,
  )}`;
  const [href, setHref] = useState(fallbackHref);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const returnUrl = encodeURIComponent(window.location.href);
    setHref(`${baseUrl}?site=${site}&return_url=${returnUrl}`);
  }, [baseUrl, site]);

  return (
    <section className={styles.footer}>
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

      <div className={styles.card}>
        <div className={styles.text}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <a className={styles.button} href={href}>
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}
