# My Website Build Standards

A reusable brief for any AI, developer, or designer building a website for me.
Use this as a starting specification and as acceptance criteria before handoff.

Updated with reusable lessons from BuildGuyana, Chinese Takeaway, and Johnson
Rise & Shine. These are design references, not claims that their implementations
are fully secure or production-ready.

## How to use this document

Start a project with this instruction:

> Read `WEBSITE_BUILD_STANDARDS.md` and apply it throughout this project. Identify
> which requirements apply, implement them from the beginning, and verify them
> before saying the website is ready. Tell me what works, what is demo-only, and
> what still needs configuration. Follow my current project instructions where
> they differ from this guide.

For restaurants, also read `RESTAURANT_WEBSITE_STANDARDS.md`.
These are my preferences, not a requirement to reuse a particular framework,
hosting service, database, brand, or layout. Do not add restaurant features to an
unrelated website. Do not turn optional integrations into blockers for a demo.

## 1. The outcome I want

- A polished, useful website that I can confidently present to the people I am
  building it for, even when the first version is a clearly identified demo.
- Working journeys rather than attractive screens connected to dead buttons.
- A design adapted to the actual business, with its real branding and content.
- Sensible defaults and steady progress without repeatedly asking me to approve
  routine, reversible implementation decisions.
- Honest explanations of what is implemented and what is still incomplete.
- Reusable foundations so the same interaction and accessibility problems do not
  have to be fixed separately on every project.

## 2. Establish the scope before building

Determine the business, audience, main user goal, required pages, and intended
presentation or production workflow. Inspect existing code and instructions first.

Record or infer, where possible:

- Business name, logo, banner, colors, contact details, and supplied images.
- The primary action visitors should take and the steps needed to complete it.
- Which content the owner must be able to edit without changing source code.
- Whether this is a static informational site, interactive demo, or live service.
- Currency, locale, time zone, and any project-specific operating rules.
- Hosting constraints, backend requirements, and which integrations already exist.

Ask only for information that prevents useful progress or would materially change
an important decision. Continue independent work while waiting. Keep unknown
business details explicit; do not invent prices, testimonials, opening hours,
addresses, availability, or claims that something is live.

## 3. Branding and presentation

- Use the exact assets I supply when available. Check the repository before
  asking me to upload something again.
- Place a supplied banner prominently where it makes sense, usually near the top
  of the homepage. Preserve important text, logos, and the full composition.
- Avoid cropping readable banner artwork just to fill a fixed-height container.
- Use the brand consistently in navigation, page titles, footer, and metadata.
- Include a favicon from the start. Use the **same approved symbol as the header
  logo**, with matching colors, silhouette, and corner treatment. Do not substitute
  a different symbol merely because it relates to the same industry. BuildGuyana's
  hammer logo should have a hammer favicon, not another construction symbol.
- Make a simplified small-size version only when the approved mark needs it for
  legibility. Prefer a self-contained SVG or suitable raster asset; the favicon
  must not depend on a webfont loading. Verify it at actual browser-tab size.
- Use intentional typography, spacing, alignment, and a restrained color system.
- Give content a clear reading order. Avoid clutter, arbitrary decoration, and
  repeated competing calls to action.
- Use meaningful image descriptions. Decorative images should not add unnecessary
  screen-reader noise. Missing images must not leave broken-image placeholders.
- Make the design feel appropriate to the business; do not automatically copy
  this restaurant project's warm palette or Chinese seal into unrelated projects.

### Visible build version: increase it with every code edit

- Keep a visible build version on the website, following BuildGuyana's small
  version label beside the brand. Keep it readable without competing with the
  business name, and make the current build easy to identify on mobile too.
- **Every completed code edit must increase the build version**, including bug
  fixes, styling, text/content changes in code, favicon changes, configuration
  changes, and changes that are not yet deployed. Do not leave the old version
  displayed after editing the website.
- Count each completed change as one increment, even when that change touches
  several files. Do not increment for each keystroke, generated output file,
  test run, or redeployment of unchanged code. Further edits after that completed
  change require another increment.
- My convention is a cumulative edit/build counter written with dots, **not
  semantic versioning**. BuildGuyana's `v1.1.0` represents build **110**; I have
  edited that project at least 110 times. Do not interpret this as one major
  release and one minor release, or reset the number for a redesign.

