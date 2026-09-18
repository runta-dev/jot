# Headed Linux Chrome

`npm run dev` bootstraps the repo Linux Chromium (OrbStack/Docker), then
connects Jot over CDP. This is headed Chromium on Xvfb, not `--headless`.

Sign in at the printed VNC URL (`http://127.0.0.1:6080/vnc.html`). The
profile is `.cache/linux-chrome-profile`.

```sh
npm run dev
npm run chrome:linux -- down
```

`JOT_BROWSER_CDP=0 npm run dev` keeps the previous local Mac Chrome path.
