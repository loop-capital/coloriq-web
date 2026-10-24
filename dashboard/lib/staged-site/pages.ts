// Mason's staged marketing site — CURRENT build (deployment hgxgjud1c), published as the
// production marketing surface on Jason's order 2026-10-23. Corrects the first publish
// (76bdccc), which used a stale deployment linked in Mason's 2026-10-16 report.
// Served verbatim via route handlers (app/route.ts, app/how-it-works, app/proof, app/join).
// De-staged at publish: staging banners/footers/notes removed; links + assets rooted;
// join form's fake confirmation removed (form is inert; see correction filing).

export const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>COLORiq — The Color Engine Behind the World’s Best Hair</title>
<meta name="description" content="COLORiq is the color engine behind the world's best hair. Formulas that come out right the first time — precise color from a working library of 3,273 shades. Built for professional colorists.">
<link rel="stylesheet" href="/staged/styles.css">
</head>
<body>
<nav>
  <a class="logo" href="/"><img src="/assets/coloriq-logo.png" alt="COLORiq logo"><span class="word">COLOR<span class="iq">iq</span></span></a>
  <div class="tabs">
    <a href="#collections">Collections</a>
    <a href="/how-it-works">How It Works</a>
    <a href="/join">For Salons</a>
  </div>
  <div class="nav-right">
    <a class="login" href="https://getcoloriq.co/login">Login</a>
    <a class="btn small" href="/join">Get Access</a>
  </div>
</nav>

<header class="split-hero">
  <div class="photo">
    <img src="/assets/gia-coloriq-header.webp" alt="Gia for COLORiq">
    <div class="falloff"></div>
  </div>
  <div class="hero-copy">
    <h1>The Color Engine Behind the World’s Best Hair</h1>
    <p class="sub">Formulas that come out right the first time — precise color, mixed from a working library of 3,273 shades, built for professional colorists. AI-powered. Stylist-directed.</p>
    <div class="cta-row">
      <a class="btn" href="/join">Get Started</a>
      <a class="btn ghost" href="/how-it-works">See How It Works</a>
    </div>
    <div class="store-badges">
      
      <span class="store-badge badge-apple" title="Download on the App Store — listing not yet public"><img src="/assets/badge-app-store.svg" alt="Download on the App Store"></span>
      
      <span class="store-badge badge-google" title="Get it on Google Play — listing not yet public"><img src="/assets/badge-google-play.png" alt="Get it on Google Play"></span>
    </div>
    <p class="norisk">Founding-salon terms · No long-term commitment to start</p>
  </div>
  <div class="hero-ticker">
    <p class="ticker-head"><b>3,273</b> SHADES ACROSS <b>21</b> PROFESSIONAL BRANDS</p>
    <div class="marquee slim" aria-label="Color brands in the COLORiq library">
      <div class="track">
        <span>Wella Professionals</span><span>Redken</span><span>L’Oréal Professionnel</span><span>Schwarzkopf Professional</span><span>Goldwell</span><span>Matrix</span><span>Joico</span><span>Paul Mitchell</span><span>Aveda</span><span>Keune</span><span>Davines</span><span>Pulp Riot</span><span>Pravana</span><span>Kenra Professional</span><span>Framesi</span><span>Alfaparf Milano</span><span>TIGI</span><span>Rusk</span><span>CHI</span><span>Oligo Professionnel</span><span>Malibu C</span>
        <span>Wella Professionals</span><span>Redken</span><span>L’Oréal Professionnel</span><span>Schwarzkopf Professional</span><span>Goldwell</span><span>Matrix</span><span>Joico</span><span>Paul Mitchell</span><span>Aveda</span><span>Keune</span><span>Davines</span><span>Pulp Riot</span><span>Pravana</span><span>Kenra Professional</span><span>Framesi</span><span>Alfaparf Milano</span><span>TIGI</span><span>Rusk</span><span>CHI</span><span>Oligo Professionnel</span><span>Malibu C</span>
      </div>
    </div>
  </div>
</header>

<section class="outcome-band">
  <h2>Your color comes out <em>right the first time.</em></h2>
  <a class="textlink" href="/how-it-works">How it works →</a>
</section>