### Multilingual translation placeholder

Unless I request otherwise, include a visible translation placeholder while real
multilingual support is being prepared. Use one button whose label changes every
**5 seconds**, continuously looping through these six languages in this order:

| Language | Button label |
| --- | --- |
| English | Translation |
| Spanish | Traducción |
| Simplified Chinese | 翻译 |
| Portuguese | Tradução |
| Dutch | Vertaling |
| French | Traduction |

- Keep the button's dimensions fixed so changing labels never shift nearby content.
- Use a gentle text fade between labels; respect reduced-motion settings by
  disabling the fade while preserving the five-second label cycle.
- Give the button a stable accessible name. Do not announce every automatic label
  change to screen readers. Mark each visible label with its correct language.
- Apply the shared button standards, including 44px targets and visible focus.
- Place it prominently without crowding navigation or causing mobile overflow.
- Until actual translations are connected, clicking it shows **“Translations
  coming soon.”** Do not imply that the website's content has been translated.
- Once multilingual support is implemented, the same control should open a real
  language selector instead of the placeholder message.
- The planned languages are English, Spanish, Chinese, Portuguese, Dutch, and
  French. Confirm regional variants when implementing real translations.
- Store and remember the visitor's selected language when real selection exists.
  The rotating placeholder itself does not change the website language.


## 4. Button design: implement this from the beginning

Use a shared button component or shared styles across the website.

### Hierarchy

| Level | Use | Appearance | Examples |
| --- | --- | --- | --- |
| Primary | Main action in the current task or section | Solid, high-contrast fill | Save changes, Book appointment, Place order |
| Secondary | Supporting or alternative action | Outlined or subtle surface | View details, Edit item, Keep order |
| Tertiary | Lower-priority action | Plain text with a clear interactive treatment | Reset filters, Cancel editing |
| Destructive | An action that removes or cancels something | Clearly differentiated danger treatment, proportional to its importance | Remove item, Confirm cancellation |

Do not style every action as primary. A destructive confirmation can be a solid
button; the initial destructive trigger can be secondary or tertiary.

### Signifiers and labels

- Make every button recognizably clickable with deliberate padding, shape, and
  a visible surface, border, or text-action treatment.
- Prefer concise, action-oriented labels of one to three words when possible.
- Replace vague labels such as Submit or OK with the actual result: Save dish,
  Send enquiry, Confirm booking, or Publish changes.
- Longer labels are acceptable when needed for clarity, such as an order total.
- Icon-only actions need an accessible name describing the action and target.
  A cart minus button should describe which item's quantity it decreases.
- Use a button for an action and a link for navigation. Style navigation that
  acts as a call to action consistently with the button hierarchy.
- Specify `type="button"` for non-submit buttons inside forms.

### States and accessibility

- Minimum touch target: **44 × 44 CSS pixels**, including icon-only controls.
- Text-to-background contrast: target **at least 4.5:1**, including hover states.
  Keep disabled controls readable while visibly muted.
- Hover: subtle color change or lift; do not make content jump around.
- Active: a slight press-down effect or another clear pressed state.
- Focus-visible: an obvious keyboard outline with enough offset to be seen.
- Disabled: clearly muted, not-allowed cursor, and genuinely non-interactive.
- Loading: show an action-specific label and prevent accidental duplicate submits.
- Honor reduced-motion preferences. Do not rely on motion or color alone to
  communicate state. Give adjacent controls enough separation to avoid misclicks.

## 5. Responsive layout and numerical content

- Design for phones, tablets, and desktop, including intermediate widths.
- Test representative widths such as 320, 390, 713, 768, 1024, and 1440 pixels.
- No overlapping text, prices, badges, controls, dialogs, or sticky headers.
- Do not hide a layout problem by clipping essential content or shrinking touch
  targets. Fix the layout itself.
- Let prices and counts use the width their text requires. Do not force a long
  formatted amount into a narrow fixed-width box.
- Give quantities, amounts, and remove controls separate grid cells or otherwise
  guarantee they cannot collide.
- Wrap or stack content when the available space is insufficient. Test long
  names, large prices, multi-digit quantities, and both empty and full states.
- Use appropriate number formatting and tabular figures for prices and totals.
- Sticky headers must not obscure headings, anchors, or automatically opened forms.

## 6. Forms, editors, and feedback

