// Equitybee — Guided Tour
// Steps 2-5 will be added as we build the rest of the flow.
const TOUR_TOTAL = 5;

const TOUR_STEPS = [
  {
    target: '[data-tour-target="target-funding"]',
    arrow: 'up',
    placement: 'bottom-end',
    inset: true,
    title: "This is what we're raising for you",
    callout: { to: 848568.35, format: 'currency' },
    body: `
      <p><span class="tour-token">\${exercise_cost}</span> - The amount needed to exercise your options, including taxes (we use a max estimate; if your actual bill is lower, you keep the difference as cash).</p>
      <p>Once you are funded, you exercise the options yourself - same as if you'd used your own capital - and hold your shares until a future liquidity event.</p>
    `,
  },
  {
    target: '[data-tour-target="how-it-works"]',
    arrow: 'left',
    placement: 'bottom-end',
    title: `Repayment comes only from your share's proceeds, not your pocket - <strong>If shares end at zero, you don't pay anything.</strong>`,
    body: `
      <p>At a liquidity event, you repay investors from your share value - never out of pocket - In this order:</p>
      <ol class="tour-list">
        <li>Funding amount + 5% Placement Fee - returned to investors - this is the total amount we raised for you.</li>
        <li>4% compounding annual interest - on the funding amount, accumulated until exit.</li>
        <li><span class="tour-token">{future_cut}</span>% Investor Portion - paid from the gross share value.</li>
      </ol>
      <p class="tour-after-list">Whatever's left is your profit (Equitybee earns a 5% Stock Appreciation Percentage on it.)</p>
      <p class="tour-after-list">(Click next to simulate various scenarios and see the actual numbers.)</p>
    `,
  },
  {
    target: '[data-tour-target="simulator"]',
    arrow: 'right',
    placement: 'left-of-target',
    showSimulator: true,
    simulatorState: 'empty',
    lottie: 'exit-scenario.json',
    title: "Let's model an exit scenario",
    body: `<p>Fast-forward to a possible liquidity event and see what your take-home could look like. This simulator lets you play out different scenarios - change the share price, change the timeline, understand the financial outcome.</p>`,
  },
  {
    target: '[data-tour-target="simulator"]',
    arrow: 'right',
    placement: 'left-of-target',
    showSimulator: true,
    simulatorState: 'populated',
    simulatorDemo: true,
    title: "Let's model an exit scenario",
    body: `<p>Imagine the exit happens 1 year from now, and the share price climbs above today's <span class="tour-token">\${per_share}</span> - let's set the Future Share Price to <span class="tour-token">\${per_share + 3}</span> (or <span class="tour-token">\${per_share + 5}</span>?)<br/>Your <strong>Estimated Net Proceeds</strong> below updates in real time.</p>`,
  },
  {
    target: '[data-tour-target="simulator"]',
    arrow: 'right',
    placement: 'left-of-target',
    showSimulator: true,
    simulatorState: 'breakdown',
    pulseFinalOnLastBullet: true,
    title: 'The full waterfall',
    body: `
      <p>Here's exactly how repayment plays out in your scenario:</p>
      <ul class="tour-list tour-list--bullets">
        <li>Funding Amount</li>
        <li>5% Placement Fee returned to investors</li>
        <li>Annual Interest accumulated through to exit</li>
        <li>Investor Portion - What are you paying back to the investors, the future Cut on the gross share value</li>
        <li><strong>Estimated Net Proceeds – the final amount you receive!</strong></li>
      </ul>
    `,
  },
];

