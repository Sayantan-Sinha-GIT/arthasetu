import { BOOT_LOGO_DATA_URI } from '@/lib/boot-logo';

/**
 * The first thing the user sees, and the only thing that is guaranteed to be
 * paintable from the HTML response alone.
 *
 * Every page of this app is a client component behind three context providers,
 * so the server sends a document whose visible body is empty and the screen
 * stays blank until React has downloaded, parsed and hydrated. In a browser tab
 * that reads as a slow site. Inside the Android TWA it reads as a broken app:
 * Chrome keeps its toolbar and progress bar up until it has verified the
 * Digital Asset Link, and what sits underneath that toolbar is a blank
 * rectangle. That is the "loading bar" in the bug report, and it is also what
 * Android captured for the recents thumbnail.
 *
 * So this renders on the server, carries its own styles inline, and carries the
 * mark as a data URI. It needs no stylesheet, no webfont and no second request:
 * whatever else is still in flight, the first frame the user sees is branded.
 * `IntroSplash` takes it down once React is running.
 *
 * Nothing here may reference a CSS custom property from globals.css — that file
 * is a render-blocking <link> that has not necessarily arrived yet, which is the
 * whole problem this is solving. The colours below are the literal light and
 * dark `--color-background` / `--color-foreground` values, kept in sync by
 * `scripts/test-app-shell-boot.ts`.
 */
export default function BootScreen() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
#as-boot{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;
justify-content:center;background:#FDF5E3;color:#2A1A0F;
font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
opacity:1;transition:opacity .4s cubic-bezier(.16,1,.3,1);
animation:as-boot-bail .6s ease 15s forwards}
:root.dark #as-boot{background:#0B0806;color:#FDF5E3}
/* Driven by a class on <html> rather than by removing this node, which
   React owns. Same mechanism the theme script already uses. */
:root.as-boot-out #as-boot{opacity:0;pointer-events:none}
:root.as-boot-done #as-boot{display:none}
#as-boot .as-boot-col{display:flex;flex-direction:column;align-items:center;text-align:center;
padding:24px;gap:18px}
#as-boot .as-boot-tile{width:80px;height:80px;border-radius:20px;background:#F5EEE1;
display:flex;align-items:center;justify-content:center;
box-shadow:0 1px 2px rgba(0,0,0,.05)}
#as-boot .as-boot-tile img{width:76%;height:76%;object-fit:contain}
#as-boot .as-boot-name{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:0}
#as-boot .as-boot-name span{color:#FF7700;font-size:21px;font-weight:700}
:root.dark #as-boot .as-boot-name span{color:#FF8800}
#as-boot .as-boot-tag{font-size:12px;letter-spacing:.06em;opacity:.7;margin:0}
#as-boot .as-boot-bar{width:96px;height:2px;border-radius:2px;overflow:hidden;
background:rgba(128,110,90,.25)}
#as-boot .as-boot-bar i{display:block;width:40%;height:100%;background:#FF7700;
animation:as-boot-slide 1.1s ease-in-out infinite}
:root.dark #as-boot .as-boot-bar i{background:#FF8800}
@keyframes as-boot-slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
@keyframes as-boot-bail{to{opacity:0;visibility:hidden}}
@media (prefers-reduced-motion:reduce){
#as-boot{transition:none;animation-duration:.01s}
#as-boot .as-boot-bar i{animation:none;width:100%}}
`,
        }}
      />
      {/*
        Hidden from assistive technology: a screen-reader user is served by the
        real page underneath, and announcing a splash it cannot dismiss is noise.
      */}
      <div id="as-boot" aria-hidden="true">
        <div className="as-boot-col">
          <div className="as-boot-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BOOT_LOGO_DATA_URI} alt="" width={61} height={49} decoding="sync" />
          </div>
          <div>
            <p className="as-boot-name">
              ArthaSetu <span>| अर्थसेतु</span>
            </p>
            <p className="as-boot-tag">Your Business • Your Language • Your Plan</p>
          </div>
          <div className="as-boot-bar">
            <i />
          </div>
        </div>
      </div>
    </>
  );
}
