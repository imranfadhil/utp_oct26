/* ═══════════════════════════════════════════════════════════════════════
   Shared Slide Content — UTP Adjunct Lecture
   Used by both the Lecturer Console (lecturer.js) and Present Mode (present.js)
   ═══════════════════════════════════════════════════════════════════════ */

const SLIDES = [
  // ── Slide 0: Title ──────────────────────────────────────────────────
  { title: 'Welcome!', content: `
    <div style="text-align:center;padding:32px 0;">
      <h1 style="font-size:2.4rem;margin-bottom:8px;">📊 Descriptive Statistics in Practice</h1>
      <h2 style="font-size:1.4rem;color:#2563eb;">Industry Insights and Responsible AI</h2>
      <p style="margin-top:24px;font-size:1.1rem;color:#64748b;">Adjunct Lecture · Universiti Teknologi PETRONAS</p>
      <p style="font-size:1rem;color:#64748b;">Foundation in Math &amp; Statistics · October 2026</p>
      <div style="margin-top:32px;display:flex;justify-content:center;gap:24px;flex-wrap:wrap;">
        <span style="padding:8px 16px;background:#d1fae5;border-radius:8px;">🎯 Interactive Session</span>
        <span style="padding:8px 16px;background:#ede9fe;border-radius:8px;">🤖 AI as Copilot</span>
      </div>
    </div>
  `},
  // ── Slide 1: Agenda ─────────────────────────────────────────────────
  { title: 'What We\'ll Cover Today', content: `
    <h2>📋 Agenda</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;">
      <div style="padding:16px;background:#f0f4ff;border-radius:8px;">
        <strong style="color:#2563eb;">Part 1: Stats Review</strong>
        <ul style="margin-top:8px;">
          <li>Mean, Median, Mode</li>
          <li>Standard Deviation &amp; Variance</li>
          <li>Distributions &amp; Percentiles</li>
        </ul>
      </div>
      <div style="padding:16px;background:#fef3c7;border-radius:8px;">
        <strong style="color:#d97706;">Part 2: Industry Insights</strong>
        <ul style="margin-top:8px;">
          <li>Reservoir Characterization</li>
          <li>Uncertainty Quantification</li>
          <li>Production Data Analysis</li>
        </ul>
      </div>
      <div style="padding:16px;background:#ede9fe;border-radius:8px;">
        <strong style="color:#7c3aed;">Part 3: Responsible AI</strong>
        <ul style="margin-top:8px;">
          <li>AI as Copilot vs Autopilot</li>
          <li>Bias, Hallucination &amp; Ethics</li>
          <li>Working WITH AI, not FOR AI</li>
        </ul>
      </div>
      <div style="padding:16px;background:#d1fae5;border-radius:8px;">
        <strong style="color:#059669;">Part 4: Open Q&amp;A</strong>
        <ul style="margin-top:8px;">
          <li>Open floor discussion 💬</li>
          <li>Offline — no devices needed</li>
          <li>Ask me anything</li>
        </ul>
      </div>
    </div>
    <div class="tip-box" style="margin-top:14px;">
      🏆 <strong>Quiz checkpoints:</strong> after each of Parts 1, 2 and 3 we pause for a live quiz round on that part. Keep your phone ready.
    </div>
  `},
  // ── Slide 2: Lecturer Introduction ──────────────────────────────────
  { title: 'Who\'s Talking to You Today', content: `
    <h2>👋 Let Me Introduce Myself</h2>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;margin:14px 0;">
      <img src="/imran-fadhil.jpeg" alt="Imran Fadhil"
           style="width:120px;height:120px;border-radius:50%;object-fit:cover;box-shadow:0 4px 14px rgba(0,0,0,0.18);">
      <div>
        <h3 style="margin:0;font-size:1.5rem;">Imran Fadhil</h3>
        <p style="margin:4px 0;color:#2563eb;font-weight:600;">Manager, Upstream AI · PETRONAS Digital</p>
        <p style="margin:0;font-size:0.9rem;color:#64748b;">
          Petrophysicist turned data scientist · 14+ years with PETRONAS<br>
          Adjunct Lecturer, UTP — Field Development Project II
        </p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;">
      <div style="padding:14px;background:#f0f4ff;border-radius:8px;">
        <strong style="color:#2563eb;">🎓 Education</strong>
        <ul style="margin-top:6px;font-size:0.85rem;">
          <li>BSc Petroleum Engineering</li>
          <li>University of Louisiana at Lafayette</li>
          <li>Research Assistant — modelling fiber-reinforced composites</li>
        </ul>
      </div>
      <div style="padding:14px;background:#fef3c7;border-radius:8px;">
        <strong style="color:#d97706;">🛠️ The Journey</strong>
        <ul style="margin-top:6px;font-size:0.85rem;">
          <li>Operation Petrophysicist — offshore log acquisition</li>
          <li>Production Petrophysicist — Sarawak assets</li>
          <li>Senior Data Scientist → Manager, Upstream AI</li>
        </ul>
      </div>
      <div style="padding:14px;background:#d1fae5;border-radius:8px;">
        <strong style="color:#059669;">📊 What I Build</strong>
        <ul style="margin-top:6px;font-size:0.85rem;">
          <li><strong>ERMAI</strong> — petrophysics ML across 20+ Malaysian fields</li>
          <li>Real-time petrophysics while drilling</li>
          <li>Pseudo-logs for missing &amp; sonic data</li>
        </ul>
      </div>
      <div style="padding:14px;background:#ede9fe;border-radius:8px;">
        <strong style="color:#7c3aed;">🐍 Open Source</strong>
        <ul style="margin-top:6px;font-size:0.85rem;">
          <li><strong>quick_pp</strong> — Python library for petrophysical studies</li>
          <li>Gen AI · Agentic AI · Petrophysics</li>
          <li>github.com/imranfadhil</li>
        </ul>
      </div>
    </div>

    <div class="tip-box">
      💡 <strong>Why I'm here:</strong> I started out reading well logs offshore via manual workflows and ended up leading a
      data science team. The bridge between those two jobs was exactly the statistics you're learning right now —
      means, distributions, uncertainty. That's what today is about.
    </div>
  `},
  /* ── Slide 3: Warm-up — Live Word Cloud ──────────────────────────────
     The [data-live-wordcloud] container is filled at runtime by
     renderLiveWordCloud() below, driven by the server's dashboard feed. */
  { title: 'Warm-Up: How Are You Feeling?', content: `
    <h2>☁️ Warm-Up — One or Two Words</h2>
    <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:18px;align-items:start;margin-top:10px;">
      <div style="padding:16px;background:#dbeafe;border-radius:10px;">
        <strong style="color:#2563eb;font-size:1.05rem;">📱 Your turn</strong>
        <ol style="margin-top:8px;font-size:0.9rem;padding-left:20px;line-height:1.7;">
          <li>Open the <strong>Feedback</strong> box on your phone</li>
          <li>Type <strong>1–3 words</strong> — how do you feel about statistics?</li>
          <li>Tap the stars, then <strong>Send</strong></li>
        </ol>
        <p style="margin-top:10px;font-size:0.82rem;color:#1e40af;">
          e.g. <em>confusing</em> · <em>useful</em> · <em>boring</em> · <em>curious</em> · <em>exam stress</em>
        </p>
        <div style="margin-top:12px;padding:8px 12px;background:#fff;border-radius:8px;font-size:0.8rem;color:#475569;">
          ⭐ +5 points each — and be honest, I can take it.
        </div>
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <strong style="color:#7c3aed;">Live word cloud</strong>
          <span style="font-size:0.7rem;padding:2px 9px;border-radius:10px;background:#dc2626;color:#fff;letter-spacing:0.5px;">LIVE</span>
        </div>
        <div class="word-cloud" data-live-wordcloud
             style="min-height:210px;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:10px;padding:14px;">
          <div class="loading-text">Waiting for your words…</div>
        </div>
      </div>
    </div>
    <div class="tip-box" style="margin-top:12px;">
      💡 <strong>This is already statistics:</strong> what you're watching is a <em>frequency distribution</em> —
      the bigger the word, the higher its count. That's a <strong>mode</strong> forming in real time.
    </div>
  `},
  // ── Slide 4: Mean, Median, Mode ────────────────────────────────────
  { title: 'Basic Stats: Central Tendency', content: `
    <h2>📈 Mean · Median · Mode</h2>
    <p style="color:#64748b;font-size:0.95rem;margin-top:-4px;">
      These three are the <strong>measures of central tendency</strong> — they each describe the "centre" or typical value of a dataset.
    </p>
    <div class="formula">Mean (μ) = (1/n) Σ x<sub>i</sub></div>
    <p><strong>Mean (Average):</strong> Sum of all values ÷ number of values. Sensitive to outliers.</p>
    <p><strong>Median:</strong> The middle value when data is sorted. Robust to outliers.</p>
    <p><strong>Mode:</strong> The most frequent value. Useful for categorical data.</p>
    <div class="tip-box">
      💡 <strong>Industry Insight:</strong> In petrophysics, we average permeability with the <em>geometric mean</em>, not the arithmetic mean, because permeability is log-normal — a few high values can skew the arithmetic mean. (For a log-normal distribution the geometric mean equals the median.)
    </div>
  `},
  // ── Slide 4: Std Dev & Variance ────────────────────────────────────
  { title: 'Spread: Std Dev & Variance', content: `
    <h2>📉 Standard Deviation &amp; Variance</h2>
    <p style="color:#64748b;font-size:0.95rem;margin-top:-4px;">
      These are <strong>measures of spread</strong> (dispersion) — they describe how spread out the data is around the centre.
    </p>
    <div class="formula">σ² = (1/n) Σ (x<sub>i</sub> - μ)²<br>σ = √σ²</div>
    <p><strong>Variance (σ²):</strong> Average squared deviation from the mean.</p>
    <p><strong>Std Dev (σ):</strong> Square root of variance — same units as the data.</p>
    <ul>
      <li><strong>68-95-99.7 Rule:</strong> In a normal distribution, 68% of data lies within ±1σ</li>
      <li><strong>Coefficient of Variation:</strong> CV = σ/μ — useful for comparing spread across different scales</li>
    </ul>
    <div class="warn-box">
      ⚠️ In reservoir engineering, high CV in porosity means heterogeneous formation — critical for EOR planning!
    </div>
  `},
  // ── Slide 5: Distributions ──────────────────────────────────────────
  { title: 'Probability Distributions', content: `
    <h2>🎲 Key Distributions in Petroleum Engineering</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
      <div style="padding:12px;background:#f0f4ff;border-radius:8px;">
        <strong>Normal Distribution</strong>
        <p style="font-size:0.85rem;">Porosity, formation thickness<br>Central Limit Theorem applies</p>
      </div>
      <div style="padding:12px;background:#fef3c7;border-radius:8px;">
        <strong>Log-Normal</strong>
        <p style="font-size:0.85rem;">Permeability, reserves<br>Most reservoir properties</p>
      </div>
      <div style="padding:12px;background:#d1fae5;border-radius:8px;">
        <strong>Triangular</strong>
        <p style="font-size:0.85rem;">Drilling depth to target<br>Time between events</p>
      </div>
      <div style="padding:12px;background:#ede9fe;border-radius:8px;">
        <strong>Binomial</strong>
        <p style="font-size:0.85rem;">Success/failure in well tests<br>Risk analysis</p>
      </div>
    </div>
    <div class="tip-box">
      💡 P10, P50, P90 — these percentiles are the language of uncertainty in petroleum engineering!
    </div>
  `},
  // ── Slide 6: Correlation & Regression ──────────────────────────────
  { title: 'Correlation & Regression', content: `
    <h2>📐 Correlation &amp; Linear Regression</h2>
    <div class="formula">r = cov(x,y) / (σ<sub>x</sub> · σ<sub>y</sub>)<br>y = mx + c</div>
    <p><strong>Pearson's r:</strong> Measures a <em>linear</em> relationship between -1 and +1.</p>
    <ul>
      <li><strong>r = 0.7 to 1.0:</strong> Strong correlation</li>
      <li><strong>r = 0.3 to 0.7:</strong> Moderate</li>
      <li><strong>r &lt; 0.3:</strong> Weak</li>
    </ul>
    <div style="padding:12px 16px;border-radius:8px;background:#f0f4ff;margin:12px 0;">
      <strong>Other correlation measures:</strong>
      <ul style="margin:6px 0 0;">
        <li><strong>Spearman's ρ</strong> — rank-based; captures any <em>monotonic</em> trend, no linearity needed, robust to outliers</li>
        <li><strong>Kendall's τ</strong> — rank-based concordance; good for small samples</li>
        <li><strong>R²</strong> — how well the regression line fits (reported alongside r)</li>
      </ul>
    </div>
    <div class="highlight" style="padding:12px 16px;border-radius:8px;background:#fef3c7;">
      <strong>Pet. Eng. Example:</strong> Porosity vs Permeability — the most-used correlation in petrophysics.
      But it is <strong>not linear</strong>: permeability spans orders of magnitude, so we fit
      <strong>log₁₀(k) vs φ</strong> (log-linear) and compute Pearson's r on the <em>transformed</em> values.
    </div>
  `},
  // ── Slide 7: CHECKPOINT — Part 1 Summary + Quiz ─────────────────────
  { title: 'Part 1 Recap → Quiz Time', content: `
    <div style="text-align:center;margin-bottom:12px;">
      <span style="padding:4px 14px;background:#dbeafe;color:#2563eb;border-radius:999px;font-weight:700;font-size:0.9rem;">PART 1 COMPLETE</span>
    </div>
    <h2>📌 Part 1 Recap — Descriptive Statistics</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;">
      <div style="padding:14px;background:#f0f4ff;border-radius:8px;">
        <strong>Central Tendency</strong>
        <p style="font-size:0.85rem;">Mean is sensitive to outliers · median is robust · mode suits categorical data</p>
      </div>
      <div style="padding:14px;background:#fef3c7;border-radius:8px;">
        <strong>Spread</strong>
        <p style="font-size:0.85rem;">σ² and σ measure dispersion · 68-95-99.7 rule · CV compares scales</p>
      </div>
      <div style="padding:14px;background:#d1fae5;border-radius:8px;">
        <strong>Distributions</strong>
        <p style="font-size:0.85rem;">Normal for porosity · log-normal for permeability · percentiles = P10/P50/P90</p>
      </div>
      <div style="padding:14px;background:#ede9fe;border-radius:8px;">
        <strong>Relationships</strong>
        <p style="font-size:0.85rem;">Pearson's r from -1 to +1 · regression fits the trend line</p>
      </div>
    </div>
    <div class="tip-box" style="text-align:center;font-size:1.05rem;">
      🏆 <strong>Quiz Round 1 — grab your phone!</strong><br>
      <span style="font-size:0.9rem;">Questions on mean, spread, distributions and correlation.</span>
    </div>
  `},
  // ── Slide 8: Stats in Reservoir Characterization ────────────────────
  { title: 'Stats in Reservoir Characterization', content: `
    <h2>🛢️ Reservoir Characterization</h2>
    <p>Every reservoir is <strong>heterogeneous</strong> — properties vary spatially.</p>
    <ul>
      <li><strong>Geostatistics:</strong> Kriging, Sequential Gaussian Simulation</li>
      <li><strong>Variogram:</strong> Measures spatial correlation — "how far does similarity persist?"</li>
      <li><strong>Monte Carlo Simulation:</strong> Running 1000s of realizations for uncertainty range</li>
    </ul>

    <div class="formula">γ(h) = (1/2N) Σ [Z(x) - Z(x+h)]²</div>
    <p style="font-size:0.9rem;margin-top:-4px;">
      <strong>Semivariance γ(h)</strong> — half the average squared difference between values separated by distance <em>h</em>.
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;font-size:0.82rem;">
      <div style="padding:8px 12px;background:#f1f5f9;border-radius:6px;"><strong>γ(h)</strong> — semivariance at separation <em>h</em></div>
      <div style="padding:8px 12px;background:#f1f5f9;border-radius:6px;"><strong>Z(x)</strong> — value at location x</div>
      <div style="padding:8px 12px;background:#f1f5f9;border-radius:6px;"><strong>Z(x+h)</strong> — value a distance h away</div>
      <div style="padding:8px 12px;background:#f1f5f9;border-radius:6px;"><strong>N</strong> — number of pairs at that distance</div>
    </div>
    <p style="font-size:0.88rem;">
      Small γ(h) → nearby points are <em>similar</em>. As h grows, γ(h) rises and flattens at the
      <strong>sill</strong>; the distance where it flattens is the <strong>range</strong> — beyond it, points are uncorrelated.
    </p>

    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0;font-size:0.82rem;">
      <span style="padding:8px 12px;background:#dbeafe;border-radius:6px;"><strong>Variogram</strong><br>quantifies spatial correlation</span>
      <span style="color:#94a3b8;font-weight:700;">→</span>
      <span style="padding:8px 12px;background:#d1fae5;border-radius:6px;"><strong>Kriging / SGS</strong><br>use it to build realizations</span>
      <span style="color:#94a3b8;font-weight:700;">→</span>
      <span style="padding:8px 12px;background:#fef3c7;border-radius:6px;"><strong>Monte Carlo</strong><br>many realizations → uncertainty range</span>
    </div>

    <div class="tip-box">
      💡 <strong>Your Stats Knowledge →</strong> The semivariogram is <em>variance</em> conditioned on distance.
      Distribution choice directly impacts reserve estimates by millions of barrels!
    </div>
  `},
  // ── Slide 9: Uncertainty Quantification ─────────────────────────────
  { title: 'Uncertainty Quantification', content: `
    <h2>🎯 P10 · P50 · P90 — The Industry Standard</h2>
    <p>Every petroleum project reports reserves with uncertainty ranges:</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:16px 0;">
      <div style="text-align:center;padding:16px;background:#d1fae5;border-radius:8px;">
        <div style="font-size:2rem;font-weight:800;color:#059669;">P90</div>
        <div style="font-size:0.85rem;">90% probability<br>of exceeding<br><strong>Conservative</strong></div>
      </div>
      <div style="text-align:center;padding:16px;background:#fef3c7;border-radius:8px;">
        <div style="font-size:2rem;font-weight:800;color:#d97706;">P50</div>
        <div style="font-size:0.85rem;">50% probability<br>of exceeding<br><strong>Best Estimate</strong></div>
      </div>
      <div style="text-align:center;padding:16px;background:#fee2e2;border-radius:8px;">
        <div style="font-size:2rem;font-weight:800;color:#dc2626;">P10</div>
        <div style="font-size:0.85rem;">10% probability<br>of exceeding<br><strong>Optimistic</strong></div>
      </div>
    </div>
    <p>These are just <strong>percentiles</strong> — something you learned in your first stats class!</p>
  `},
  /* ── Slide 10: Monte Carlo HIIP — interactive ─────────────────────────
     Driven by initMonteCarlo() further down this file. Every control carries a
     data-mc-* hook so the logic stays out of the markup. */
  { title: 'Monte Carlo: How Much Oil Is Down There?', content: `
    <h2>🎲 Monte Carlo — Estimating HIIP</h2>
    <div class="formula" style="margin:6px 0 10px;">
      HIIP = 7758 × A × h × φ × (1 − S<sub>w</sub>) / B<sub>oi</sub> &nbsp;<span style="font-size:0.75rem;color:#64748b;">(STB)</span>
    </div>
    <p style="font-size:0.86rem;margin:0 0 10px;">
      We never know A, h, φ or S<sub>w</sub> exactly — so we draw each from a <strong>distribution</strong>,
      compute HIIP thousands of times, and read the answer off the spread.
    </p>

    <!-- .mc-grid (style.css) stretches both columns to equal height so the
         chart can grow to match the inputs panel, and stacks on narrow phones. -->
    <div class="mc-grid">
      <!-- Inputs -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">
        <div data-mc-inputs style="display:flex;flex-direction:column;gap:9px;"></div>

        <label style="display:block;margin-top:12px;font-size:0.75rem;font-weight:700;color:#334155;">
          Simulations: <span data-mc-n-label>1000</span>
        </label>
        <input type="range" data-mc-n min="1" max="4" step="1" value="3"
               style="width:100%;margin-top:4px;" aria-label="Number of simulations">
        <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:#94a3b8;">
          <span>10</span><span>100</span><span>1k</span><span>10k</span>
        </div>

        <div style="display:flex;gap:6px;margin-top:12px;">
          <button data-mc-run class="btn btn-primary btn-sm" style="flex:1;">🎲 Run</button>
          <button data-mc-reseed class="btn btn-sm" style="background:#e2e8f0;color:#334155;"
                  title="New random draw, same settings">↻</button>
        </div>
        <p style="margin:8px 0 0;font-size:0.68rem;color:#64748b;line-height:1.35;">
          B<sub>oi</sub> fixed at 1.25 rb/stb. Each run redraws every variable.
        </p>
      </div>

      <!-- Outputs: column flexes so the histogram takes all leftover height -->
      <div style="display:flex;flex-direction:column;min-height:0;">
        <div data-mc-stats style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;flex-shrink:0;"></div>
        <div style="margin-top:10px;display:flex;flex-direction:column;flex:1;min-height:0;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-shrink:0;">
            <strong style="font-size:0.8rem;color:#334155;">HIIP distribution (MMSTB)</strong>
            <span data-mc-note style="font-size:0.68rem;color:#64748b;"></span>
          </div>
          <!-- flex:1 + min-height:0 lets this fill the gap instead of a fixed height -->
          <div data-mc-hist
               style="display:flex;align-items:flex-end;gap:2px;flex:1;min-height:150px;margin-top:6px;
                      padding:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;"></div>
          <div data-mc-axis style="display:flex;justify-content:space-between;font-size:0.63rem;color:#94a3b8;margin-top:2px;flex-shrink:0;"></div>
        </div>
      </div>
    </div>

    <div class="tip-box" style="margin-top:10px;">
      💡 <strong>Watch this:</strong> with 10 runs the P10/P50/P90 jump around every time you press Run.
      By 10 000 they barely move. That's the <strong>Law of Large Numbers</strong> — and it's why the
      industry quotes reserves as a range, not a single number.
    </div>
  `},
  // ── Slide 11: Data Analytics in Drilling ───────────────────────────
  { title: 'Drilling Analytics', content: `
    <h2>⛰️ Statistical Process Control in Drilling</h2>
    <ul>
      <li><strong>Control Charts:</strong> Monitor weight-on-bit, torque, mud density in real-time</li>
      <li><strong>Upper/Lower Control Limits:</strong> μ ± 3σ</li>
      <li><strong>Outliers:</strong> Signal potential kicks, lost circulation, or bit dysfunction</li>
    </ul>
    <div style="text-align:center;margin:12px 0;padding:10px;background:#f1f5f9;border-radius:8px;">
      <code>UCL = μ + 3σ &nbsp;|&nbsp; CL = μ &nbsp;|&nbsp; LCL = μ - 3σ</code>
    </div>

    <!-- Live control charts rendered by initDrillingCharts() in this file. -->
    <div data-drill-charts style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:12px 0;"></div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.72rem;color:#64748b;margin-bottom:8px;">
      <span><span style="display:inline-block;width:18px;height:0;border-top:2px solid #059669;vertical-align:middle;"></span> CL (mean)</span>
      <span><span style="display:inline-block;width:18px;height:0;border-top:2px dashed #dc2626;vertical-align:middle;"></span> UCL / LCL (μ ± 3σ)</span>
      <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#dc2626;vertical-align:middle;"></span> Out of control</span>
    </div>

    <div class="warn-box">
      ⚠️ Every time you see a "normal range" in engineering — that's μ ± something × σ. Stats is everywhere!
    </div>
  `},
  // ── Slide 12: CHECKPOINT — Part 2 Summary + Quiz ───────────────────
  { title: 'Part 2 Recap → Quiz Time', content: `
    <div style="text-align:center;margin-bottom:12px;">
      <span style="padding:4px 14px;background:#fef3c7;color:#d97706;border-radius:999px;font-weight:700;font-size:0.9rem;">PART 2 COMPLETE</span>
    </div>
    <h2>📌 Part 2 Recap — Industry Insights</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;">
      <div style="padding:14px;background:#f0f4ff;border-radius:8px;">
        <strong>Reservoir Characterization</strong>
        <p style="font-size:0.85rem;">Variograms capture spatial correlation · kriging and Monte Carlo build realizations</p>
      </div>
      <div style="padding:14px;background:#fef3c7;border-radius:8px;">
        <strong>Uncertainty</strong>
        <p style="font-size:0.85rem;">P90 conservative · P50 best estimate · P10 optimistic — just percentiles</p>
      </div>
      <div style="padding:14px;background:#d1fae5;border-radius:8px;">
        <strong>Monte Carlo</strong>
        <p style="font-size:0.85rem;">Sample each input from a distribution · more runs = stabler P10/P50/P90</p>
      </div>
      <div style="padding:14px;background:#ede9fe;border-radius:8px;">
        <strong>Drilling Analytics</strong>
        <p style="font-size:0.85rem;">Control charts with μ ± 3σ limits · outliers flag kicks and bit dysfunction</p>
      </div>
    </div>
    <div class="tip-box" style="text-align:center;font-size:1.05rem;">
      🏆 <strong>Quiz Round 2 — phones up!</strong><br>
      <span style="font-size:0.9rem;">Questions on geostatistics, P10/P50/P90, t-tests and control charts.</span>
    </div>
  `},
  // ── Slide 13: Stats → ML → AI + Where It's Used (merged) ────────────
  { title: 'From Stats to AI in Industry', content: `
    <h2>🤖 Stats → ML → AI</h2>
    <p style="margin-top:-4px;">Machine Learning is <strong>applied statistics at scale</strong> — and it's already running across the energy industry.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0;">
      <div style="padding:12px;background:#f0f4ff;border-radius:8px;">
        <strong>Stats Concept</strong>
        <ul style="font-size:0.85rem;margin-top:4px;">
          <li>Linear / Logistic Regression</li>
          <li>Bayes' Theorem</li>
          <li>Principal Components</li>
        </ul>
      </div>
      <div style="padding:12px;background:#ede9fe;border-radius:8px;">
        <strong>ML Equivalent</strong>
        <ul style="font-size:0.85rem;margin-top:4px;">
          <li>Neural Networks</li>
          <li>Classification / Naive Bayes</li>
          <li>Dimensionality Reduction</li>
        </ul>
      </div>
    </div>
    <strong style="font-size:0.9rem;color:#334155;">🏭 Where AI is used today</strong>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0 12px;">
      <div style="padding:10px;background:#dbeafe;border-radius:8px;">
        <strong style="font-size:0.85rem;">📡 Seismic</strong>
        <p style="font-size:0.78rem;margin-top:2px;">Picks faults &amp; horizons 10× faster</p>
      </div>
      <div style="padding:10px;background:#d1fae5;border-radius:8px;">
        <strong style="font-size:0.85rem;">🛢️ Production</strong>
        <p style="font-size:0.78rem;margin-top:2px;">Predicts well performance, optimizes lift</p>
      </div>
      <div style="padding:10px;background:#fef3c7;border-radius:8px;">
        <strong style="font-size:0.85rem;">🔧 Maintenance</strong>
        <p style="font-size:0.78rem;margin-top:2px;">Equipment failure from sensor data</p>
      </div>
    </div>
    <div class="ai-box">
      🤖 <strong>Key Insight:</strong> AI amplifies a petroleum engineer's ability — but <em>cannot replace</em> domain expertise and statistical literacy. Your stats foundation is a <strong>huge advantage</strong> in understanding it.
    </div>
  `},
  // ── Slide 14: Copilot, Not Autopilot + Risks (merged) ──────────────
  { title: 'AI as Copilot, Not Autopilot', content: `
    <h2>✈️ Copilot vs Autopilot</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0;">
      <div style="padding:14px;background:#d1fae5;border-radius:12px;border:2px solid #059669;">
        <h3 style="color:#059669;font-size:1rem;">✅ Copilot — YOU pilot</h3>
        <ul style="margin-top:6px;font-size:0.85rem;">
          <li>You ask, you verify outputs</li>
          <li>You make final decisions</li>
          <li>You stay accountable</li>
        </ul>
      </div>
      <div style="padding:14px;background:#fee2e2;border-radius:12px;border:2px solid #dc2626;">
        <h3 style="color:#dc2626;font-size:1rem;">❌ Autopilot — AI drives</h3>
        <ul style="margin-top:6px;font-size:0.85rem;">
          <li>You accept blindly, no checks</li>
          <li>You lose critical thinking</li>
          <li>You can't explain results</li>
        </ul>
      </div>
    </div>
    <p class="highlight" style="padding:10px 12px;border-radius:8px;background:#fef3c7;font-weight:600;margin:0 0 12px;">
      🎯 Rule: If you can't verify it, don't use it!
    </p>
    <strong style="font-size:0.9rem;color:#334155;">⚠️ The risks that make this matter</strong>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0;">
      <div style="padding:10px;background:#fee2e2;border-radius:8px;font-size:0.82rem;">
        <strong>🫎 Hallucination</strong> — confidently makes up facts
      </div>
      <div style="padding:10px;background:#fef3c7;border-radius:8px;font-size:0.82rem;">
        <strong>⚖️ Bias</strong> — learns and amplifies biased data
      </div>
      <div style="padding:10px;background:#fee2e2;border-radius:8px;font-size:0.82rem;">
        <strong>📋 Over-reliance</strong> — your own skills weaken
      </div>
      <div style="padding:10px;background:#fef3c7;border-radius:8px;font-size:0.82rem;">
        <strong>🔍 Black box</strong> — can't explain the decision
      </div>
    </div>
    <div class="warn-box">
      ⚠️ In petroleum engineering, wrong decisions cost MILLIONS and can be safety-critical!
    </div>
  `},
  // ── Slide 15: Responsible AI + Prompting (merged) ──────────────────
  { title: 'Responsible AI — Why & How', content: `
    <h2>🤝 Responsible AI</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0;">
      <div style="padding:14px;background:#d1fae5;border-radius:8px;border-left:4px solid #059669;">
        <strong>⚠️ WHY it matters</strong>
        <ul style="margin-top:6px;padding-left:20px;font-size:0.83rem;">
          <li><strong>AI can be wrong</strong> — hallucination, bias, errors are real</li>
          <li><strong>You own the result</strong> — submit AI work, you're accountable</li>
          <li><strong>Real consequences</strong> — millions of dollars, safety</li>
        </ul>
      </div>
      <div style="padding:14px;background:#fef3c7;border-radius:8px;border-left:4px solid #d97706;">
        <strong>✅ HOW to practice it</strong>
        <ol style="margin-top:6px;padding-left:20px;font-size:0.83rem;">
          <li><strong>Verify</strong> against trusted sources</li>
          <li><strong>Stay in the loop</strong> — copilot, not autopilot</li>
          <li><strong>Be transparent</strong> — cite AI use</li>
          <li><strong>Know the limits</strong> — no physics, safety or ethics reasoning</li>
        </ol>
      </div>
    </div>
    <strong style="font-size:0.9rem;color:#334155;">✍️ Prompting well is how you "verify" and "give context"</strong>
    <div class="tip-box" style="margin:8px 0;">
      💡 <strong>Bad:</strong> "Solve this stats problem"<br>
      <strong>Good:</strong> "Porosity from 12 core samples: [12, 15, 14, 18, 11, 13, 17, 16, 14, 15, 19, 12]. Compute mean, median, std dev, and interpret for reservoir heterogeneity."
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0;">
      <div style="padding:10px;background:#d1fae5;border-radius:8px;">
        <strong style="font-size:0.85rem;">✅ Do</strong>
        <ul style="font-size:0.8rem;margin-top:2px;">
          <li>Provide context</li>
          <li>Ask for step-by-step</li>
          <li>Challenge the answer</li>
        </ul>
      </div>
      <div style="padding:10px;background:#fee2e2;border-radius:8px;">
        <strong style="font-size:0.85rem;">❌ Don't</strong>
        <ul style="font-size:0.8rem;margin-top:2px;">
          <li>Copy-paste blindly</li>
          <li>Share personal data</li>
          <li>Avoid thinking yourself</li>
        </ul>
      </div>
    </div>
    <div style="padding:8px 12px;background:#f1f5f9;border-radius:8px;font-size:0.78rem;text-align:center;color:#64748b;">
      📖 <strong>Industry Standard:</strong> The <a href="https://www.nist.gov/ai-rmf" target="_blank" style="color:#2563eb;">NIST AI Risk Management Framework</a> formalizes these principles — used by Microsoft, Google, AWS and energy companies worldwide.
    </div>
  `},
  // ── Slide 16: CHECKPOINT — Part 3 Summary + Quiz ───────────────────
  { title: 'Part 3 Recap → Quiz Time', content: `
    <div style="text-align:center;margin-bottom:12px;">
      <span style="padding:4px 14px;background:#ede9fe;color:#7c3aed;border-radius:999px;font-weight:700;font-size:0.9rem;">PART 3 COMPLETE</span>
    </div>
    <h2>📌 Part 3 Recap — Responsible AI</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;">
      <div style="padding:14px;background:#f0f4ff;border-radius:8px;">
        <strong>Stats → ML → AI</strong>
        <p style="font-size:0.85rem;">ML is applied statistics at scale · your stats base transfers directly</p>
      </div>
      <div style="padding:14px;background:#fef3c7;border-radius:8px;">
        <strong>Copilot, Not Autopilot</strong>
        <p style="font-size:0.85rem;">You verify, you decide, you stay accountable. Can't verify it? Don't use it</p>
      </div>
      <div style="padding:14px;background:#fee2e2;border-radius:8px;">
        <strong>Know the Risks</strong>
        <p style="font-size:0.85rem;">Hallucination · bias from training data · over-reliance · black box</p>
      </div>
      <div style="padding:14px;background:#d1fae5;border-radius:8px;">
        <strong>Practice It</strong>
        <p style="font-size:0.85rem;">Give context, verify outputs, be transparent, never share personal data</p>
      </div>
    </div>
    <div class="tip-box" style="text-align:center;font-size:1.05rem;">
      🏆 <strong>Quiz Round 3 — last one, make it count!</strong><br>
      <span style="font-size:0.9rem;">Questions on AI risks, responsible use and prompting.</span>
    </div>
  `},
  // ── Slide 17: Your Stats Foundation ────────────────────────────────
  { title: 'Your Superpower: Statistical Thinking', content: `
    <h2>🧠 Your Stats Foundation is Your Edge</h2>
    <p>Here's what you already know that makes you valuable in industry:</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;">
      <div style="padding:16px;background:#f0f4ff;border-radius:8px;text-align:center;">
        <div style="font-size:2rem;">📊</div>
        <strong>Data Literacy</strong>
        <p style="font-size:0.85rem;">You understand what data means</p>
      </div>
      <div style="padding:16px;background:#fef3c7;border-radius:8px;text-align:center;">
        <div style="font-size:2rem;">🎲</div>
        <strong>Uncertainty</strong>
        <p style="font-size:0.85rem;">You know nothing is certain</p>
      </div>
      <div style="padding:16px;background:#d1fae5;border-radius:8px;text-align:center;">
        <div style="font-size:2rem;">📐</div>
        <strong>Pattern Recognition</strong>
        <p style="font-size:0.85rem;">Correlation, trends, outliers</p>
      </div>
      <div style="padding:16px;background:#ede9fe;border-radius:8px;text-align:center;">
        <div style="font-size:2rem;">🧪</div>
        <strong>Hypothesis Testing</strong>
        <p style="font-size:0.85rem;">Making data-driven decisions</p>
      </div>
    </div>
    <p class="highlight" style="padding:12px;border-radius:8px;background:#fef3c7;">
      🎯 These skills are <strong>NOT</strong> replaceable by AI. They are your competitive advantage.
    </p>
  `},
  // ── Slide 18: Career Pathways ──────────────────────────────────────
  { title: 'Career Pathways', content: `
    <h2>🚀 Where Stats + AI Takes You</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;">
      <div style="padding:16px;background:#f0f4ff;border-radius:8px;">
        <strong>🛢️ Petroleum Engineering</strong>
        <p style="font-size:0.85rem;">Reservoir engineer, petrophysicist, drilling engineer, production technologist</p>
      </div>
      <div style="padding:16px;background:#d1fae5;border-radius:8px;">
        <strong>📊 Data Science</strong>
        <p style="font-size:0.85rem;">Data analyst, ML engineer, AI specialist — in energy or any sector</p>
      </div>
      <div style="padding:16px;background:#fef3c7;border-radius:8px;">
        <strong>🌏 Sustainability</strong>
        <p style="font-size:0.85rem;">Carbon capture, geothermal, renewable energy analytics</p>
      </div>
      <div style="padding:16px;background:#ede9fe;border-radius:8px;">
        <strong>🏦 Finance</strong>
        <p style="font-size:0.85rem;">Quantitative analysis, risk management (stats majors are everywhere!)</p>
      </div>
    </div>
    <div class="tip-box">
      💡 My own path went petrophysics → data science → AI leadership, all inside one company. The domain knowledge
      plus statistics is what made the jump possible.
    </div>
  `},
  // ── Slide 19: Key Takeaways ────────────────────────────────────────
  { title: 'Key Takeaways', content: `
    <h2>🎯 5 Key Takeaways</h2>
    <div style="display:flex;flex-direction:column;gap:12px;margin:16px 0;">
      <div style="padding:16px;background:#f0f4ff;border-radius:8px;border-left:4px solid #2563eb;">
        <strong>1. Stats is Everywhere in Engineering</strong>
        <p style="font-size:0.9rem;">From P10/P90 reserves to control charts — your stats foundation is directly applicable.</p>
      </div>
      <div style="padding:16px;background:#d1fae5;border-radius:8px;border-left:4px solid #059669;">
        <strong>2. AI is a Copilot, Not Autopilot</strong>
        <p style="font-size:0.9rem;">Use AI to augment your thinking, never to replace it.</p>
      </div>
      <div style="padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #d97706;">
        <strong>3. Always Verify</strong>
        <p style="font-size:0.9rem;">If you can't verify AI output, don't use it. Hallucinations are real.</p>
      </div>
      <div style="padding:16px;background:#ede9fe;border-radius:8px;border-left:4px solid #7c3aed;">
        <strong>4. Your Skills + AI = Superpower</strong>
        <p style="font-size:0.9rem;">Statistical thinking + AI tools makes you unstoppable.</p>
      </div>
      <div style="padding:16px;background:#fee2e2;border-radius:8px;border-left:4px solid #dc2626;">
        <strong>5. Stay Accountable</strong>
        <p style="font-size:0.9rem;">You own the result. Be ethical. Cite AI use.</p>
      </div>
    </div>
  `},
  // ── Slide 20: Part 4 — Final Quiz + Open Q&A ───────────────────────
  { title: 'Part 4: Open Q&A', content: `
    <div style="text-align:center;padding:24px 0;">
      <div class="tip-box" style="max-width:560px;margin:0 auto 24px;text-align:center;font-size:1.05rem;">
        🏆 <strong>One last quiz — phones up!</strong><br>
        <span style="font-size:0.9rem;">A quick wrap-up round on takeaways, skills and careers before we open the floor.</span>
      </div>
      <div style="font-size:4rem;margin-bottom:16px;">💬</div>
      <h1 style="font-size:2rem;margin-bottom:8px;">Part 4 — Open Q&amp;A</h1>
      <p style="font-size:1.1rem;color:#64748b;margin-bottom:24px;">Quiz done? Phones down — let's just talk.</p>
      <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;">
        <span style="padding:8px 16px;background:#dbeafe;border-radius:8px;">🙋 Raise your hand</span>
        <span style="padding:8px 16px;background:#d1fae5;border-radius:8px;">✨ No question is too simple</span>
        <span style="padding:8px 16px;background:#fef3c7;border-radius:8px;">🎓 Studies · careers · AI</span>
      </div>
      <div style="margin-top:28px;">
        <p style="font-size:0.9rem;color:#64748b;">Final scores are on the dashboard once the quiz closes.<br>Feedback form is still open on your student page.</p>
      </div>
    </div>
  `},
  // ── Slide 21: Thank You ────────────────────────────────────────────
  { title: 'Thank You!', content: `
    <div style="text-align:center;padding:40px 0;">
      <div style="font-size:4rem;margin-bottom:16px;">🙏</div>
      <h1 style="font-size:2.4rem;margin-bottom:8px;">Thank You!</h1>
      <p style="font-size:1.2rem;color:#2563eb;font-weight:600;margin-bottom:24px;">Descriptive Statistics in Practice · Industry Insights and Responsible AI</p>
      <p style="font-size:1rem;color:#64748b;margin-bottom:8px;">Universiti Teknologi PETRONAS · Foundation Program</p>
      <p style="font-size:1rem;color:#64748b;margin-bottom:24px;">October 2026</p>
      <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:32px;">
        <span style="padding:8px 16px;background:#dbeafe;border-radius:8px;">📧 imranfadhil@gmail.com</span>
        <span style="padding:8px 16px;background:#dbeafe;border-radius:8px;">🔗 linkedin.com/in/imran-fadhil-67707456</span>
        <span style="padding:8px 16px;background:#dbeafe;border-radius:8px;">🐍 github.com/imranfadhil</span>
      </div>
      <div style="padding:20px;background:#fef3c7;border-radius:12px;max-width:500px;margin:0 auto;">
        <strong>🌟 Final Thought:</strong><br>
        "AI will not replace you.<br>
        A person using AI responsibly WILL."
      </div>
    </div>
  `},
];