<div class="wrap">
  <h2 class="sec">Four things, done properly</h2>
  <p class="lede">Everything COLORiq does comes down to four capabilities working together at the chair.</p>
  <div class="grid">
    <div class="card"><div class="n">01</div><h3>Guided assessment</h3><p>Current color, what's underneath it, porosity, chemical history — even medications and well water. The full picture before any decision.</p></div>
    <div class="card"><div class="n">02</div><h3>Shade library</h3><p>Every assessment draws from a working library of 3,273 professional shades across 21 color brands — the catalog, not guesswork.</p></div>
    <div class="card"><div class="n">03</div><h3>Exact recipe</h3><p>Brand, shade, developer, ratio, processing time. A complete, precise formula — the first time.</p></div>
    <div class="card"><div class="n">04</div><h3>Saved to your profile</h3><p>Your formula lives with you, not in someone's notebook. Same color, every visit, any stylist.</p></div>
  </div>

  <h2 class="sec">The moments COLORiq was built for</h2>
  <p class="lede">Three salon-real situations — each resolved the way COLORiq resolves it.</p>
  <div class="grid">
    <div class="card"><div class="n">THE FORGOTTEN FORMULA</div><h3>She's back in six weeks and nobody wrote down the mix.</h3><p>Pull her saved formula from her profile and mix it exactly. Resolved in one tap.</p></div>
    <div class="card"><div class="n">THE COVERING STYLIST</div><h3>Her last color was done by a stylist who's off today.</h3><p>Any colorist pulls the same recipe. Same color, different chair.</p></div>
    <div class="card"><div class="n">THE UNSURE SHADE</div><h3>She shows you a photo you're not sure her hair can achieve.</h3><p>The assessment scores what's achievable before you mix — an honest answer, first.</p></div>
  </div>

  <section class="collections" id="collections">
    <div class="kicker">COLLECTIONS · THE SHADE LIBRARY</div>
    <h2>3,273 shades. 21 brands. One working library.</h2>
    <p class="lede">Every COLORiq formulation draws from a working library of 3,273 professional shades across 21 color brands — the catalog your stylist searches, not a shelf they guess from.</p>
  </section>

  <h2 class="sec">Why it matters</h2>
  <div class="grid">
    <div class="card"><h3>Corrections actually correct</h3><p>Brassy box-dye disasters and uneven salon work get figured out precisely — which pigments neutralize what you've got.</p></div>
    <div class="card"><h3>Less time in the chair</h3><p>Right the first time means no re-mixing, no re-processing, no "let's give it another ten minutes."</p></div>
    <div class="card"><h3>It travels with you</h3><p>Switch stylists, switch visits — the recipe is pulled from your profile and mixed the same way.</p></div>
  </div>

  <h2 class="sec" id="pricing">Pricing that starts Solo, scales to twenty chairs</h2>
  <p class="lede">Base is the formulation engine. Full adds the color management suite. Every step up is priced to pay for itself.</p>
  <div class="ladder">
    <div class="rung" style="--i:4"><div class="tier">Solo</div><div class="p"><span>Base</span><b>$30</b></div><div class="p full"><span>Full</span><b>$50</b></div><div class="meta">1 user · 1 scale · 2 color lines</div><div class="step">+$20 unlocks the full suite</div></div>
    <div class="rung" style="--i:3"><div class="tier">Team</div><div class="p"><span>Base</span><b>$60</b></div><div class="p full"><span>Full</span><b>$100</b></div><div class="meta">Up to 2 users · 1 scale · 2 color lines</div><div class="step">+$40 unlocks the full suite</div></div>
    <div class="rung" style="--i:2"><div class="tier">5</div><div class="p"><span>Base</span><b>$90</b></div><div class="p full"><span>Full</span><b>$215</b></div><div class="meta">Up to 5 users · 1 scale · 3 color lines</div><div class="step">+$125 unlocks the full suite</div></div>
    <div class="rung" style="--i:1"><div class="tier">10</div><div class="p"><span>Base</span><b>$150</b></div><div class="p full"><span>Full</span><b>$249</b></div><div class="meta">Up to 10 users · multiple scales · 3 color lines</div><div class="step">+$99 unlocks the full suite</div></div>
    <div class="rung" style="--i:0"><div class="tier">20</div><div class="p"><span>Base</span><b>$200</b></div><div class="p full"><span>Full</span><b>$299</b></div><div class="meta">Up to 20 users · multiple scales · 5 color lines</div><div class="step">+$99 unlocks the full suite</div></div>
  </div>
  <div class="tablewrap"><table class="ptable">
    <tr><th>Tier</th><th>Base / mo</th><th>Full / mo</th><th>Users</th><th>Scales</th><th>Color lines</th></tr>
    <tr><td>Solo</td><td>$30</td><td class="hl">$50</td><td>1</td><td>1</td><td>2</td></tr>
    <tr><td>Team</td><td>$60</td><td class="hl">$100</td><td>Up to 2</td><td>1</td><td>2</td></tr>
    <tr><td>5</td><td>$90</td><td class="hl">$215</td><td>Up to 5</td><td>1</td><td>3</td></tr>
    <tr><td>10</td><td>$150</td><td class="hl">$249</td><td>Up to 10</td><td>Multiple</td><td>3</td></tr>
    <tr><td>20</td><td>$200</td><td class="hl">$299</td><td>Up to 20</td><td>Multiple</td><td>5</td></tr>
  </table></div>
  <p class="note">Prices per month. Extra color lines are +$5/month each. The full table also lives on the For Salons page.</p>

  <h2 class="sec">The Formula Marketplace</h2>
  <p class="lede">Buy proven formulas. Sell your signature mixes. Five tiers, one rule: creators earn 70% of every licensed use, at every tier.</p>
  <div class="ladder market">
    <div class="rung" style="--i:4"><div class="tier">Community</div><div class="price"><b>Free</b></div><p>Open formulas, open reputation. Share your work, build a following, establish yourself as a color authority.</p></div>
    <div class="rung" style="--i:3"><div class="tier">Professional</div><div class="price"><b>$2.99</b><span> / use</span></div><p>The workhorse tier — standard formulas for common scenarios: balayage, grey coverage, fashion color.</p></div>
    <div class="rung" style="--i:2"><div class="tier">Master</div><div class="price"><b>$4.99</b><span> / use</span></div><p>Advanced techniques, corrections, multi-step transformations, cross-brand formulations.</p></div>
    <div class="rung" style="--i:1"><div class="tier">Signature</div><div class="price"><b>$7.99</b><span> / use</span></div><p>Flagship formulas from recognized names — video commentary, processing notes, troubleshooting.</p></div>
    <div class="rung elite" style="--i:0"><div class="tier">Elite</div><div class="price"><b>$9.99</b><span> / use</span></div><p>The top tier — industry reference-point formulas from the most successful creators.</p></div>
  </div>
  <p class="callout70">Levels are ranked by licensed uses — sales, never likes. Free Community uses count toward your rank. Tiers recalculate monthly. Payouts monthly, once you pass $25.</p>
  <div class="grid">
    <div class="card"><div class="n">SELL YOUR FORMULAS</div><h3>Your signature mixes, earning</h3><p>List a formula with before/after photos, the client hair profile, and step-by-step notes. Buyers license it per use — you keep 70%.</p></div>
    <div class="card"><div class="n">COMMUNITY</div><h3>Connect with stylists worldwide</h3><p>Buy proven formulas, sell your signature mixes, and build your brand — the free tier is where reputations start.</p></div>
  </div>
