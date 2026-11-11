# SmartBus v2.0 — integration QA

Latest result: passed

Date: 2026-11-09. Scope: preserve the approved homepage geometry, integrate the colleague's phone carousel and secondary pages, correct their containers and redesign Contacts.

## Sources and implementation

- Geometry baseline: v2.0 `2fbf6b7ba2ac52162b2f1be24d61180bb190b6c8`, original production build `05Lq_mrjsakt3Ua3Cv1Tp`, port 3012.
- Imported content/reference: `smartbus-site` main `10b580015b700bdea26fd5ebeb6f5104f82aa740`, port 3013.
- Integrated production build: `Ho9RwQ39TkoVZP4orEXFd`, port 3014.
- Visual pairs: 1440×900, DPR 1, reduced motion, necessary cookies. The original and updated screenshots are combined side by side. Geometry was also measured at 360, 390, 440, 700, 701, 768, 1024, 1279, 1280, 1920, 2560 and 3840 px.
- Source geometry, typography and content were inspected before changes. Browser fallback: in-app browser timed out; verification used Chrome and WebKit through Playwright.

## Design contract

The shared `components/home/home.css` is the single source for frame widths, text insets, fonts, radii and responsive scaling. Secondary page roots use `sb-home sb-inner-page`; frame containers use `sb-section`; text headings use `--frame-padding`. At 1440 px, the frame starts at x=40 and the text axis at x=98. BICUBIK and Garet continue to load through the existing optimized Next font configuration. No second global design system or font-face bundle was imported.

The homepage heading/left tracking content, Hero, Legal and Process retain their original layout. Only the right tracking scene changes: controlled three-phone carousel, synchronized buttons, arrows, dots, keyboard controls and reduced-motion support. The footer and header reuse v2 markup and styles. The drawer contains Articles, Documents and Contacts; its logo returns home.

Articles use full-frame photography with neutral dark overlays. Documents align headings to the text axis and folder covers to the frame axis. Contacts use two phone cards, three email directions and a wide office map; contact facts remain those of the imported source. A hidden line break no longer joins adjacent words on compact layouts.

## Verification

- Production build, TypeScript, typography check and `git diff --check`: passed.
- 533 protected geometry records across 13 widths: zero differences from v2.0 (rectangles, font sizes, line heights, weights and padding).
- 28 secondary-page/viewport checks: no horizontal overflow, broken images or page errors. Articles index, article detail, Documents and Contacts checked from 360 to 1920 px.
- 48 Chrome interaction checks and 24 WebKit interaction checks: passed. Drawer/focus, carousel modes and keyboard, article navigation/likes, PDF canvas/text rendering, zoom, rotation, focus restoration, inquiry prefill, preservation of a 1000-character message, contact links and map loading gate were exercised.
- 47 follow-up checks: passed. Article contents, folder scrolling, both license pages, legal reader zoom, container alignment and visible header on short/tall pages; includes 700/701 px and 1024×1366.
- Desktop/mobile comparison images were inspected for typography, spacing, wrapping, colors, image crops, icons and active states. No unresolved P1/P2 finding remains in this scope.

## Repairs found during integration

- Preserve a long user-entered comment instead of exceeding the API's 1000-character limit when adding an automatic subject.
- Keep the secondary-page header available even when the footer enters a tall viewport; homepage behavior remains unchanged.
- Focus the document trigger explicitly before opening the modal so Safari restores focus when it closes.
- Make carousel controls and PDF actions at least 44 px; correct folder offset after the shared list reset.

## Test boundaries and artifacts

Final form tests use mocks: network interception in Chrome and a browser fetch mock in WebKit. WebKit did not honor network interception during an earlier pass; two synthetic local entries were removed. No delivery credentials were configured and no external message was sent. The live delivery integration was not changed or revalidated.

Evidence and reproducible browser scripts are saved locally in `output/playwright/integration-2026-11-09/`. `release-protected-diff.json` is empty. Visual acceptance of the redesigned Contacts page remains with the user; the local preview is ready for review.