/* ── Standby / interim screen shown when the session is not active ───────
   Shared by Present Mode and the Student view so both look consistent
   before the lecturer starts and after they stop. */
const STANDBY_HTML = `
  <div class="standby">
    <div class="standby-pulse">
      <img src="/UTP-logo2.png" alt="Universiti Teknologi PETRONAS" style="height:72px;width:auto;">
    </div>
    <h1 class="standby-title">Descriptive Statistics in Practice</h1>
    <p class="standby-subtitle">Industry Insights and Responsible AI</p>
    <div class="standby-badge">
      <span class="standby-dot"></span> Starting soon — please hold on
    </div>
    <p class="standby-hint">The session will begin when the lecturer starts.</p>
  </div>
`;

/* ── Live word cloud renderer ────────────────────────────────────────────
   Any slide can embed a live word cloud by adding a container with the
   [data-live-wordcloud] attribute. Lecturer, Present and Student views all
   call this whenever fresh `wordCloud` data arrives from the server, so the
   same slide stays in sync everywhere. */
const WC_RATING_WORDS = new Set(['Excellent', 'Great', 'Okay', 'Poor', 'Bad']);
const WC_PALETTE = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777'];

function renderLiveWordCloud(words) {
  const targets = document.querySelectorAll('[data-live-wordcloud]');
  if (!targets.length) return;

  let html;
  if (!words || words.length === 0) {
    html = '<div class="loading-text">Waiting for your words…</div>';
  } else {
    const counts = words.map(w => w.count);
    const maxCount = Math.max(...counts, 1);
    const minCount = Math.min(...counts);
    html = words.map((w, i) => {
      // Scale 1.0rem → 3.2rem by frequency so the mode visibly dominates.
      const t = maxCount === minCount ? 1 : (w.count - minCount) / (maxCount - minCount);
      const size = (1 + t * 2.2).toFixed(2);
      const color = WC_PALETTE[i % WC_PALETTE.length];
      const isRating = WC_RATING_WORDS.has(w.word);
      const style = `font-size:${size}rem;color:${color};font-weight:${isRating ? 800 : 600};` +
        (isRating ? 'text-transform:uppercase;letter-spacing:0.5px;' : '');
      const plural = w.count === 1 ? '' : 's';
      return `<span class="wc-word" style="${style}" title="${w.count} mention${plural}">${wcEscape(w.word)}</span>`;
    }).join('');
  }

  targets.forEach(el => { el.innerHTML = html; });
}

