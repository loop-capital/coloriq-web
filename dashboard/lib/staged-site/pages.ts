// Mason's staged marketing site, published as the production marketing surface
// on Jason's order 2026-10-23 ("Publish it as our site, replacing the live homepage").
// Served verbatim via route handlers (app/route.ts, app/how-it-works, app/proof, app/join).
// De-staged at publish: staging banner + staging footers removed; links rooted;
// join form's fake 'Application received' submit removed (form is inert; see filing).

export const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>COLORiq — Your color comes out right the first time</title>
<meta name="description" content="COLORiq gives your stylist the exact color recipe before the bowl is ever mixed — guided assessment, tested formulations, and a formula saved to your profile.">
<link rel="stylesheet" href="/staged/styles.css">
</head>
<body>
<nav>
  <a class="logo" href="/">COLOR<span>iq</span></a>
  <a class="nl on" href="/">Home</a><a class="nl" href="/how-it-works">How it works</a><a class="nl" href="/proof">Proof</a><a class="nl" href="/join">Join</a>
  <div class="sp"></div><a class="btn" href="/join">Get access</a>
</nav>

<header class="hero">
  <div class="kicker">COLOR INTELLIGENCE FOR PROFESSIONAL SALONS</div>
  <h1>Your color comes out <em>right the first time.</em></h1>
  <p class="sub">COLORiq gives your stylist the exact recipe before the bowl is ever mixed — no re-mixing, no corrections, no "let's try this and see."</p>
  <p><a class="btn" href="/how-it-works">See how it works</a> &nbsp; <a class="btn ghost" href="/proof">See it in a real salon</a></p>
</header>

<div class="wrap">
  <h2 class="sec">Four things, done properly</h2>
  <p class="lede">Everything COLORiq does comes down to four capabilities working together at the chair.</p>
  <div class="grid">
    <div class="card"><div class="n">01</div><h3>Guided assessment</h3><p>Current color, what's underneath it, porosity, chemical history — even medications and well water. The full picture before any decision.</p></div>
    <div class="card"><div class="n">02</div><h3>Formulation library</h3><p>Every assessment is checked against a library of tested professional formulations — not guesswork, not memory.</p></div>
    <div class="card"><div class="n">03</div><h3>Exact recipe</h3><p>Brand, shade, developer, ratio, processing time. A complete, precise formula — the first time.</p></div>
    <div class="card"><div class="n">04</div><h3>Saved to your profile</h3><p>Your formula lives with you, not in someone's notebook. Same color, every visit, any stylist.</p></div>
  </div>

  <h2 class="sec">Why it matters</h2>
  <div class="grid">
    <div class="card"><h3>Corrections actually correct</h3><p>Brassy box-dye disasters and uneven salon work get figured out precisely — which pigments neutralize what you've got.</p></div>
    <div class="card"><h3>Less time in the chair</h3><p>Right the first time means no re-mixing, no re-processing, no "let's give it another ten minutes."</p></div>
    <div class="card"><h3>It travels with you</h3><p>Switch stylists, switch visits — the recipe is pulled from your profile and mixed the same way.</p></div>
  </div>
</div>

<div class="ctaband">
  <h2>See it working in a real salon</h2>
  <p>PLEIJ Salon in Columbus, Ohio runs every color service through COLORiq. Read Gia's story.</p>
  <p><a class="btn" href="/proof">The PLEIJ proof story</a></p>
</div>