(function () {
  const guideBtn = document.getElementById('guideMeBtn');
  const tour = document.getElementById('tour');
  const overlay = document.getElementById('tourOverlay');
  const tooltip = document.getElementById('tourTooltip');
  const closeBtn = document.getElementById('tourClose');
  const prevBtn = document.getElementById('tourPrev');
  const nextBtn = document.getElementById('tourNext');
  const stepNumEl = document.getElementById('tourStepNum');
  const titleEl = document.getElementById('tourTitle');
  const calloutEl = document.getElementById('tourCallout');
  const illustrationEl = document.getElementById('tourIllustration');
  const bodyEl = document.getElementById('tourBody');
  const liqSim = document.getElementById('liqSim');

  let currentStep = -1;
  let currentTarget = null;
  let currentLottie = null;
  let simDemoTimer = null;
  let simResultRaf = null;

  // ── Liquidity Simulator demo ─────────────────────────────────
  const SIM_OPTIONS = 143280;
  const SIM_PER_SHARE = 5.37;

  function calcNetProceeds(future, time, investor) {
    const gross = SIM_OPTIONS * future;
    const investorCut = gross * (investor / 100);
    const exerciseCost = SIM_OPTIONS * SIM_PER_SHARE;
    const repayment = exerciseCost * Math.pow(1.04, time);
    const profit = Math.max(0, gross - investorCut - repayment);
    return Math.round(profit * 0.2617); // calibrated so default state hits ~$376,490
  }

  // Sample sequence — moves through realistic exit scenarios so the user can see how
  // each control affects the bottom-line proceeds.
  const SIM_DEMO_STATES = [
    { future: 20.1, time: 3, investor: 20 }, // initial / loop reset
    { future: 22.0, time: 3, investor: 20 },
    { future: 25.0, time: 3, investor: 20 },
    { future: 25.0, time: 5, investor: 20 },
    { future: 25.0, time: 8, investor: 20 },
    { future: 25.0, time: 8, investor: 30 },
    { future: 25.0, time: 8, investor: 40 },
  ];

  function applySimState(state) {
    // Future Share Price (stepper)
    const stepperVal = liqSim.querySelector('.stepper-value');
    if (stepperVal) stepperVal.textContent = '$' + state.future.toFixed(1);

    // Time Until Exit (slider 1-10)
    const timeRow = liqSim.querySelectorAll('.liq-sim-control')[1];
    if (timeRow) {
      const valueLabel = timeRow.querySelector('.liq-sim-control-value');
      if (valueLabel) valueLabel.textContent = state.time + ' Years';
      const pct = ((state.time - 1) / 9) * 100;
      const fill = timeRow.querySelector('.slider-fill');
      const thumb = timeRow.querySelector('.slider-thumb');
      if (fill) fill.style.width = pct + '%';
      if (thumb) thumb.style.left = pct + '%';
    }

    // % Proceeds to Investors (slider 5-45)
    const invRow = liqSim.querySelectorAll('.liq-sim-control')[2];
    if (invRow) {
      const valueLabel = invRow.querySelector('.liq-sim-control-value');
      if (valueLabel) valueLabel.textContent = state.investor + '%';
      const pct = ((state.investor - 5) / 40) * 100;
      const fill = invRow.querySelector('.slider-fill');
      const thumb = invRow.querySelector('.slider-thumb');
      if (fill) fill.style.width = pct + '%';
      if (thumb) thumb.style.left = pct + '%';
    }

    // Result value — smooth tween from current to new
    const resultEl = liqSim.querySelector('.liq-sim-result-value');
    if (resultEl) {
      const next = calcNetProceeds(state.future, state.time, state.investor);
      const current = parseInt((resultEl.textContent || '').replace(/[^\d]/g, ''), 10) || next;
      tweenNumber(resultEl, current, next, 700);
    }
  }

  function tweenNumber(el, from, to, duration) {
    if (simResultRaf) cancelAnimationFrame(simResultRaf);
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (to - from) * ease(t);
      el.textContent = '$' + Math.round(v).toLocaleString('en-US');
      if (t < 1) simResultRaf = requestAnimationFrame(tick);
      else simResultRaf = null;
    };
    simResultRaf = requestAnimationFrame(tick);
  }

  function startSimDemo() {
    stopSimDemo();
    let i = 0;
    const advance = () => {
      applySimState(SIM_DEMO_STATES[i % SIM_DEMO_STATES.length]);
      i++;
      // Hold a touch longer at the loop reset so it doesn't feel jittery
      const hold = (i % SIM_DEMO_STATES.length === 0) ? 2200 : 1700;
      simDemoTimer = setTimeout(advance, hold);
    };
    advance();
  }

  function stopSimDemo() {
    if (simDemoTimer) { clearTimeout(simDemoTimer); simDemoTimer = null; }
    if (simResultRaf) { cancelAnimationFrame(simResultRaf); simResultRaf = null; }
  }

  function openTour() {
    currentStep = 0;
    tour.hidden = false;
    renderStep();
  }

  function closeTour() {
    if (currentTarget) {
      currentTarget.classList.remove('tour-spotlight', 'tour-spotlight--inset');
      currentTarget = null;
    }
    if (currentLottie) {
      currentLottie.destroy();
      currentLottie = null;
    }
    stopSimDemo();
    liqSim?.classList.remove('is-open');
    liqSim?.setAttribute('aria-hidden', 'true');
    tour.hidden = true;
    document.body.style.overflow = '';
    currentStep = -1;
  }

  function renderStep() {
    const step = TOUR_STEPS[currentStep];
    if (!step) {
      closeTour();
      return;
    }

    if (currentTarget) currentTarget.classList.remove('tour-spotlight', 'tour-spotlight--inset');

    // Show or hide the simulator panel based on the step
    if (step.showSimulator) {
      liqSim.classList.add('is-open');
      liqSim.setAttribute('aria-hidden', 'false');
      const empty = document.getElementById('liqSimStateEmpty');
      const populated = document.getElementById('liqSimStatePopulated');
      const breakdown = document.getElementById('liqSimStateBreakdown');
      empty.hidden = step.simulatorState !== 'empty';
      populated.hidden = step.simulatorState !== 'populated';
      breakdown.hidden = step.simulatorState !== 'breakdown';
      // Reset any pulse left over from a prior step
      document.getElementById('liqSimNetRow')?.classList.remove('is-pulsing');
    } else {
      liqSim.classList.remove('is-open');
      liqSim.setAttribute('aria-hidden', 'true');
    }

    // Demo: cycle through sample inputs only when this step calls for it
    stopSimDemo();
    if (step.simulatorDemo) startSimDemo();

    currentTarget = document.querySelector(step.target);
    if (currentTarget) {
      currentTarget.classList.add('tour-spotlight');
      if (step.inset) currentTarget.classList.add('tour-spotlight--inset');
      // Don't auto-scroll fixed-position targets (e.g. simulator panel)
      const isFixed = getComputedStyle(currentTarget).position === 'fixed';
      if (!isFixed) {
        const rect = currentTarget.getBoundingClientRect();
        const targetTop = rect.top + window.scrollY;
        window.scrollTo({ top: Math.max(0, targetTop - 120), behavior: 'smooth' });
      }
    }

    stepNumEl.textContent = currentStep + 1;
    titleEl.innerHTML = step.title;

    if (step.callout) {
      calloutEl.hidden = false;
      const c = step.callout;
      calloutEl.innerHTML = `<span class="tour-tip-callout-value" data-count-to="${c.to}" data-count-format="${c.format || 'integer'}"${c.suffix ? ` data-count-suffix="${c.suffix}"` : ''}>${formatCount(0, c.format || 'integer', c.suffix || '')}</span>`;
      animateCounters(calloutEl);
    } else {
      calloutEl.hidden = true;
    }

    // Tear down any prior Lottie before rendering the new step
    if (currentLottie) { currentLottie.destroy(); currentLottie = null; }
    if (step.lottie && window.lottie) {
      illustrationEl.hidden = false;
      illustrationEl.innerHTML = '';
      currentLottie = window.lottie.loadAnimation({
        container: illustrationEl,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: step.lottie,
      });
      const loopDelay = step.loopDelay ?? 1800; // ms pause between loops
      const animRef = currentLottie;
      animRef.addEventListener('complete', () => {
        setTimeout(() => {
          if (currentLottie === animRef) animRef.goToAndPlay(0, true);
        }, loopDelay);
      });
    } else {
      illustrationEl.hidden = true;
      illustrationEl.innerHTML = '';
    }

    bodyEl.innerHTML = step.body;
    tooltip.dataset.arrow = step.arrow || 'up';

    // Stagger-reveal the breakdown rows in sync with the tooltip bullets,
    // then pulse the final (Net Proceeds) row.
    if (step.simulatorState === 'breakdown') {
      const rows = document.querySelectorAll('#liqSimStateBreakdown .liq-sim-wf-row');
      rows.forEach((r) => r.classList.remove('is-shown'));
      // Force reflow so the transition restarts on re-entry
      void document.body.offsetHeight;
      // Delays mirror the tour-list--bullets CSS delays (in ms)
      const rowDelays = [400, 1200, 2000, 2800, 3600];
      const revealDuration = 600;
      rows.forEach((row, i) => {
        setTimeout(() => row.classList.add('is-shown'), rowDelays[i] ?? 400);
      });
      if (step.pulseFinalOnLastBullet) {
        const finalRow = document.getElementById('liqSimNetRow');
        if (finalRow) {
          finalRow.classList.remove('is-pulsing');
          setTimeout(() => finalRow.classList.add('is-pulsing'), rowDelays[4] + revealDuration);
        }
      }
    }

    prevBtn.hidden = currentStep === 0;
    const arrowSvg = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    nextBtn.innerHTML = currentStep === TOUR_TOTAL - 1 ? `Finish ${arrowSvg}` : `Next ${arrowSvg}`;

    requestAnimationFrame(positionTooltip);
  }

  function positionTooltip() {
    if (!currentTarget) return;
    const rect = currentTarget.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    const gap = 32;
    const arrow = tooltip.dataset.arrow;

    let top, left;

    if (arrow === 'right') {
      // Tooltip sits to the LEFT of the target, vertically centered against the target
      left = rect.left - tipRect.width - gap + window.scrollX;
      top = rect.top + (rect.height - tipRect.height) / 2 + window.scrollY;
    } else {
      // Default: BELOW target, right-aligned to target's right edge
      top = rect.bottom + gap + window.scrollY;
      left = rect.right - tipRect.width + window.scrollX;
      // Pin to viewport bottom if it would overflow (allows overlap with tall targets)
      const viewportBottom = window.scrollY + window.innerHeight - 16;
      if (top + tipRect.height > viewportBottom) {
        top = viewportBottom - tipRect.height;
      }
    }

    // Keep within viewport
    const minLeft = 16;
    const maxLeft = window.innerWidth - tipRect.width - 16 + window.scrollX;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
    const minTop = window.scrollY + 16;
    if (top < minTop) top = minTop;

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';

    // Arrow alignment
    if (arrow === 'left' || arrow === 'right') {
      const targetCenterY = rect.top + rect.height / 2 + window.scrollY;
      const arrowTop = Math.max(20, Math.min(tipRect.height - 20, targetCenterY - top));
      tooltip.style.setProperty('--arrow-top', arrowTop + 'px');
    } else {
      const targetCenterX = rect.left + rect.width / 2 + window.scrollX;
      const arrowLeft = Math.max(20, Math.min(tipRect.width - 20, targetCenterX - left));
      tooltip.style.setProperty('--arrow-left', arrowLeft + 'px');
    }
  }

  function next() {
    if (currentStep >= TOUR_STEPS.length - 1) {
      // Finish: fire confetti from the Finish button, stop the Guide Me pulse, close.
      const rect = nextBtn.getBoundingClientRect();
      fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      guideBtn?.classList.add('guide-me--seen');
      closeTour();
      return;
    }
    currentStep++;
    renderStep();
  }

  // Lightweight canvas confetti — white / green / blue burst from (x, y).
  function fireConfetti(x, y) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const colors = ['#ffffff', '#2eb26a', '#769df8', '#bacefc', '#28a05f'];
    const particles = [];
    const N = 110;
    for (let i = 0; i < N; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // bias upward
        size: 5 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        shape: Math.random() < 0.55 ? 'rect' : 'circle',
      });
    }

    const start = performance.now();
    const duration = 2200;

    function tick(now) {
      const t = (now - start) / duration;
      if (t >= 1) { canvas.remove(); return; }
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = Math.max(0, 1 - t);
      particles.forEach((p) => {
        p.vy += 0.32; // gravity
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function prev() {
    if (currentStep <= 0) return;
    currentStep--;
    renderStep();
  }

  function formatCount(value, format, suffix) {
    let str;
    if (format === 'currency') {
      str = '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (format === 'integer-dollar') {
      str = '$' + Math.round(value).toLocaleString('en-US');
    } else if (format === 'integer') {
      str = Math.round(value).toLocaleString('en-US');
    } else {
      str = String(value);
    }
    return suffix ? str + suffix : str;
  }

  function animateCounters(root) {
    const els = root.querySelectorAll('[data-count-to]');
    els.forEach((el) => {
      const target = parseFloat(el.dataset.countTo);
      const format = el.dataset.countFormat || 'integer';
      const suffix = el.dataset.countSuffix || '';
      const finalText = formatCount(target, format, suffix);
      const charDelay = 70; // ms per character — cashier-tape feel

      // Detect a non-digit prefix (e.g. "$") to blink before typing
      const prefixMatch = finalText.match(/^\D+/);
      const prefix = prefixMatch ? prefixMatch[0] : '';
      const blinkMs = 450;

      el.textContent = '';

      const startTyping = () => {
        let i = prefix.length;
        el.textContent = prefix;
        const interval = setInterval(() => {
          i++;
          el.textContent = finalText.slice(0, i);
          if (i >= finalText.length) clearInterval(interval);
        }, charDelay);
      };

      if (prefix) {
        el.innerHTML = `<span class="tour-prefix-blink">${prefix}</span>`;
        setTimeout(startTyping, blinkMs);
      } else {
        startTyping();
      }
    });
  }

  guideBtn?.addEventListener('click', openTour);
  closeBtn?.addEventListener('click', closeTour);
  nextBtn?.addEventListener('click', next);
  prevBtn?.addEventListener('click', prev);

  window.addEventListener('resize', () => { if (!tour.hidden) positionTooltip(); });
  window.addEventListener('scroll', () => { if (!tour.hidden) positionTooltip(); }, { passive: true });
})();