- Use visible labels, appropriate input types, helpful examples, and clear units.
- Validate required fields and explain errors near the relevant input.
- Preserve entered data when validation or a request fails.
- Prevent duplicate submissions while saving and clearly report success or failure.
- Do not display success until the underlying operation has succeeded.
- When Edit or Add opens a form elsewhere on the page, **scroll it into view and
  focus its first useful field**. Account for the sticky header.
- Support reopening the same editor, saving, cancelling, and returning to the list.
- Make confirmation prompts clear about the affected item and outcome. Include
  an obvious way to keep the current state without making the change.
- Display loading, empty, error, success, and disabled states intentionally.
- Announce useful status messages accessibly without repeatedly interrupting users.

## 7. Owner-editable content and images

When an owner dashboard is in scope, identify editable content at the start:
text, prices, availability, categories, images, notices, and relevant settings.

For editable images:

- Support image URLs and file uploads where appropriate, with a preview.
- Let the owner replace or remove the image, not only add one when creating an item.
- Validate supported types and size limits, and explain those limits in the UI.
- Disable saving while a required upload is still in progress.
- Apply the image to the actual public content after saving, not just the editor.
- Preserve image changes after reload according to the selected storage mode.
- Handle failed uploads, invalid URLs, missing files, and full browser storage.
- Keep demo images browser-local; persist live images through authenticated storage.

## 8. Demo mode and production mode

A demo should be useful enough to present the real journey without requiring
production credentials. It must be clearly identified as a demo.

- Make the important demo interactions work: editing content, selecting options,
  submitting a demo transaction, and reviewing the result where relevant.
- A public demo access code may unlock local presentation tools if requested.
  It is a convenience gate, not secure authentication.
- A demo code must never grant database access, become a live API credential,
  or bypass production authorization.
- Demo mode must not silently fall through to production writes or payments.
- State that local demo changes belong to that browser/device and do not sync.
- Demonstrate how to reset demo data without accidentally resetting a live system.
- Keep real admin keys, service-role keys, and backend credentials on the server.
- Do not ask an owner to paste a database service-role key into a browser login.
- Use actual authentication and authorization for live administration.

## 9. Persistence, recovery, and synchronization

If a user creates something they may need later, plan its recovery flow from the
start: confirmations, references, receipts, bookings, orders, or saved enquiries.

- Provide a useful confirmation and explain how to return to it.
- Where appropriate, offer a browser-saved History or Recent activity view.
- Keep stored data minimal and distinguish demo from live entries.
- Clearly state the scope: same browser, signed-in account, or cross-device.
- Handle reloads, returning visits, back navigation, empty history, and storage errors.
- Synchronize visible counts and relevant state within the page and between tabs.
- If automatically copying a reference is appropriate, attempt it after success.
  Browser rejection must not turn a successful transaction into an apparent failure.
- Provide a manual Copy action and selectable text as fallbacks. Only claim
  something was copied when the clipboard operation actually succeeded.

## 10. Security and data correctness

- Validate permissions and important business rules on the server for live actions.
- Never trust a disabled client button as the only enforcement of a rule.
- Validate inputs, quantities, prices, state transitions, and ownership as relevant.
- Keep privileged infrastructure credentials and passwords out of client bundles,
  URLs, saved documentation, and public output. Customer recovery tokens belong
  only in their intended private confirmation/recovery flows.
- Return only the data a visitor is entitled to see; owner-only details must not
  accidentally appear in public tracking or confirmation responses.
- Make repeat submissions and retries safe where possible. Use conditional or
  transactional updates for actions that can race with another user or staff member.
- Do not apply remote database migrations, change production permissions, delete
  live data, or introduce paid services unless that action is authorized.
- Do not treat a demo access code as a production security mechanism.

## 11. Hosting and sharing

I need to be able to see and share the result, not just be told to run a command.

- Explain how to run the project locally, including its normal development command.
- Prepare the intended hosting workflow and publish when authorized.
- A static host such as GitHub Pages does not run server APIs or a database backend.
  Use a clearly separated static demo export or choose suitable server hosting.
- Test deployment-specific paths: navigation, public images, favicon, assets,
  direct links, and page reloads under a project subdirectory.
