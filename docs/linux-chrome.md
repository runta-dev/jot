# Browser runtime

Default is **local headed Chrome** with a shared Jot profile. That is the
light path for Google sign-in on this Mac. `npm run dev` does not build a
Linux image.

Optional Linux Chromium (heavier):

```sh
JOT_BROWSER_CDP=1 npm run chrome:linux -- up
JOT_BROWSER_CDP=1 npm run dev
```