</div>

<div class="ctaband">
  <h2>See it working in a real salon</h2>
  <p>PLEIJ Salon in Columbus, Ohio — COLORiq's founding salon. Read Gia's story.</p>
  <p><a class="btn" href="/proof">The PLEIJ proof story</a></p>
</div>

<div class="wrap">
  <h2 class="sec">Questions, answered</h2>
  <div class="faq">
    <details><summary>Does COLORiq replace my judgment?</summary><p>Never. COLORiq is stylist-directed, always. It hands you the chemistry math — the assessment, the formulation, the exact recipe — but every decision at the chair is yours.</p></details>
    <details><summary>What happens to my clients' photos?</summary><p>Client photos are used for the assessment and stored with your salon's account — never sold, never shared outside it.</p></details>
    <details><summary>Which brands does it work with?</summary><p>21 professional color brands — the full library is in the marquee above. Formulations reference the working catalog across all of them.</p></details>
    <details><summary>How does pricing work?</summary><p>By salon size, from Solo to twenty chairs. Base is the formulation engine; Full adds the color management suite. Extra color lines are +$5/month each.</p></details>
  </div>

  <h2 class="sec">Partners</h2>
  <div class="card partners">
    <div class="n">AFFILIATE PROGRAM · INVITE ONLY</div>
    <h3>Grow with the people who teach it</h3>
    <p>Affiliates earn <b>15%</b> of subscription revenue for the first 12 months. The program is invite-only — founding stylists, creators, and trade partners.</p>
    <p><a class="textlink" href="/join#apply">Request an invite →</a></p>
  </div>
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
<meta name="description" content="Six steps from photo to formula: how COLORiq formulates with your stylist at every color appointment.">
<link rel="stylesheet" href="/staged/styles.css">
</head>
<body>
<nav>
  <a class="logo" href="/"><img src="/assets/coloriq-logo.png" alt="COLORiq logo"><span class="word">COLOR<span class="iq">iq</span></span></a>
  <div class="tabs">
    <a href="/#collections">Collections</a>
    <a href="/how-it-works">How It Works</a>
    <a href="/join">For Salons</a>
  </div>
  <div class="nav-right">
    <a class="login" href="https://getcoloriq.co/login">Login</a>
    <a class="btn small" href="/join">Get Access</a>
  </div>
