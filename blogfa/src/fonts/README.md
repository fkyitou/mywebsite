# Vazirmatn, self-hosted

The blog's typeface, Vazirmatn (weights 300 to 900 in one variable font), in the three subsets Google Fonts serves:
`arabic` (Persian letters, Persian digits and punctuation), `latin` and `latin-ext`. `fonts.json` lists each file with
the `unicode-range` Google gives it, so a browser downloads only the subsets a page uses (on this blog: arabic and
latin, about 79 KB).

`tools/build.mjs` copies the files into `dist/cdn/` under content-hashed names and writes their `@font-face` rules at
the top of every stylesheet with relative addresses. The font therefore comes from the same jsDelivr address and the
same pinned commit as the stylesheet (or from the backup address that served the stylesheet), and the CDN templates
preload the arabic subset. The Google Fonts stylesheet, which held back the first paint and needed two more servers,
is gone.

Copyright 2015 The Vazirmatn Project Authors. Licensed under the SIL Open Font License 1.1 (`OFL.txt`).