<footer><b>COLORiq</b></footer>
</body>
</html>
`

export const HOW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>How it works — COLORiq</title>
<meta name="description" content="Assess, formulate, apply, save, refine — the COLORiq flow your stylist lives at every color appointment.">
<link rel="stylesheet" href="/staged/styles.css">
</head>
<body>
<nav>
  <a class="logo" href="/">COLOR<span>iq</span></a>
  <a class="nl" href="/">Home</a><a class="nl on" href="/how-it-works">How it works</a><a class="nl" href="/proof">Proof</a><a class="nl" href="/join">Join</a>
  <div class="sp"></div><a class="btn" href="/join">Get access</a>
</nav>

<div class="wrap">
  <div class="kicker" style="margin-top:40px">HOW IT WORKS</div>
  <h1 style="font-size:clamp(30px,4.6vw,48px);font-weight:800;letter-spacing:-.015em">Five steps. Zero guesswork.</h1>
  <p class="lede">The flow your stylist actually lives, at every color appointment.</p>

  <div class="steps">
    <div class="step"><div class="n">1</div><div><h3>Assess</h3><p>Before anything is mixed, your stylist runs your hair through a guided assessment — current color, underlying pigment, porosity, density, chemical history, even medications or well water that can interfere with color.</p></div></div>
    <div class="step"><div class="n">2</div><div><h3>Formulate</h3><p>The assessment is checked against a library of tested professional formulations. Out comes an exact recipe: brand, shade, developer volume, mix ratio, processing time.</p></div></div>
    <div class="step"><div class="n">3</div><div><h3>Apply</h3><p>Your stylist applies with confidence — the chemistry was worked out before the bowl, not during it. They're still the artist; COLORiq just hands them better information.</p></div></div>
    <div class="step"><div class="n">4</div><div><h3>Save</h3><p>Every formula is saved to your client profile. Love your balayage? It's one tap away next visit — for you, and for any stylist in the salon.</p></div></div>
    <div class="step"><div class="n">5</div><div><h3>Refine</h3><p>Hair changes, goals change. Each visit starts from your saved formula and adjusts from there — your color history compounds instead of resetting.</p></div></div>
  </div>
</div>

<div class="ctaband">
  <h2>Built for the chair, not the lab</h2>
  <p>COLORiq slots into a working salon day — assessment takes minutes, and the payoff is fewer corrections and faster appointments.</p>
  <p><a class="btn" href="/proof">See the proof at PLEIJ</a></p>
</div>

<footer><b>COLORiq</b></footer>
</body>
</html>
`

export const PROOF_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proof: Gia + PLEIJ Salon — COLORiq</title>
<meta name="description" content="PLEIJ Salon in Columbus, Ohio runs every color service through COLORiq. Read Gia's story — the living proof.">
<link rel="stylesheet" href="/staged/styles.css">
</head>
<body>
<nav>
  <a class="logo" href="/">COLOR<span>iq</span></a>
  <a class="nl" href="/">Home</a><a class="nl" href="/how-it-works">How it works</a><a class="nl on" href="/proof">Proof</a><a class="nl" href="/join">Join</a>
  <div class="sp"></div><a class="btn" href="/join">Get access</a>
</nav>

<div class="wrap">
  <div class="kicker" style="margin-top:40px">PROOF · PLEIJ SALON + SPA · COLUMBUS, OH</div>
  <h1 style="font-size:clamp(30px,4.6vw,48px);font-weight:800;letter-spacing:-.015em">The salon where color comes out right the first time.</h1>

  <div class="proofhero"><img src="/assets/gia-coloriq-header.webp" alt="Gia for COLORiq at PLEIJ Salon"></div>

  <p class="lede">PLEIJ Salon + Spa runs every color service through COLORiq formulation. Gia — PLEIJ's AI host — tells the story in her own words.</p>

  <div class="quote">"Hair color used to involve guesswork. COLORiq takes it out — my stylists get the exact recipe before they ever mix a bowl, and my formula is saved so it looks the same every visit." — Gia's COLORiq story</div>

  <p><a class="btn" href="https://coloriq-gia-staging-7mn4aqg1j-jason-oplands-projects.vercel.app" target="_blank" rel="noopener">Read Gia's full article</a></p>

  <h2 class="sec">What's on the menu at PLEIJ</h2>
  <p class="lede">Every service below runs through COLORiq formulation. Prices are PLEIJ Salon service prices (Columbus, OH).</p>
  <div class="prices">
    <h3>PLEIJ color services</h3>
    <ul>
      <li><b>Color Retouch &amp; Haircut</b><span>from $148</span></li>
      <li><b>All Over Color &amp; Haircut</b><span>from $167</span></li>
      <li><b>Partial Highlight &amp; Haircut</b><span>from $215</span></li>
      <li><b>Color Express &amp; Haircut</b><span>from $112</span></li>
      <li><b>Balayage / Ombré &amp; Haircut</b><span>from $300</span></li>
    </ul>
    <p class="note">Prices are PLEIJ Salon service prices and vary by stylist level and hair length — shown here as part of the proof story only.</p>
  </div>

  <div class="faq">
    <h2 class="sec">Questions PLEIJ guests ask</h2>
    <details><summary>Do I need a consultation first?</summary><p>Not necessarily — book directly if you know what you want. Major changes or corrections benefit from a consultation, and the COLORiq assessment happens at your appointment either way.</p></details>
    <details><summary>Does it cost extra?</summary><p>No. COLORiq is how PLEIJ formulates, not an add-on charge. You pay the standard service price.</p></details>
    <details><summary>Will my color match next visit?</summary><p>Yes — your formula is saved to your client profile, so any PLEIJ colorist can mix it exactly the same way.</p></details>
  </div>