</nav>

<div class="wrap">
  <div class="kicker" style="margin-top:40px">HOW IT WORKS</div>
  <h1 style="font-size:clamp(30px,4.6vw,48px);font-weight:800;letter-spacing:-.015em">Six steps. Zero guesswork.</h1>
  <p class="lede">From photo to professional formula — the flow your stylist lives at every color appointment.</p>

  <div class="steps">
    <div class="step"><div class="n">1</div><div><h3>Photo</h3><p>Capture the starting point — your client's current color, in real light. The photo isn't a mood board; it's data.</p></div></div>
    <div class="step"><div class="n">2</div><div><h3>Hair Assessment</h3><p>Texture, density, level and tone, porosity — the full picture of what your stylist is actually working with.</p></div></div>
    <div class="step"><div class="n">3</div><div><h3>Chemical History</h3><p>Past treatments and sensitivities, so the formula respects what's already in the hair.</p></div></div>
    <div class="step"><div class="n">4</div><div><h3>Target Look</h3><p>The desired color, matched across your brands — what she wants, in shades you actually stock.</p></div></div>
    <div class="step"><div class="n">5</div><div><h3>Condition</h3><p>Hair health and problem flags before anything is mixed — damage, breakage risk, uneven porosity.</p></div></div>
    <div class="step"><div class="n">6</div><div><h3>Your Formula</h3><p>Ratios, developer, timing — the exact recipe, with a confidence score on the result before you mix.</p></div></div>
  </div>

  <h2 class="sec">The science behind it</h2>
  <p class="lede">Four systems working under the six steps.</p>
  <div class="grid">
    <div class="card"><div class="n">PHOTO ANALYSIS</div><h3>The image is data</h3><p>COLORiq reads level, tone, and condition from the photo to ground the assessment in what's actually there.</p></div>
    <div class="card"><div class="n">PRECISION FORMULATION</div><h3>Matched, not guessed</h3><p>The assessment is matched against the working library to produce exact ratios, developer, and timing.</p></div>
    <div class="card"><div class="n">RESULT SCORING</div><h3>Know before you mix</h3><p>Every formula carries a confidence score — how much to trust it, visible before the bowl.</p></div>
    <div class="card"><div class="n">SMART QUESTIONNAIRE</div><h3>Asked what matters</h3><p>The assessment asks what matters and skips what doesn't — medications, well water, past treatments, only when relevant.</p></div>
  </div>

  <h2 class="sec">A real session, start to finish</h2>
  <p class="lede">Photo to formula to result — and every formula explains itself.</p>
  <div class="strip">
    <div class="panel"><div class="plab">01 · PHOTO</div><div class="pbody photo"></div><p>The starting point, captured in real light.</p></div>
    <div class="panel"><div class="plab">02 · FORMULA</div><div class="pbody formula"><b>6N + 6G</b><span>20 vol · 1:1.5 · 35 min</span></div><p>The exact recipe — brand, shade, developer, ratio, timing.</p></div>
    <div class="panel"><div class="plab">03 · RESULT</div><div class="pbody result"></div><p>Mixed and processed per the recipe. Right the first time.</p></div>
    <div class="panel"><div class="plab">04 · ASK WHY</div><div class="pbody why"><b>Why this formula?</b><span>Level 6 base · warm underlying pigment · 20 vol lifts cleanly without over-processing.</span></div><p>Every formula explains itself — shade, developer, timing.</p></div>
  </div>
  
  <h2 class="sec">AI Color Match — try the demo</h2>
  <p class="lede">Upload an inspiration photo and see how COLORiq returns a formula match.</p>
  <div class="demo">
    <label class="upload" for="matchfile">Choose an inspiration photo<input type="file" id="matchfile" accept="image/*" hidden></label>
    <div class="demoprev" id="demoprev"><span>Your photo appears here</span></div>
    <button class="btn" id="matchbtn" type="button">Find my match</button>
    <div class="demoresult" id="demoresult" hidden>
      <div class="n">DEMO RESULT</div>
      <h3>Match found in the working library</h3>
      <p><b>7G + 7N</b> · 20 vol · 1:1 · 30 min <span class="note">— sample result; your match panel would look like this.</span></p>
    </div>
  </div>
