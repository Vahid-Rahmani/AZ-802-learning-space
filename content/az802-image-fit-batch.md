# Image-fit and matched-reference batch · 2026-10-10

## Delivered

- Enlargement now uses native image dimensions and aspect ratio. Small images are not stretched; large images shrink to the viewport. The modal sizes to its content instead of filling a fabricated wide window.
- Six original Microsoft-hosted screenshots added: q058 Block Inheritance; q062 Security Filtering; q063 loopback editor; q064 Merge/Replace; q031/q310 GC checkbox; q033 subnet prefix/site selection. Shared workflows expose the same steps from related questions.
- Each reference has its source, credit, actual/unknown Windows version and explicit limitations. No historical image is labeled Server 2025. Existing diagrams remain; question/answer data is unchanged.
- GC screenshot shows a cleared checkbox in a recovery procedure. Its note explicitly says removal is not part of the logon exercise. Subnet screenshot is Server 2012 with blank prefix and no selected site; the exercise still uses the user's actual network prefix.

## Verification

- Real browser at CSS 1280×800: native 288×247 image remained 288×247; native 1920×909 image fit to approximately 1141×540 with its aspect ratio preserved.
- At CSS 390×844: wide image fit to approximately 334×158; DFSR image fit to approximately 334×291. No modal overflow in these cases; close and Escape work.
- Actual Quiz component regression checks all 80 AD bindings, all 106 steps, enlargement, broken-image fallback, exam gating and mobile collapse. Build and targeted lint were run.

## Remaining work

80 AD question bindings are reviewed; 41 walkthroughs contain a reference screenshot, 24 include locally hosted lab captures, and 30 start on a photographed step. This is not a claim that every step is photographed. GPO Modeling, site-link schedules and other unmatched controls remain explicit capture gaps in `ad-visual-image-coverage.md`. Another 328 AZ-802 questions still have no mapped visual walkthrough. This batch continues the project; it does not declare the full project complete.
