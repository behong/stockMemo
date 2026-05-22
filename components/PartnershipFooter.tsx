"use client";

import { useEffect, useState } from "react";

import styles from "./partnership-footer.module.css";

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
