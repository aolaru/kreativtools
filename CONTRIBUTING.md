# Contributing to Kreativ Tools

Kreativ Tools is maintained as a stable, privacy-first browser utility library. Contributions are welcome when they make the existing project safer, clearer, more accessible, more reliable, or easier to maintain.

## Good contribution scope

- Fix broken tool behavior, redirects, metadata, links, or downloads.
- Improve browser, mobile, keyboard, screen-reader, or file-format compatibility.
- Reduce unnecessary dependencies, page weight, or duplicated code.
- Correct documentation, legal pages, setup instructions, or third-party notices.
- Add regression coverage for a bug that can be reproduced locally.

## Changes that need discussion first

- New generic tools, categories, workflows, or editorial articles.
- Server-side file processing, accounts, analytics, advertising, or payment features.
- Repositioning the product, changing its privacy model, or widening its maintenance scope.
- Major visual redesigns or dependency replacements.

Open an issue before investing time in one of these changes. The project is intentionally not pursuing catalogue growth by default.

## Local workflow

1. Fork the repository and create a focused branch.
2. Install dependencies with `npm install`.
3. Run `npm run sync:site` after changes that affect shared layout, metadata, navigation, or footers.
4. Test with `npm test`. For a first local run, install Chromium with `npx playwright install chromium`.
5. Submit a pull request that explains the user-facing problem, the smallest fix, and the verification performed.

Serve the root locally with `python3 -m http.server 4173` when manually checking pages.

## Generated files and source of truth

Canonical pages use clean routes such as `pdf/merge/index.html`. Legacy top-level `*.html` pages are generated redirect aliases and should not be edited directly.

`scripts/sync-site.js` applies the shared header, footer, common metadata, and redirect aliases. Run it after changing shared site structure and commit its output with the source change.

## Privacy and dependencies

Tool files should remain in the visitor's browser. Do not add analytics, tracking pixels, advertising scripts, or remote upload services without a documented maintainer decision.

Before adding a library, pin its version, document it in `THIRD_PARTY_NOTICES.md`, and confirm that its license is compatible with the project and its distribution method.

## Code and pull requests

- Keep a pull request limited to one problem whenever possible.
- Use plain, user-facing language in visible copy.
- Preserve the existing static-site approach unless the issue specifically requires a structural change.
- Do not include real personal documents or sensitive files in fixtures, screenshots, or issues.
- Follow the behavior rules in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE). Do not submit code copied from another project unless you have the right to contribute it and its license is compatible with this repository and its third-party dependencies.
