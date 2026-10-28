# Maintenance Review

Kreativ Tools is a static utility library in maintenance mode. Do not add tools, articles, monetization, or new workflows while this review is active.

## Approved exception

On October 28, 2026, the maintainer requested PDF Page Organizer and PDF to Images as targeted additions using the existing local PDF libraries. This exception covers those two tools and their offline packaging and tests, not a general catalogue expansion.

## Review date

Review the project on **November 27, 2026**. This is a 60-day observation window from the simplified tool-directory rollout on September 28, 2026.

## Evidence to check

- Cloudflare Web Analytics: visits, page views, top landing pages, referrers, and repeat use of the focused tools.
- Google Search Console: non-branded impressions, clicks, indexing errors, and the pages that receive search traffic.
- Referral traffic from the three related Kreativ sites.

Set up Search Console as a `kreativtools.com` Domain property with the TXT record supplied by Google. Domain properties require DNS verification and cover all protocols and subdomains.

## Decision rule

Keep the site unchanged if it has a clear strategic use for another Kreativ product or shows meaningful non-branded search or referral traffic. Otherwise, freeze it permanently: keep the domain and repository online, apply only security or compatibility fixes, and do not resume catalogue expansion.

## Cross-link checklist

Apply these links only after the current unrelated work in the destination repositories is committed or otherwise resolved:

- Kreativ WP: link ecommerce and site-performance content to Image Compress, Image Resize, Image to WebP, and Font to Webfont.
- Kreativ Sound: link audio export or sharing content to Audio to MP3 and Audio Trim.
- Made by Kreativ: link practical file-preparation references to PDF Fill & Sign, PDF Merge, and PDF Split.

Use outcome-focused anchor text such as "compress product images" or "merge PDF handoff files". Link to the specific tool, not the Kreativ Tools homepage.