- Never deploy secrets or local environment files in a public static artifact.
- Distinguish code pushed, build passed, deployment running, and public site verified.
- Do not claim a URL is live simply because its address can be predicted.
- If settings or access block publication, prepare everything possible first and
  give me the exact remaining action and the relevant settings link.

## 12. Quality checks before calling it ready

Use checks appropriate to the scope; do not substitute a dummy passing test for
a real journey. Do not claim live integrations were tested when only mocks ran.

- Build and relevant type checks pass, or remaining failures are explained.
- The main visitor journey works from start through confirmation and recovery.
- Every visible action works or has an honest, useful unavailable state.
- Owner edits appear on the public site and survive reload in the intended mode.
- Layout holds at small, intermediate, and large widths with realistic edge cases.
- Button targets, contrast, focus, hover, active, disabled, and loading states work.
- Keyboard navigation and reduced-motion behavior are usable.
- Empty, invalid, failed, repeated, and cancelled operations behave sensibly.
- Counts, totals, and statuses remain consistent across the relevant views.
- Demo flows do not call live APIs or mutate production data.
- The translation placeholder cycles through all six labels every five seconds,
  stays the same size, and gives an honest coming-soon response until enabled.
- Deployment assets and direct page links work at the actual hosted path.
- No secrets or private customer details are accidentally exposed.

## 13. Handoff I expect

Keep the final explanation concise and practical:

1. What changed and how I use it.
2. What was actually verified.
3. The website link, if publication was authorized and completed.
4. Anything still demo-only, untested, or requiring external configuration.
5. Any precise next action I need to take.

Save reusable setup and operating instructions in the repository. Prefer finishing
an authorized task over repeatedly asking whether to continue. Respect existing
work and avoid unrelated rewrites or feature expansion.

## 14. Customer access: no account unless the journey needs one

- For service businesses like Johnson Rise & Shine, visitors should be able to
  browse services, contact the business, and submit a request without signing up
  or logging in. Do not introduce customer accounts as a default feature.
- Separate customer access from staff access. A business needing an admin
  dashboard does not mean customers need accounts too.
- Add customer accounts only when the approved scope calls for an ongoing private
  experience, such as saved bookings or account history. Explain the need first.
- Keep the main journey obvious: understand the service, request it, receive
  confirmation, and know how to follow up. State clearly that no account is needed.

## 15. Staff login and management

- Use a dedicated, clearly labelled staff/admin login, separate from the public
  request journey. Do not confuse it with a customer login or offer unnecessary
  public registration.
- Follow Johnson Rise & Shine's focused login layout: a readable, narrow form
  card, generous space, consistent brand colors, a clear heading, and one primary
  sign-in action. Adapt the styling to each business rather than copying its palette.
- Include visible field labels, email and password inputs, keyboard support,
  password-manager autocomplete, a forgot-password route, and a way back to the
  public website. Placeholders alone are not labels.
- Provide clear loading, submission, success, and failure states. Prevent repeated
  sign-in clicks while a request is pending. Password recovery messages must not
  reveal whether an email address has an account.
- Support password recovery, password changes, and logout where staff accounts
  are required. Recovery links must return to the intended environment and page.
- Verify staff authorization on the server and in database access rules. A hidden
  link, successful login, or client-side dashboard check is not authorization.
- Give staff a practical workflow: distinguish pending requests from accepted or
  completed work, show customer references, and expose the actions they need.
  Add exports, settings, and filters only where they serve the actual business.
- Show loading, empty, failed, and stale data as different states. Never present
  a failed query as “No requests.” Confirm an action succeeded before reporting it.

## 16. Service requests and follow-up

- Use plain-language service cards and a request form tailored to the business.
  Offer a clear primary action and a useful alternative contact route, such as
  WhatsApp, without making visitors hunt for either.
- Collect only information needed to handle the request. Clearly distinguish
  required fields from optional details; use suitable local phone, date, address,
  currency, and business-time-zone conventions.
- Preserve entered details through validation failures. Where draft autosave is
  useful, explain it, minimize stored personal data, give it a defined expiry,
  and clear it after confirmed submission. Do not store credentials in form drafts.
- Validate on the server as well as in the browser. Keep consent explicit and
  separate from proof that a conversation or other external action occurred.
- Confirm a request only after the backend confirms it was saved. Display a
  stable customer-facing reference, explain how to save it, and use the same
  reference in staff views and follow-up messages. A reference is not a login
  credential and must not grant access to private customer information.
