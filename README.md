# Believers Choice Ministries website

Launch site for Believers Choice Ministries, Inc. (Fayetteville, Georgia).
Plain HTML, CSS and JavaScript. No build step.

## Run locally
    python3 -m http.server 8000
then open http://localhost:8000

## Brand identity
`brand/index.html` is the brand presentation (animated logo, colors, fonts, templates) with downloads in `brand/downloads/`. Open it at `/brand/` on the live site.

## Structure
- `index.html`: all pages (hash-routed: #home, #story, #pastor, #first-lady, #ministries, #discipleship, #watch, #events, #community, #give, #connect)
- `css/style.css`, `js/app.js`
- `img/`: optimized photos and logo

## Before launch
- Confirm the contact email domain matches the church domain (info@believerschoiceministries.org)
- Add online giving details, contact info, and service times
- Confirm ministry descriptions with Pastor Derek
- Set `og:image` in `index.html` to the full URL of `img/og-share.png` once the domain is live (link previews need an absolute address)
- Phone number and street address are intentionally left off until the church confirms them
