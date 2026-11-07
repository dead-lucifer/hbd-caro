(() => {
  const $ = (id) => document.getElementById(id);

  const screens = {
    open: $("screen-open"),
    balloons: $("screen-balloons"),
    doors: $("screen-doors"),
    quiz: $("screen-quiz"),
    photos: $("screen-photos"),
    loading: $("screen-loading"),
    reveal: $("screen-reveal"),
    close: $("screen-close"),
  };

  const COLORS = ["#ff6f91", "#ffc857", "#7dffa8", "#7db7ff", "#ff8fab", "#ffe08a"];

  const DROPS = [
    {
      img: "assets/lake.jpg",
      chip: "mystery drop 01 · unlocked 🌅",
      title: "sunsets & you",
      line: "Beautiful view, golden sky, and you making it a little more special.",
      badge: "+ reward: one sunset date, hopefully together. ❤️",
    },
    {
      img: "assets/bench.jpg",
      chip: "mystery drop 02 · unlocked 🌙",
      title: "little moments, favourite company",
      line: "Some random evenings turn into memories you wish lasted a little longer.",
      badge: "+ reward: one late-night walk with me. ❤️",
    },
    {
      img: "assets/night.jpg",
      chip: "mystery drop 03 · unlocked 💌",
      title: "just because",
      line: "Not every surprise needs a big reason. Sometimes, making you smile is reason enough.",
      badge: "+ reward: one extra reason to smile today. ❤️",
    },
    {
      img: "assets/mall.jpg",
      chip: "mystery drop 04 · unlocked ✨",
      title: "keep this one",
      line: "A silly little frame, a big little feeling. Proof that the best days don't always announce themselves.",
      badge: "+ reward: more days like this, with me around. ❤️",
    },
  ];

  const DROP_PROMPTS = [
    {
      chip: "mission 04 · little things, big feelings 🎁",
      title: "Four little surprises.",
      say: "Each one comes with a memory, a tiny reward, and maybe a little something to make you smile. No peeking ahead. Some things are better discovered one at a time.",
      meter: "drop 1 of 4 · the first little surprise",
      hint: "go on, birthday girl. I saved something nice for you. ❤️",
    },
    {
      chip: "mission 04 · little things, big feelings 🎁",
      title: "two down, two to go.",
      say: "Still with me? Good. The next one is quieter… but it counts.",
      meter: "drop 2 of 4",
      hint: "open it when you're ready. ❤️",
    },
    {
      chip: "mystery drop 03 · almost there 🎁",
      title: "one more little surprise",
      say: "By now, you probably know I like making you smile. Can't really help it.",
      meter: "drop 3 of 4",
      hint: "go on, there's one more after this. ❤️",
    },
    {
      chip: "mission 04 · final drop 🎁",
      title: "last one. make it count.",
      say: "Four of four. No pressure… okay, a little pressure.",
      meter: "drop 4 of 4",
      hint: "this one's for you, birthday girl. ❤️",
    },
  ];

  const LOAD_LINES = [
    "syncing confetti…",
    "warming up the reel…",
    "packing a little more heart into this…",
    "almost ready…",
    "for you…",
  ];

  const quiz = [
    {
      chip: "mission 03 · vibe interrogation 💌",
      title: "First important question.",
      intro: "We need to understand the birthday girl's priorities.",
      q: "Your official birthday breakfast should be…",
      options: [
        "🎂 cake for breakfast — rules are meant to be broken.",
        "🥑 something healthy — responsible adult for the next 24 hours.",
        "🍕 whatever's in the fridge + confidence — a woman of vision.",
      ],
      replies: [
        "correct. doctors can wait till monday. ❤️",
        "respectable… but cake is still watching you.",
        "a woman of vision. noted. proudly.",
      ],
      footer: "choose carefully, Srishti. your answer will be judged (lovingly). ❤️",
    },
    {
      chip: "mission 03 · vibe interrogation 💌",
      title: "vibe check 2/3",
      intro: "Okay, soundtrack round.",
      q: "If today had a soundtrack, it would be…",
      options: [
        "main character walking song",
        "loud family group chat energy",
        "soft lo-fi + one dramatic reels audio",
      ],
      replies: [
        "yes. slow-mo hair flip unlocked.",
        "relatable. unmute at your own risk.",
        "elite mix. algorithm would cry.",
      ],
      footer: "good answer. keep going. ❤️",
    },
    {
      chip: "mission 03 · final interrogation 💗",
      title: "vibe check 3/3",
      intro: "Okay, last question. Be honest, I'm not easily offended. :p",
      q: "How are we rating this little birthday surprise?",
      options: [
        "unexpectedly wholesome — okay, this was actually sweet.",
        "chaotic, but I'm into it — not what I expected, but I like it.",
        "okay ravi, you tried (cute) — effort appreciated. 😂",
      ],
      replies: [
        "okay, this was actually sweet. i'll take that. ❤️",
        "chaotic is the brand. glad you're into it.",
        "effort appreciated. ego fed for 24 hrs. 😂",
      ],
      footer: "choose wisely, birthday girl. I'm taking notes. ❤️",
    },
  ];

  let popped = 0;
  let giftIndex = 1;
  let quizIndex = 0;
  let dropIndex = 0;
  let locked = false;
  let openingDrop = false;

  // Never let the fx canvas steal taps
  const fx = $("fx");
  if (fx) {
    fx.style.pointerEvents = "none";
    fx.style.zIndex = "80";
  }

  function show(name) {
    Object.keys(screens).forEach((key) => {
      const el = screens[key];
      if (el) el.classList.remove("is-on");
    });
    const next = screens[name];
    if (!next) {
      console.error("missing screen", name);
      return;
    }
    next.classList.add("is-on");
    next.scrollTop = 0;
    locked = false;
  }

  function burst(count = 90, originX, originY) {
    const canvas = $("fx");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (!w || !h) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ox = originX == null ? w / 2 : originX;
    const oy = originY == null ? h * 0.42 : originY;

    const bits = Array.from({ length: count }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      return {
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: 3 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: -0.3 + Math.random() * 0.6,
        color: COLORS[i % COLORS.length],
        life: 0,
      };
    });

    let n = 0;
    const frame = () => {
      n += 1;
      ctx.clearRect(0, 0, w, h);
      bits.forEach((p) => {
        p.vy += 0.16;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life += 1;
        ctx.globalAlpha = Math.max(0, 1 - p.life / 70);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      if (n < 75) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    requestAnimationFrame(frame);
  }

  function startBalloons() {
    popped = 0;
    const WORDS = ["Happy", "Birthday", "Srishti", "Carolene", "❤️"];
    const meter = $("balloon-meter");
    const stage = $("balloon-stage");
    const msg = $("balloon-msg");
    if (!stage) return;
    if (meter) meter.textContent = "0 / 5 · tap a balloon";
    if (msg) msg.innerHTML = "";
    stage.innerHTML = "";

    const spots = [
      [6, 8],
      [40, 3],
      [74, 9],
      [20, 38],
      [58, 40],
    ];

    const balloons = [];
    let shooting = false;
    let wordIndex = 0;

    spots.forEach(([left, top], i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const isLast = i === spots.length - 1;
      btn.className = "balloon" + (isLast ? " balloon--heart" : "");
      btn.style.left = left + "%";
      btn.style.top = top + "%";
      btn.style.animationDelay = i * 0.15 + "s";
      btn.style.background = "transparent";
      btn.style.setProperty("--c", COLORS[i % COLORS.length]);
      btn.innerHTML = "<i><span class='balloon__heart'>❤️</span></i>";
      stage.appendChild(btn);
      balloons.push(btn);
    });

    const bow = document.createElement("div");
    bow.className = "bow";
    bow.innerHTML =
      '<svg viewBox="0 0 80 80" aria-hidden="true">' +
      '<path d="M30 6 Q8 40 30 74" fill="none" stroke="#ffc857" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="16" y="33" width="6" height="14" rx="3" fill="#ff6f91"/>' +
      '<path d="M30 6 L30 74" stroke="rgba(255,244,240,.7)" stroke-width="1.2"/>' +
      '<g class="bow__arrow">' +
      '<path d="M26 35 L34 40 L26 45 L30 40 Z" fill="#ff6f91"/>' +
      '<rect x="32" y="38.8" width="38" height="2.4" rx="1.2" fill="#ffc857"/>' +
      '<path d="M68 35 L80 40 L68 45 Z" fill="#fff4f0"/>' +
      "</g></svg>";
    stage.appendChild(bow);

    function revealNextWord() {
      if (!msg || wordIndex >= WORDS.length) return;
      const word = WORDS[wordIndex];
      wordIndex += 1;
      const span = document.createElement("span");
      span.className =
        "balloon-msg__word" + (word === "❤️" ? " balloon-msg__word--heart" : "");
      span.textContent = word;
      msg.appendChild(span);
    }

    function finishPop(btn) {
      if (!btn || btn.classList.contains("is-pop")) return;
      btn.classList.add("is-pop");
      popped += 1;
      revealNextWord();
      const rect = btn.getBoundingClientRect();
      const app = $("app").getBoundingClientRect();
      burst(34, rect.left - app.left + rect.width / 2, rect.top - app.top + 10);
      if (meter) meter.textContent = popped + " / 5";
      shooting = false;
      if (popped >= WORDS.length) {
        setTimeout(() => {
          show("doors");
          setupDoors();
        }, 1000);
      }
    }

    function shootArrowAt(target) {
      if (shooting || !target || target.classList.contains("is-pop")) return;
      shooting = true;

      const stageRect = stage.getBoundingClientRect();
      const bowRect = bow.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const cx = bowRect.left - stageRect.left + bowRect.width / 2;
      const cy = bowRect.top - stageRect.top + bowRect.height / 2;
      const tx = t.left - stageRect.left + t.width / 2;
      const ty = t.top - stageRect.top + t.height * 0.4;
      const rad = Math.atan2(ty - cy, tx - cx);
      const deg = (rad * 180) / Math.PI;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      bow.style.setProperty("--aim", deg + "deg");
      bow.classList.add("is-draw");

      setTimeout(() => {
        bow.classList.remove("is-draw");
        bow.classList.add("is-empty");

        const arrow = document.createElement("div");
        arrow.className = "shot";
        arrow.innerHTML =
          '<svg viewBox="0 0 64 16" aria-hidden="true">' +
          '<path d="M2 3 L10 8 L2 13 L6 8 Z" fill="#ff6f91"/>' +
          '<rect x="8" y="6.8" width="44" height="2.4" rx="1.2" fill="#ffc857"/>' +
          '<path d="M50 3 L63 8 L50 13 Z" fill="#fff4f0"/>' +
          "</svg>";
        stage.appendChild(arrow);

        const sx = cx + cos * 8 - 32;
        const sy = cy + sin * 8 - 8;
        const ex = tx - cos * 28 - 32;
        const ey = ty - sin * 28 - 8;

        const flight = arrow.animate(
          [
            { transform: `translate(${sx}px, ${sy}px) rotate(${deg}deg)` },
            { transform: `translate(${ex}px, ${ey}px) rotate(${deg}deg)` },
          ],
          { duration: 220, easing: "cubic-bezier(0.3, 0, 0.6, 1)", fill: "forwards" }
        );

        flight.onfinish = () => {
          arrow.remove();
          const flash = document.createElement("div");
          flash.className = "dart-hit";
          flash.style.left = tx - 22 + "px";
          flash.style.top = ty - 22 + "px";
          stage.appendChild(flash);
          setTimeout(() => flash.remove(), 400);
          finishPop(target);
          setTimeout(() => bow.classList.remove("is-empty"), 140);
        };
      }, 120);
    }

    balloons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        shootArrowAt(btn);
      });
    });
  }

  function setupDoors() {
    giftIndex = Math.floor(Math.random() * 3);
    const feedback = $("box-feedback");
    if (feedback) {
      feedback.textContent =
        "choose wisely, birthday girl. I've got a sweet surprise waiting for you. ❤️";
    }
    document.querySelectorAll(".box").forEach((box) => {
      box.classList.remove("is-wrong", "is-win");
      box.disabled = false;
      const emoji = box.querySelector(".box__emoji");
      if (emoji) emoji.textContent = "🥡";
    });
  }

  function pickBox(box) {
    if (locked || box.disabled) return;
    const idx = Number(box.getAttribute("data-box"));
    const emoji = box.querySelector(".box__emoji");
    const feedback = $("box-feedback");

    if (idx === giftIndex) {
      locked = true;
      box.classList.add("is-win");
      if (emoji) emoji.textContent = "🎂";
      if (feedback) feedback.textContent = "found it. sweet surprise unlocked. 🎂❤️";
      burst(70);
      setTimeout(() => {
        show("quiz");
        setupQuiz();
      }, 750);
      return;
    }

    box.classList.add("is-wrong");
    box.disabled = true;
    if (emoji) emoji.textContent = "🥲";
    const fails = [
      "empty. this one was just testing you.",
      "wrong dabba. try again.",
      "no cake here. try again, birthday girl.",
    ];
    if (feedback) feedback.textContent = fails[Math.floor(Math.random() * fails.length)];
  }

  function setupQuiz() {
    quizIndex = 0;
    const feedback = $("quiz-feedback");
    if (feedback) feedback.textContent = "";
    renderQuiz();
  }

  function renderQuiz() {
    const item = quiz[quizIndex];
    const chip = $("quiz-chip");
    const title = $("quiz-title");
    const intro = $("quiz-intro");
    const q = $("quiz-q");
    const wrap = $("quiz-choices");
    const feedback = $("quiz-feedback");
    if (!item || !wrap) return;

    if (chip) chip.textContent = item.chip;
    if (title) title.textContent = item.title;
    if (intro) intro.textContent = item.intro || "";
    if (q) q.textContent = item.q;
    if (feedback) feedback.textContent = item.footer || "";
    wrap.innerHTML = "";

    item.options.forEach((label, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.textContent = label;
      btn.addEventListener("click", () => {
        if (locked) return;
        locked = true;
        btn.classList.add("is-on");
        if (feedback) feedback.textContent = item.replies[i];
        setTimeout(() => {
          quizIndex += 1;
          if (quizIndex >= quiz.length) {
            show("photos");
            setupDrops();
          } else {
            locked = false;
            renderQuiz();
          }
        }, 850);
      });
      wrap.appendChild(btn);
    });
  }

  function setupDrops() {
    dropIndex = 0;
    openingDrop = false;
    const reward = $("reward");
    if (reward) reward.hidden = true;
    renderDropBox();
  }

  function renderDropBox() {
    const box = $("mystery-box");
    if (!box) return;
    box.classList.remove("is-open");
    box.disabled = false;
    openingDrop = false;

    const prompt = DROP_PROMPTS[dropIndex] || DROP_PROMPTS[0];
    if ($("drop-chip")) $("drop-chip").textContent = prompt.chip;
    if ($("drop-title")) $("drop-title").textContent = prompt.title;
    if ($("drop-say")) $("drop-say").textContent = prompt.say;
    if ($("drop-meter")) $("drop-meter").textContent = prompt.meter;
    if ($("drop-hint")) $("drop-hint").textContent = prompt.hint;
    if ($("mystery-tag")) $("mystery-tag").textContent = "DROP 0" + (dropIndex + 1);

    const nextBtn = $("btn-next-drop");
    if (nextBtn) {
      nextBtn.textContent =
        dropIndex >= DROPS.length - 1 ? "final birthday cut →" : "next drop →";
    }
  }

  function openDrop() {
    if (openingDrop || dropIndex >= DROPS.length) return;
    const box = $("mystery-box");
    if (!box || box.disabled) return;
    openingDrop = true;
    box.classList.add("is-open");
    box.disabled = true;

    const rect = box.getBoundingClientRect();
    const app = $("app").getBoundingClientRect();
    burst(110, rect.left - app.left + rect.width / 2, rect.top - app.top + 40);

    const drop = DROPS[dropIndex];
    setTimeout(() => {
      if ($("reward-img")) $("reward-img").src = drop.img;
      if ($("reward-title")) $("reward-title").textContent = drop.title;
      if ($("reward-line")) $("reward-line").textContent = drop.line;
      if ($("reward-badge")) $("reward-badge").textContent = drop.badge;
      if ($("reward-chip")) $("reward-chip").textContent = drop.chip;
      if ($("reward")) $("reward").hidden = false;
    }, 420);
  }

  function nextDrop() {
    if ($("reward")) $("reward").hidden = true;
    dropIndex += 1;
    if (dropIndex >= DROPS.length) {
      runLoading();
      return;
    }
    renderDropBox();
  }

  function runLoading() {
    show("loading");
    const fill = $("load-fill");
    const line = $("load-line");
    if (fill) fill.style.width = "0%";
    let i = 0;
    if (line) line.textContent = LOAD_LINES[0];
    const tick = setInterval(() => {
      i += 1;
      if (fill) fill.style.width = Math.min(100, i * 18) + "%";
      if (line) line.textContent = LOAD_LINES[Math.min(LOAD_LINES.length - 1, i - 1)];
      if (i >= 7) {
        clearInterval(tick);
        setTimeout(() => {
          show("reveal");
          burst(140);
          const clip = $("clip");
          if (clip) {
            clip.currentTime = 0;
            clip.play().catch(() => {});
          }
        }, 250);
      }
    }, 280);
  }

  function startGame() {
    show("balloons");
    startBalloons();
  }

  // Event delegation — survives weird focus/overlay issues
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    if (t.closest("#btn-start")) {
      startGame();
      return;
    }
    if (t.closest("#btn-last")) {
      const clip = $("clip");
      if (clip) clip.pause();
      show("close");
      return;
    }
    if (t.closest("#btn-replay")) {
      locked = false;
      openingDrop = false;
      dropIndex = 0;
      show("open");
      return;
    }
    if (t.closest("#mystery-box")) {
      openDrop();
      return;
    }
    if (t.closest("#btn-next-drop")) {
      nextDrop();
      return;
    }
    const box = t.closest(".box");
    if (box && screens.doors && screens.doors.classList.contains("is-on")) {
      pickBox(box);
    }
  });

  // Expose for inline fallback
  window.__birthdayStart = startGame;

  show("open");
})();