function wcEscape(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ── Monte Carlo HIIP simulator ──────────────────────────────────────────
   Powers the interactive slide. Any view that renders slides calls
   initMonteCarlo() after injecting HTML; it wires up whatever controls it
   finds and does nothing when the slide isn't present.

   HIIP = 7758 · A · h · φ · (1 − Sw) / Boi      [STB]
     7758 = barrels per acre-foot
     A    = area (acres)      h = net thickness (ft)
     φ    = porosity (frac)   Sw = water saturation (frac)
*/
const MC_BOI = 1.25;          // formation volume factor, rb/stb (held fixed)
const MC_STEPS = [10, 100, 1000, 10000];

// Each variable: a distribution that reflects how the property actually behaves.
const MC_VARS = [
  { key: 'area',  label: 'Area',      unit: 'acres', dist: 'triangular', min: 400, mode: 640, max: 900 },
  { key: 'thick', label: 'Net pay',   unit: 'ft',    dist: 'triangular', min: 20,  mode: 45,  max: 80 },
  { key: 'poro',  label: 'Porosity',  unit: 'frac',  dist: 'normal',     mean: 0.22, sd: 0.03, lo: 0.05, hi: 0.35 },
  { key: 'sw',    label: 'Water sat', unit: 'frac',  dist: 'normal',     mean: 0.30, sd: 0.06, lo: 0.05, hi: 0.70 },
];

let mcState = null;

/* Seeded PRNG (mulberry32) so a given seed reproduces the same draw — handy
   when you want to re-show the exact same result on stage. */
function mcRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box–Muller, clamped so a long tail can't produce non-physical values.
function mcNormal(rng, mean, sd, lo, hi) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.min(hi, Math.max(lo, mean + z * sd));
}