</div>

<div class="ctaband">
  <h2>Bring this to your salon</h2>
  <p>PLEIJ is the first proof. Yours could be next.</p>
  <p><a class="btn" href="/join">Join as a founding salon</a></p>
</div>

<footer><b>COLORiq</b> · PLEIJ Salon + Spa, 8930 Lyra Dr, Columbus, OH 43240</footer>
</body>
</html>
`

export const JOIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Join — COLORiq founding salons</title>
<meta name="description" content="Bring COLORiq to your salon. Join as a founding salon and formulate with confidence from day one.">
<link rel="stylesheet" href="/staged/styles.css">
</head>
<body>
<nav>
  <a class="logo" href="/">COLOR<span>iq</span></a>
  <a class="nl" href="/">Home</a><a class="nl" href="/how-it-works">How it works</a><a class="nl" href="/proof">Proof</a><a class="nl on" href="/join">Join</a>
  <div class="sp"></div><a class="btn" href="#apply">Get access</a>
</nav>

<div class="wrap">
  <div class="kicker" style="margin-top:40px">JOIN</div>
  <h1 style="font-size:clamp(30px,4.6vw,48px);font-weight:800;letter-spacing:-.015em">Bring COLORiq to your salon.</h1>
  <p class="lede">We're onboarding founding salons now — the early partners who shape what COLORiq becomes. If color corrections are eating your week, let's talk.</p>

  <div class="grid">
    <div class="card"><div class="n">FOR SALONS</div><h3>Fewer corrections, fuller books</h3><p>Right-the-first-time color means less rework, faster appointments, and clients who trust the chair. Your stylists keep their artistry — COLORiq handles the chemistry math.</p></div>
    <div class="card"><div class="n">FOR STYLISTS</div><h3>Confidence at the bowl</h3><p>Walk into every formulation with an exact recipe and the client's full history. No more mixing from memory.</p></div>
    <div class="card"><div class="n">FOUNDING TERMS</div><h3>Shape it early</h3><p>Founding salons get early access and a direct line to the product team. Terms are set with each partner — talk to us.</p></div>
  </div>

  <h2 class="sec" id="apply">Apply</h2>
  <p class="lede">Tell us about your salon and we'll be in touch. Founding applications are reviewed personally — no automated funnel.</p>
  <div class="card" style="max-width:560px">
    <form onsubmit="return false">
      <p style="margin-bottom:12px"><label style="font-size:13px;color:var(--muted)">Salon name<br><input required type="text" placeholder="Your salon" style="width:100%;margin-top:6px;padding:12px;border-radius:8px;border:1px solid var(--line);background:#0e0e11;color:var(--ink)"></label></p>
      <p style="margin-bottom:12px"><label style="font-size:13px;color:var(--muted)">Email<br><input required type="email" placeholder="you@salon.com" style="width:100%;margin-top:6px;padding:12px;border-radius:8px;border:1px solid var(--line);background:#0e0e11;color:var(--ink)"></label></p>
      <p style="margin-bottom:18px"><label style="font-size:13px;color:var(--muted)">What eats most of your color week?<br><textarea rows="3" placeholder="Corrections, timing, consistency…" style="width:100%;margin-top:6px;padding:12px;border-radius:8px;border:1px solid var(--line);background:#0e0e11;color:var(--ink)"></textarea></label></p>
      <button class="btn" type="submit">Apply as a founding salon</button>
      <p style="font-size:12px;color:#6d6d75;margin-top:12px">Submissions are not sent anywhere yet.</p>
    </form>
  </div>
</div>

<div class="ctaband">
  <h2>Questions first?</h2>
  <p>See how PLEIJ Salon put COLORiq to work, told by Gia.</p>
  <p><a class="btn ghost" href="/proof">Read the proof story</a></p>
</div>

<footer><b>COLORiq</b></footer>
</body>
</html>
`

export function stagedPage(html: string): Response {
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