</div>

<div class="ctaband">
  <h2>Built for the chair, not the lab</h2>
  <p>COLORiq slots into a working salon day — assessment takes minutes, and the payoff is fewer corrections and faster appointments.</p>
  <p><a class="btn" href="/join">Bring it to your salon</a></p>
</div>

<footer><b>COLORiq</b></footer>
<script>
var f=document.getElementById('matchfile'),p=document.getElementById('demoprev'),b=document.getElementById('matchbtn'),r=document.getElementById('demoresult');
f.addEventListener('change',function(){if(f.files&&f.files[0]){var u=URL.createObjectURL(f.files[0]);p.innerHTML='<img src="'+u+'" alt="Inspiration photo preview">';}});
b.addEventListener('click',function(){r.hidden=false;b.textContent='Match found — demo result below';});
</script>
</body>
</html>
`

export const PROOF_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proof: Gia + PLEIJ Salon — COLORiq</title>
<meta name="description" content="PLEIJ Salon in Columbus, Ohio — COLORiq's founding salon. Read Gia's story.">
<link rel="stylesheet" href="/staged/styles.css">
</head>
<body>
<nav>
  <a class="logo" href="/"><img src="/assets/coloriq-logo.png" alt="COLORiq logo"><span class="word">COLOR<span class="iq">iq</span></span></a>
  <div class="tabs">
    <a href="/#collections">Collections</a>
    <a href="/how-it-works">How It Works</a>
    <a href="/join">For Salons</a>
  </div>
  <div class="nav-right">
    <a class="login" href="https://getcoloriq.co/login">Login</a>
    <a class="btn small" href="/join">Get Access</a>
  </div>
</nav>

<div class="wrap">
  <div class="kicker" style="margin-top:40px">PROOF · PLEIJ SALON + SPA · COLUMBUS, OH</div>
  <h1 style="font-size:clamp(30px,4.6vw,48px);font-weight:800;letter-spacing:-.015em">The salon where color comes out right the first time.</h1>

  <div class="proofhero"><img src="/assets/gia-coloriq-header.webp" alt="Gia for COLORiq at PLEIJ Salon"></div>

  <p class="lede">PLEIJ Salon + Spa is COLORiq's founding salon. Gia — PLEIJ's AI host — tells the story in her own words.</p>

  <div class="quote">"Hair color used to involve guesswork. COLORiq takes it out — my stylists get the exact recipe before they ever mix a bowl, and my formula is saved so it looks the same every visit." — Gia's COLORiq story</div>

  <p><a class="btn" href="https://coloriq-gia-staging-7mn4aqg1j-jason-oplands-projects.vercel.app" target="_blank" rel="noopener">Read Gia's full article</a></p>

  <h2 class="sec">What's on the menu at PLEIJ</h2>
  <p class="lede">Prices are PLEIJ Salon service prices (Columbus, OH) — shown here as part of the proof story only.</p>
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
<title>For Salons — COLORiq</title>
<meta name="description" content="The Color Management Suite for salons: formula history, cost calculator, scale integration, inventory, analytics, safety flags, revenue capture — plus full pricing.">
<link rel="stylesheet" href="/staged/styles.css">
</head>
<body>
<nav>
  <a class="logo" href="/"><img src="/assets/coloriq-logo.png" alt="COLORiq logo"><span class="word">COLOR<span class="iq">iq</span></span></a>
  <div class="tabs">
    <a href="/#collections">Collections</a>
    <a href="/how-it-works">How It Works</a>
    <a href="/join">For Salons</a>
  </div>
  <div class="nav-right">
    <a class="login" href="https://getcoloriq.co/login">Login</a>
    <a class="btn small" href="/join">Get Access</a>
  </div>
</nav>

<div class="wrap">
  <div class="kicker" style="margin-top:40px">FOR SALONS</div>
  <h1 style="font-size:clamp(30px,4.6vw,48px);font-weight:800;letter-spacing:-.015em">Everything color, under one roof.</h1>
  <p class="lede">The Color Management Suite runs the color department — formulation, cost, inventory, and the front desk — in one system.</p>

  <h2 class="sec">The Color Management Suite</h2>
  <div class="grid">
    <div class="card"><div class="n">HISTORY</div><h3>Formula history &amp; timeline</h3><p>Every formula your salon has ever mixed, on a timeline per client. Nothing lives in anyone's notebook.</p></div>
    <div class="card"><div class="n">COST</div><h3>Cost calculator &amp; pricing</h3><p>Know what each formula costs before you mix — price services on real numbers, not habit.</p></div>
    <div class="card"><div class="n">SCALE</div><h3>Bluetooth scale integration</h3><p>Weights go straight from the scale into the formula. No transcription, no drift.</p></div>
    <div class="card"><div class="n">STOCK</div><h3>Inventory management</h3><p>The library knows what your back bar holds — and flags what's running low before you're mid-service.</p></div>
    <div class="card"><div class="n">INSIGHT</div><h3>Salon analytics</h3><p>Which services, which stylists, which formulas — the color business in one view.</p></div>
    <div class="card"><div class="n">SAFETY</div><h3>Client safety flags</h3><p>Allergies, sensitivities, and chemical conflicts surface before the bowl, not after.</p></div>
    <div class="card"><div class="n">DESK</div><h3>Automatic revenue capture</h3><p>Color services ring up at the front desk automatically — no more unbilled bowls.</p></div>
  </div>

  <h2 class="sec">Full pricing</h2>
  <p class="lede">By salon size. Base is the formulation engine; Full adds the Color Management Suite.</p>
  <div class="tablewrap"><table class="ptable">
    <tr><th>Tier</th><th>Base / mo</th><th>Full / mo</th><th>Users</th><th>Scales</th><th>Color lines</th></tr>
    <tr><td>Solo</td><td>$30</td><td class="hl">$50</td><td>1</td><td>1</td><td>2</td></tr>
    <tr><td>Team</td><td>$60</td><td class="hl">$100</td><td>Up to 2</td><td>1</td><td>2</td></tr>
    <tr><td>5</td><td>$90</td><td class="hl">$215</td><td>Up to 5</td><td>1</td><td>3</td></tr>
    <tr><td>10</td><td>$150</td><td class="hl">$249</td><td>Up to 10</td><td>Multiple</td><td>3</td></tr>
    <tr><td>20</td><td>$200</td><td class="hl">$299</td><td>Up to 20</td><td>Multiple</td><td>5</td></tr>
  </table></div>
  <p class="note">Prices per month. Extra color lines are +$5/month each.</p>

  <h2 class="sec" id="apply">Founding salons</h2>
  <p class="lede">We're onboarding founding salons now — the early partners who shape what COLORiq becomes. Founding terms are set with each partner; talk to us and we'll work them out together.</p>
  <div class="card" style="max-width:560px">
    <form onsubmit="return false">
      <p style="margin-bottom:12px"><label style="font-size:13px;color:var(--muted)">Salon name<br><input required type="text" placeholder="Your salon" style="width:100%;margin-top:6px;padding:12px;border-radius:8px;border:1px solid var(--line);background:#0e0e11;color:var(--ink)"></label></p>
      <p style="margin-bottom:12px"><label style="font-size:13px;color:var(--muted)">Email<br><input required type="email" placeholder="you@salon.com" style="width:100%;margin-top:6px;padding:12px;border-radius:8px;border:1px solid var(--line);background:#0e0e11;color:var(--ink)"></label></p>
      <p style="margin-bottom:18px"><label style="font-size:13px;color:var(--muted)">What eats most of your color week?<br><textarea rows="3" placeholder="Corrections, timing, consistency…" style="width:100%;margin-top:6px;padding:12px;border-radius:8px;border:1px solid var(--line);background:#0e0e11;color:var(--ink)"></textarea></label></p>
      <button class="btn" type="submit">Talk to us</button>
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