// Triangular — the classic choice when you have low/likely/high from geologists.
function mcTriangular(rng, min, mode, max) {
  const u = rng();
  const c = (mode - min) / (max - min);
  return u < c
    ? min + Math.sqrt(u * (max - min) * (mode - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

function mcSample(v, rng) {
  return v.dist === 'normal'
    ? mcNormal(rng, v.mean, v.sd, v.lo, v.hi)
    : mcTriangular(rng, v.min, v.mode, v.max);
}

function mcPercentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Run the simulation and return HIIP values in MMSTB plus summary stats. */
function mcSimulate(n, seed, vars) {
  const rng = mcRng(seed);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const A = mcSample(vars[0], rng);
    const h = mcSample(vars[1], rng);
    const phi = mcSample(vars[2], rng);
    const sw = mcSample(vars[3], rng);
    // /1e6 → MMSTB, friendlier to read than raw STB.
    out[i] = (7758 * A * h * phi * (1 - sw) / MC_BOI) / 1e6;
  }
  const sorted = [...out].sort((a, b) => a - b);
  const mean = out.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(out.reduce((s, x) => s + (x - mean) ** 2, 0) / n);
  return {
    values: out,
    sorted,
    mean,
    sd,
    // Petroleum convention: P90 is the LOW (90% chance of exceeding it).
    p90: mcPercentile(sorted, 0.10),
    p50: mcPercentile(sorted, 0.50),
    p10: mcPercentile(sorted, 0.90),
  };
}

function mcFmt(x) {
  if (x >= 100) return x.toFixed(0);
  if (x >= 10) return x.toFixed(1);
  return x.toFixed(2);
}

function initMonteCarlo() {
  const root = document.querySelector('[data-mc-inputs]');
  if (!root) return; // slide not on screen

  // Deep-copy the defaults so slider edits don't leak between renders.
  const vars = MC_VARS.map(v => ({ ...v }));
  mcState = { vars, seed: 20261026, nIdx: 2 };

  // Build a slider per distribution parameter.
  root.innerHTML = vars.map((v, vi) => {
    const params = v.dist === 'normal'
      ? [['mean', 'μ', v.lo, v.hi, 0.01], ['sd', 'σ', 0.005, 0.12, 0.005]]
      : [['mode', 'likely', v.min, v.max, 1]];
    const rangeText = v.dist === 'normal'
      ? `μ=<span data-mc-out="${vi}.mean">${v.mean}</span> σ=<span data-mc-out="${vi}.sd">${v.sd}</span>`
      : `${v.min}–${v.max}, likely <span data-mc-out="${vi}.mode">${v.mode}</span>`;
    return `<div>
      <div style="display:flex;justify-content:space-between;font-size:0.72rem;">
        <strong style="color:#334155;">${v.label}</strong>
        <span style="color:#64748b;">${v.dist === 'normal' ? 'normal' : 'triangular'}</span>
      </div>
      <div style="font-size:0.68rem;color:#64748b;margin-bottom:2px;">${rangeText} ${v.unit}</div>
      ${params.map(([p, lbl, min, max, step]) => `
        <div style="display:flex;align-items:center;gap:5px;">
          <span style="font-size:0.64rem;color:#94a3b8;width:34px;">${lbl}</span>
          <input type="range" data-mc-var="${vi}" data-mc-param="${p}"
                 min="${min}" max="${max}" step="${step}" value="${v[p]}"
                 style="flex:1;" aria-label="${v.label} ${lbl}">
        </div>`).join('')}
    </div>`;
  }).join('');

  const nSlider = document.querySelector('[data-mc-n]');
  const nLabel = document.querySelector('[data-mc-n-label]');

  function syncLabels() {
    vars.forEach((v, vi) => {
      ['mean', 'sd', 'mode'].forEach(p => {
        const el = document.querySelector(`[data-mc-out="${vi}.${p}"]`);
        if (el && v[p] !== undefined) el.textContent = p === 'mode' ? Math.round(v[p]) : Number(v[p]).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
      });
    });
    if (nLabel) nLabel.textContent = MC_STEPS[mcState.nIdx].toLocaleString();
  }

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.dataset.mcVar) return;
    vars[+t.dataset.mcVar][t.dataset.mcParam] = parseFloat(t.value);
    syncLabels();
    mcRender();
  });

  if (nSlider) {
    nSlider.addEventListener('input', () => {
      mcState.nIdx = (+nSlider.value) - 1;
      syncLabels();
      mcRender();
    });
  }

  const runBtn = document.querySelector('[data-mc-run]');
  const reseedBtn = document.querySelector('[data-mc-reseed]');
  // Both redraw with a fresh seed — that's the point of pressing Run twice.
  const reroll = () => { mcState.seed = (Math.random() * 1e9) | 0; mcRender(); };
  if (runBtn) runBtn.addEventListener('click', reroll);
  if (reseedBtn) reseedBtn.addEventListener('click', reroll);

  syncLabels();
  mcRender();
}