- Distinguish “request received” from “booking confirmed” or “work accepted.”
  Explain the next step without inventing a response-time promise.
- Where appropriate, offer “Submit Request” and “Submit & Continue on WhatsApp.”
  Both should save through the same verified flow; WhatsApp is a follow-up option,
  not proof that the database save or message delivery succeeded.
- Build WhatsApp messages from ordinary text and real line breaks, then encode
  once. Include the reference and relevant details without adding unnecessary
  personal information. Keep a working link available if automatic opening fails.
- Floating contact buttons must not cover form controls, messages, consent
  controls, or mobile navigation.

## 17. Errors, recovery, and abuse protection

- Show errors in plain language near the relevant field or action. For a form-level
  failure, bring the error banner into view and move focus appropriately, respecting
  reduced-motion preferences and avoiding disruptive focus changes while typing.
- Clear loading states on success, rejection, timeout, network failure, and
  unexpected responses. A failed request must not leave buttons stuck forever.
- Distinguish validation, CAPTCHA, rate-limit, configuration, and save failures.
  Do not label every server error as a CAPTCHA error.
- Preserve the form when submission fails. If the save result is uncertain, say
  so and provide a safe follow-up route rather than encourage blind resubmission.
  Use durable duplicate protection where repeated submissions can cause harm.
- Apply abuse protection without making customers create accounts. Use appropriate
  server validation, request-size limits, CAPTCHA, and reliable server-side rate
  limiting. Test concurrent requests and failures; do not claim an in-memory
  counter provides shared protection across serverless instances.
- Keep secrets and internal database errors out of browser bundles, public messages,
  source control, and shared logs. Use safe diagnostic codes or support references
  to investigate failures without exposing keys or customer details.

## 18. Verify the complete journeys before handoff

- Test on mobile and desktop: service discovery, account-free request submission,
  confirmation/reference display, and optional WhatsApp follow-up.
- Test staff sign-in, denied access for unauthorized users, recovery, logout,
  request loading, and permitted management actions.
- Test invalid input, CAPTCHA rejection, unavailable integrations, rate limiting,
  network loss, non-JSON server responses, duplicate clicks, and error scrolling.
- Check preview and production configuration separately, including public variables
  embedded during builds, CAPTCHA hostnames, and authentication redirect URLs.
- Report what was actually verified. Separate local or mocked tests from live
  integration tests; a successful build alone does not prove submissions work.
- Treat existing databases and historical migration files cautiously. Inspect the
  live schema before proposing changes. Do not remove database objects, columns,
  or access rules without explaining what would be removed and why, and obtaining
  my approval. Do not run abandoned migrations merely because they remain in a repo.

## 19. reCAPTCHA integration

- Use CAPTCHA where appropriate for abuse prevention without forcing customer accounts.
- Verify tokens server-side. For v3, check success, the expected action, a finite
  score meeting the chosen threshold, and the hostname against approved hostnames.
- Configure public site keys and server-only secret keys separately for preview
  and production. Authorize intended hostnames and redeploy when build-time public
  variables change. Never log CAPTCHA tokens or expose the secret key.
- Use Google's readiness callback and normalize promise-like results with a native
  Promise before using methods such as finally. Handle timeouts and synchronous
  errors, preserve entered details, and restore controls after failures.
- Distinguish CAPTCHA rejection from database, rate-limit, and configuration errors.
  CAPTCHA success does not prove a request was saved; CAPTCHA is only one layer
  alongside server validation, authorization, and reliable rate limiting.
- Test rejection, unavailable scripts, slow networks, wrong action/hostname, and
  expired tokens. Do not silently bypass verification in production.

## 20. Shared standards and project exceptions

This document is shared across Johnson Rise & Shine, BuildGuyana,
buildguyana-verification, and Chinese Takeaway. BuildGuyana hosts the synchronization
workflow. Changes committed to any participating default branch are synchronized;
uncommitted edits and feature-branch changes do not propagate until merged.

Keep project-specific exceptions in PROJECT_STANDARDS.md and preserve existing
project instructions. Shared requirements apply only where relevant: a verification
backend does not need a customer login screen, and marketplace accounts should not
be removed because a service-enquiry site supports guest requests.

Standards changes update this document, not website code automatically. Conflicting
edits stop synchronization for manual review rather than discard either version.
