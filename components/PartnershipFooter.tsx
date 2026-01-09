"use client";

import { useEffect, useState } from "react";

import styles from "./partnership-footer.module.css";

export default function PartnershipFooter() {
  const title = "\uC81C\uD734 \uBB38\uC758";
  const subtitle =
    "\uB370\uC774\uD130 \uC81C\uACF5, \uAD11\uACE0, \uD611\uC5C5 \uAD00\uB828 \uBB38\uC758\uB97C \uD658\uC601\uD569\uB2C8\uB2E4.";
  const ctaLabel = "\uC81C\uD734 \uBB38\uC758\uD558\uAE30";
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