function mcRender() {
  if (!mcState) return;
  const n = MC_STEPS[mcState.nIdx];
  const r = mcSimulate(n, mcState.seed, mcState.vars);

  // Summary cards — P90/P50/P10 first, then spread.
  const statsEl = document.querySelector('[data-mc-stats]');
  if (statsEl) {
    const cards = [
      ['P90', r.p90, '#059669', 'low / conservative'],
      ['P50', r.p50, '#d97706', 'best estimate'],
      ['P10', r.p10, '#dc2626', 'high / optimistic'],
      ['μ', r.mean, '#2563eb', 'mean'],
      ['σ', r.sd, '#7c3aed', 'std dev'],
      ['P10−P90', r.p10 - r.p90, '#0891b2', 'uncertainty range'],
    ];
    statsEl.innerHTML = cards.map(([label, val, color, sub]) => `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:7px 8px;text-align:center;">
        <div style="font-size:0.66rem;color:#64748b;">${label}</div>
        <div style="font-size:1.12rem;font-weight:800;color:${color};line-height:1.2;">${mcFmt(val)}</div>
        <div style="font-size:0.58rem;color:#94a3b8;">${sub}</div>
      </div>`).join('');
  }

  // Histogram
  const histEl = document.querySelector('[data-mc-hist]');
  if (histEl) {
    const bins = 28;
    const lo = r.sorted[0], hi = r.sorted[r.sorted.length - 1];
    const span = (hi - lo) || 1;
    const counts = new Array(bins).fill(0);
    for (const v of r.values) {
      counts[Math.min(bins - 1, Math.floor(((v - lo) / span) * bins))]++;
    }
    const maxC = Math.max(...counts, 1);
    histEl.innerHTML = counts.map((c, i) => {
      const centre = lo + (i + 0.5) * (span / bins);
      // Colour by where the bin sits relative to P90/P10.
      const color = centre < r.p90 ? '#86efac' : centre > r.p10 ? '#fca5a5' : '#60a5fa';
      return `<div title="${mcFmt(centre)} MMSTB — ${c} run${c === 1 ? '' : 's'}"
        style="flex:1;height:${(c / maxC) * 100}%;min-height:${c ? 2 : 0}px;background:${color};border-radius:2px 2px 0 0;"></div>`;
    }).join('');

    const axis = document.querySelector('[data-mc-axis]');
    if (axis) axis.innerHTML = `<span>${mcFmt(lo)}</span><span>${mcFmt((lo + hi) / 2)}</span><span>${mcFmt(hi)}</span>`;
  }

  const note = document.querySelector('[data-mc-note]');
  if (note) {
    note.textContent = n <= 100
      ? `${n.toLocaleString()} runs — press Run again, the answer moves!`
      : `${n.toLocaleString()} runs — stable`;
  }
}

/* ── Drilling control charts ─────────────────────────────────────────────
   Renders three SPC control charts (WOB, torque, mud density) into any
   [data-drill-charts] container on the current slide. Each chart shows the
   centre line (μ), the ±3σ control limits, and a time series with a couple
   of injected out-of-control points so students can see what a "signal"
   looks like. Called from renderSlide() alongside initMonteCarlo(). */

// Deterministic PRNG so the charts look identical on every render.
function drillRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DRILL_SERIES = [
  { label: 'Weight on Bit', unit: 'klbf', mean: 25, sd: 2.0, color: '#2563eb',
    spikes: { 14: 3.6, 27: -3.4 }, note: 'spike → bit dysfunction' },
  { label: 'Torque', unit: 'kft·lbf', mean: 12, sd: 1.2, color: '#7c3aed',
    spikes: { 19: 3.8 }, note: 'spike → stick-slip' },
  { label: 'Mud Density', unit: 'ppg', mean: 10.5, sd: 0.15, color: '#0891b2',
    spikes: { 22: -3.9, 23: -3.2 }, note: 'drop → possible kick' },
];

function initDrillingCharts() {
  const root = document.querySelector('[data-drill-charts]');
  if (!root) return; // slide not on screen

  const N = 32;        // number of time samples
  const VW = 300;      // viewBox width
  const VH = 120;      // viewBox height (aspect ratio preserved on screen)

  root.innerHTML = DRILL_SERIES.map((s, si) => {
    const rng = drillRng(1000 + si * 97);
    const vals = [];
    for (let i = 0; i < N; i++) {
      let v = s.mean + (rng() * 2 - 1) * s.sd * 1.1; // normal-ish noise
      if (s.spikes[i] !== undefined) v = s.mean + s.spikes[i] * s.sd; // injected outlier
      vals.push(v);
    }
    const ucl = s.mean + 3 * s.sd;
    const lcl = s.mean - 3 * s.sd;
    // Scale the y-axis to include the limits and any spikes, with padding.
    const lo = Math.min(lcl, ...vals) - s.sd * 0.6;
    const hi = Math.max(ucl, ...vals) + s.sd * 0.6;
    const y = (v) => ((hi - v) / (hi - lo)) * VH; // viewBox units from top

    const pts = vals.map((v, i) => {
      const x = (i / (N - 1)) * VW;
      const out = v > ucl || v < lcl;
      return { x, y: y(v), out, v };
    });

    const line = pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const dots = pts.map(p => `
      <circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.out ? 3 : 1.8}"
              fill="${p.out ? '#dc2626' : s.color}" stroke="#fff" stroke-width="0.8">
        <title>${s.label}: ${p.v.toFixed(2)} ${s.unit}${p.out ? ' — OUT OF CONTROL' : ''}</title>
      </circle>`).join('');

    return `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
          <strong style="font-size:0.78rem;color:#334155;">${s.label}</strong>
          <span style="font-size:0.62rem;color:#94a3b8;">${s.unit}</span>
        </div>
        <svg viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid meet"
             style="width:100%;height:auto;display:block;">
          <!-- control limits -->
          <line x1="0" y1="${y(ucl).toFixed(2)}" x2="${VW}" y2="${y(ucl).toFixed(2)}"
                stroke="#dc2626" stroke-width="0.8" stroke-dasharray="4 3"/>
          <line x1="0" y1="${y(lcl).toFixed(2)}" x2="${VW}" y2="${y(lcl).toFixed(2)}"
                stroke="#dc2626" stroke-width="0.8" stroke-dasharray="4 3"/>
          <!-- centre line -->
          <line x1="0" y1="${y(s.mean).toFixed(2)}" x2="${VW}" y2="${y(s.mean).toFixed(2)}"
                stroke="#059669" stroke-width="1"/>
          <!-- series -->
          <polyline points="${line}" fill="none" stroke="${s.color}" stroke-width="1.4"
                    stroke-linejoin="round" stroke-linecap="round"/>
          ${dots}
        </svg>
        <div style="display:flex;justify-content:space-between;font-size:0.6rem;color:#94a3b8;margin-top:2px;">
          <span>μ=${s.mean} · UCL=${ucl.toFixed(2)} · LCL=${lcl.toFixed(2)}</span>
        </div>
        <div style="font-size:0.62rem;color:#dc2626;margin-top:2px;">⚠ ${s.note}</div>
      </div>`;
  }).join('');
}
