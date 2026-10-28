(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get users() { try { return JSON.parse(localStorage.getItem("c60_users")) || []; } catch { return []; } },
    set users(v) { localStorage.setItem("c60_users", JSON.stringify(v)); },
    get session() { return localStorage.getItem("c60_session"); },
    set session(v) { v ? localStorage.setItem("c60_session", v) : localStorage.removeItem("c60_session"); }
  };
  const digits = s => (s || "").replace(/\D/g, "");
  const me = () => store.users.find(u => u.tel === store.session);
  let lastTrigger = null, isPro = false;

  /* ---------- avisos ---------- */
  const toast = msg => {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove("show"), 3200);
  };

  /* ---------- dialogs (focus trap e Esc nativos) ---------- */
  const open = name => {
    $$("dialog[open]").forEach(d => d.close());
    const d = $("#dlg-" + name);
    if (name === "profile") fillProfile();
    d.showModal();
    $$(".err", d).forEach(e => (e.textContent = ""));
    (d.querySelector("input,textarea") || d).focus();
  };
  const close = d => {
    if (!d.open) return;
    d.classList.add("closing");
    setTimeout(() => { d.classList.remove("closing"); d.close(); }, 200);
  };
  document.addEventListener("click", e => {
    const o = e.target.closest("[data-open]");
    if (o) { lastTrigger = o; open(o.dataset.open); return; }
    if (e.target.closest("[data-close]")) close(e.target.closest("dialog"));
    else if (e.target.tagName === "DIALOG") close(e.target);
    const g = e.target.closest("[data-go]");
    if (g) { e.preventDefault(); goHome(); }
  });
  $$("dialog").forEach(d => {
    d.addEventListener("cancel", e => { e.preventDefault(); close(d); });
    d.addEventListener("close", () => lastTrigger && lastTrigger.isConnected && !lastTrigger.hidden && lastTrigger.focus());
  });

  /* ---------- transição entre páginas ---------- */
  const show = id => {
    const next = $("#view-" + id), cur = $(".view.is-active");
    if (cur === next) return;
    const swap = () => {
      cur && cur.classList.remove("is-active", "leaving");
      next.classList.add("is-active");
      window.scrollTo({ top: 0 });
      const h = $("h1", next); h && (h.tabIndex = -1, h.focus({ preventScroll: true }));
    };
    if (cur && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cur.classList.add("leaving"); setTimeout(swap, 240);
    } else swap();
  };
  const goHome = () => {
    const u = me();
    if (location.hash.startsWith("#exercicios/")) history.replaceState(null, "", location.pathname + location.search);
    show(u ? (u.pro ? "pro" : "elder") : "home");
  };

  /* ---------- sessão / interface ---------- */
  const sync = () => {
    const u = me(); setTimeout(() => window.paintProgress && window.paintProgress(), 0);
    $("#btn-enter-top").hidden = !!u;
    paintAvatar();
    $("#foot-work").hidden = !!u; // "Conheça nosso trabalho" só existe na página inicial
    $("#btn-profile").hidden = $("#btn-logout").hidden = !u;
    $$(".user-name").forEach(n => (n.textContent = u ? u.nome.split(" ")[0] : ""));
    goHome();
  };

  /* ---------- validação ---------- */
  const fail = (form, msg, field) => {
    $(".err", form).textContent = msg;
    $$("input", form).forEach(i => i.removeAttribute("aria-invalid"));
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
    return false;
  };
  const check = (form, req) => {
    for (const n of req) {
      const f = form.elements[n];
      if (!f.value.trim()) return fail(form, "Preencha o campo: " + f.parentElement.firstChild.textContent.trim() + ".", f);
    }
    const t = form.elements.tel; if (t && digits(t.value).length < 10) return fail(form, "Informe um telefone com DDD.", t);
    const s = form.elements.senha; if (s && s.value && s.value.length < 6) return fail(form, "A senha precisa ter 6 caracteres ou mais.", s);
    return true;
  };

  /* ---------- cadastro ---------- */
  $("#toggle-pro").addEventListener("click", e => {
    isPro = !isPro;
    e.target.setAttribute("aria-pressed", isPro);
    e.target.textContent = isPro ? "Entre como idoso" : "Entre como profissional de saúde";
    $$("#f-signup .pro-only").forEach(x => (x.hidden = !isPro));
    $("#t-signup").textContent = isPro ? "Cadastro profissional" : "Cadastre-se";
  });
  $("#f-signup").addEventListener("submit", e => {
    e.preventDefault(); const f = e.target;
    if (!check(f, isPro ? ["nome", "email", "tel", "senha", "crefito"] : ["nome", "tel", "senha"])) return;
    const tel = digits(f.tel.value);
    if (store.users.some(u => u.tel === tel)) return fail(f, "Este telefone já tem cadastro. Use Entrar.", f.tel);
    store.users = [...store.users, { nome: f.nome.value.trim(), tel, senha: f.senha.value, pro: isPro, email: f.email.value, crefito: f.crefito.value, titulo: "", resumo: "" }];
    store.session = tel; f.reset(); close($("#dlg-signup")); sync(); toast("Cadastro feito. Bem-vindo!");
  });

  /* ---------- login / senha ---------- */
  $("#f-login").addEventListener("submit", e => {
    e.preventDefault(); const f = e.target;
    if (!check(f, ["tel", "senha"])) return;
    const u = store.users.find(x => x.tel === digits(f.tel.value) && x.senha === f.senha.value);
    if (!u) return fail(f, "Telefone ou senha incorretos.", f.senha);
    store.session = u.tel; f.reset(); close($("#dlg-login")); sync(); toast("Você entrou.");
  });
  $("#f-reset").addEventListener("submit", e => {
    e.preventDefault(); const f = e.target;
    if (!check(f, ["tel", "senha"])) return;
    const list = store.users, u = list.find(x => x.tel === digits(f.tel.value));
    if (!u) return fail(f, "Não encontramos esse telefone.", f.tel);
    u.senha = f.senha.value; store.users = list; f.reset(); close($("#dlg-reset")); toast("Senha alterada. Agora é só entrar.");
    setTimeout(() => open("login"), 300);
  });
  $("#btn-logout").addEventListener("click", () => { store.session = null; sync(); toast("Você saiu."); });

  /* ---------- perfil (pop-up) ---------- */
  function fillProfile() {
    const u = me(), f = $("#f-profile"); if (!u) return;
    $("#t-profile").textContent = u.pro ? "Perfil do Profissional" : "Perfil do Idoso";
    $$(".pro-only", f).forEach(x => (x.hidden = !u.pro));
    $$(".elder-only", f).forEach(x => (x.hidden = u.pro));
    ["nome", "titulo", "resumo"].forEach(k => (f[k].value = u[k] || ""));
    f.tel.value = u.tel; f.senha.value = "";
    paintAvatar();
  }
  $("#f-profile").addEventListener("submit", e => {
    e.preventDefault(); const f = e.target;
    if (!check(f, ["nome", "tel"])) return;
    const list = store.users, u = list.find(x => x.tel === store.session), tel = digits(f.tel.value);
    if (tel !== u.tel && list.some(x => x.tel === tel)) return fail(f, "Este telefone já está em uso.", f.tel);
    Object.assign(u, { nome: f.nome.value.trim(), tel, titulo: f.titulo.value, resumo: f.resumo.value });
    if (f.senha.value) u.senha = f.senha.value;
    store.users = list; store.session = tel; close($("#dlg-profile")); sync(); toast("Perfil atualizado.");
  });

  /* ---------- conteúdo das áreas ---------- */
  const mk = (sel, items, fn) => ($(sel).innerHTML = items.map((x, i) => `<li class="${fn.c}" style="animation-delay:${i * 70}ms">${fn(x, i)}</li>`).join(""));
  const lesson = (t, i) => `<button type="button" data-i="${i}" aria-label="Reproduzir aula: ${t}"></button><span>${t}</span>`; lesson.c = "lesson";
  const CATS = [
    { n: "Yoga suave", slug: "yoga-suave", img: "imagens/ex-yoga.png", d: "Movimentos lentos e respiração tranquila para ganhar calma, equilíbrio e flexibilidade.", ex: [
      ["Respiração sentada", "3 min", "Muito leve", ["Sente-se com a coluna ereta, apoiada na cadeira.", "Inspire pelo nariz contando até 4.", "Solte o ar pela boca contando até 6. Repita 8 vezes."]],
      ["Postura da montanha", "3 min", "Leve", ["Fique em pé, perto de um apoio, com os pés na largura do quadril.", "Alongue o topo da cabeça para cima e deixe os ombros soltos.", "Respire fundo 5 vezes mantendo a postura."]],
      ["Gato e vaca na cadeira", "4 min", "Leve", ["Sentado, apoie as mãos nos joelhos.", "Inspire abrindo o peito e olhando para a frente.", "Expire arredondando as costas. Faça 8 repetições lentas."]] ] },
    { n: "Postura", slug: "postura", img: "imagens/ex-afundo.png", d: "Exercícios simples para aliviar a tensão do pescoço e dos ombros e melhorar a postura no dia a dia.", ex: [
      ["Alongamento do pescoço", "3 min", "Muito leve", ["Sentado, incline a orelha em direção ao ombro, sem forçar.", "Segure por 15 segundos respirando devagar.", "Troque de lado. Faça 3 vezes para cada lado."]],
      ["Abrir o peito", "3 min", "Leve", ["Fique em pé ou sentado e apoie as mãos na lombar.", "Leve os cotovelos suavemente para trás.", "Segure 10 segundos e repita 5 vezes."]],
      ["Encostar na parede", "2 min", "Leve", ["Encoste costas, cabeça e calcanhares na parede.", "Mantenha o queixo levemente recolhido.", "Fique assim por 30 segundos, respirando normalmente."]] ] },
    { n: "Em dupla", slug: "em-dupla", img: "imagens/ex-dupla.png", d: "Atividades para fazer com um familiar ou amigo. Mais diversão, mais motivação e mais segurança.", ex: [
      ["Passe a bola", "5 min", "Leve", ["Sentem-se de frente, um para o outro, a cerca de um metro.", "Passem uma bola leve de um para o outro.", "Façam 20 passes, alternando as mãos."]],
      ["Espelho de movimentos", "4 min", "Muito leve", ["Uma pessoa faz um movimento lento com os braços.", "A outra imita como se fosse um espelho.", "Troquem de papel a cada minuto."]],
      ["Caminhada de braços dados", "5 min", "Leve", ["Fiquem lado a lado, de braços dados, em local plano.", "Caminhem em passos curtos e firmes.", "Façam pausas para respirar sempre que quiserem."]] ] },
    { n: "Mobilidade", slug: "mobilidade", img: "imagens/ex-agachamento.png", d: "Movimentos para articulações mais livres: ombros, tornozelos e pernas prontos para o dia.", ex: [
      ["Círculos de ombros", "2 min", "Muito leve", ["Sentado, deixe os braços soltos ao lado do corpo.", "Faça 8 círculos grandes com os ombros para trás.", "Depois faça 8 círculos para a frente."]],
      ["Rotação de tornozelos", "3 min", "Muito leve", ["Sentado, estenda uma perna à frente, com apoio.", "Gire o pé desenhando círculos, 8 vezes para cada lado.", "Troque de perna."]],
      ["Marcha sentada", "4 min", "Leve", ["Sente-se com a coluna ereta e os pés no chão.", "Levante um joelho de cada vez, como se caminhasse.", "Faça 20 passos em ritmo confortável."]] ] },
    { n: "Relaxamento", slug: "relaxamento", img: "imagens/ex-alongamento-dupla.png", d: "Pausas para soltar o corpo, acalmar a mente e terminar o dia com mais tranquilidade.", ex: [
      ["Soltar os ombros", "3 min", "Muito leve", ["Sentado, suba os ombros em direção às orelhas ao inspirar.", "Solte de uma vez ao expirar, com um suspiro.", "Repita 8 vezes."]],
      ["Relaxamento do corpo", "6 min", "Muito leve", ["Deite-se ou sente-se confortavelmente e feche os olhos.", "Do pé até a cabeça, aperte cada parte do corpo por 3 segundos e solte.", "Termine com 5 respirações profundas."]],
      ["Respiração com mãos no abdômen", "4 min", "Muito leve", ["Apoie uma mão na barriga e outra no peito.", "Inspire de modo que a barriga suba mais que o peito.", "Solte o ar devagar. Repita por 3 minutos."]] ] }
  ];
  const tile = (t, i) => `<button type="button" data-cat="${i}"><img src="${CATS[i].img}" alt="" loading="lazy">${t}</button>`; tile.c = "tile";
  const LESSONS = ["Alongamento diário", "Equilíbrio em pé", "Fortalecimento", "Respiração"];
  mk("#lessons", LESSONS, lesson);
  mk("#boards", ["Aula 1", "Aula 2", "Aula 3", "Aula 4"], lesson);
  mk("#tiles", CATS.map(c => c.n), tile);
  $("#file-up").addEventListener("change", e => {
    const ul = $("#published");
    [...e.target.files].forEach(f => ul.insertAdjacentHTML("beforeend", `<li>✔ ${f.name.replace(/</g, "&lt;")}</li>`));
    toast("Atividades adicionadas."); e.target.value = "";
  });

  /* ---------- aulas e avaliação ---------- */
  const key = k => `c60_${k}_${store.session}`;
  const watched = () => { try { return JSON.parse(localStorage.getItem(key("watched"))) || []; } catch { return []; } };
  const proName = () => (store.users.find(u => u.pro) || {}).nome || "Fisioterapeuta Conect60+";
  let current = 0;

  window.paintProgress = paintProgress;
  function paintProgress() {
    if (!me() || me().pro) return;
    const w = watched();
    $$("#lessons .lesson").forEach((li, i) => li.classList.toggle("done", w.includes(i)));
    $("#progress").textContent = `${w.length} de ${LESSONS.length} aulas concluídas`;
    $("#btn-rate").hidden = !(w.length === LESSONS.length && localStorage.getItem(key("eval")) !== "done");
  }
  $("#lessons").addEventListener("click", e => {
    const b = e.target.closest("button[data-i]"); if (!b) return;
    lastTrigger = b; current = +b.dataset.i;
    const v = $("#player"); $("#t-player").textContent = LESSONS[current];
    v.src = `videos/aula${current + 1}.mp4`; // coloque seus vídeos na pasta videos/
    $("#player-hint").textContent = "";
    $("#dlg-player").showModal(); v.focus();
  });
  $("#player").addEventListener("error", () => ($("#player-hint").textContent = `Vídeo não encontrado (videos/aula${current + 1}.mp4). Você ainda pode usar "Concluir aula".`));
  $("#player").addEventListener("ended", () => finishLesson());
  $("#dlg-player").addEventListener("close", () => { $("#player").pause(); $("#player").removeAttribute("src"); });
  $("#btn-finish").addEventListener("click", finishLesson);

  function finishLesson() {
    const w = watched(); if (!w.includes(current)) w.push(current);
    localStorage.setItem(key("watched"), JSON.stringify(w));
    close($("#dlg-player")); paintProgress();
    toast(`Aula concluída: ${LESSONS[current]}`);
    if (w.length === LESSONS.length && localStorage.getItem(key("eval")) !== "done") setTimeout(() => open("rate"), 450);
  }

  const rateForm = $("#f-rate"), saveBtn = $("#btn-save");
  const rateText = () => "Como foi a sua experiência com este fisioterapeuta? As opções são: Não gostei, Neutro, Gostei e Ótimo.";
  $("#dlg-rate").addEventListener("close", () => { speechSynthesis && speechSynthesis.cancel(); });
  rateForm.addEventListener("change", () => (saveBtn.disabled = !rateForm.nota.value));
  $("#btn-listen").addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return toast("Seu navegador não tem leitura em voz alta.");
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(rateText()); u.lang = "pt-BR"; u.rate = .9; speechSynthesis.speak(u);
  });
  rateForm.addEventListener("submit", e => {
    e.preventDefault(); if (!rateForm.nota.value) return;
    let all = []; try { all = JSON.parse(localStorage.getItem("c60_ratings")) || []; } catch {}
    all.push({ aluno: store.session, profissional: proName(), nota: +rateForm.nota.value, em: new Date().toISOString() });
    localStorage.setItem("c60_ratings", JSON.stringify(all));
    localStorage.setItem(key("eval"), "done");
    rateForm.reset(); saveBtn.disabled = true; close($("#dlg-rate")); paintProgress(); toast("Obrigado pela sua avaliação!");
  });
  // preenche nome e reinicia o formulário sempre que a avaliação abrir
  new MutationObserver(() => { if ($("#dlg-rate").open) { $("#rate-pro").textContent = proName(); rateForm.reset(); saveBtn.disabled = true; } })
    .observe($("#dlg-rate"), { attributes: true, attributeFilter: ["open"] });
  document.addEventListener("click", e => { if (e.target.closest("[data-go],#btn-logout,#f-login button[type=submit]")) setTimeout(paintProgress, 700); });

  /* ---------- trabalho + rodapé + contato ---------- */
  document.documentElement.classList.add("js");
  const wg = $(".work-grid");
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((en, o) => en.forEach(x => { if (x.isIntersecting) { wg.classList.add("in"); o.disconnect(); } }), { threshold: .25 }).observe(wg);
  } else wg.classList.add("in");
  // toque no celular: alterna o texto sobre a foto
  $$(".work figure").forEach(f => f.addEventListener("click", () => {
    const on = !f.classList.contains("show");
    $$(".work figure.show").forEach(x => x.classList.remove("show")); f.classList.toggle("show", on);
  }));
  $$(".work figure").forEach(f => f.addEventListener("keydown", e => { if (e.key === "Escape") f.blur(); }));
  $("#lnk-work").addEventListener("click", e => {
    e.preventDefault(); const s = $("#trabalho");
    s.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    s.focus({ preventScroll: true });
  });
  $("#f-contact").addEventListener("submit", e => {
    e.preventDefault(); const f = e.target;
    if (!check(f, ["nome", "email", "msg"])) return;
    if (!/^\S+@\S+\.\S+$/.test(f.email.value)) return fail(f, "Informe um e-mail válido.", f.email);
    let all = []; try { all = JSON.parse(localStorage.getItem("c60_contacts")) || []; } catch {}
    all.push({ nome: f.nome.value.trim(), email: f.email.value.trim(), msg: f.msg.value.trim(), em: new Date().toISOString() });
    localStorage.setItem("c60_contacts", JSON.stringify(all));
    const url = `mailto:contato@conect60.test?subject=${encodeURIComponent("Contato pelo site Conect60+")}&body=${encodeURIComponent(f.msg.value + "\n\n" + f.nome.value + " (" + f.email.value + ")")}`;
    f.reset(); close($("#dlg-contact")); toast("Mensagem registrada. Abrindo seu aplicativo de e-mail…");
    setTimeout(() => (location.href = url), 900);
  });

  /* ---------- páginas das categorias de exercícios ---------- */
  const esc = s => String(s).replace(/</g, "&lt;");
  function renderCat(i) {
    const c = CATS[i], prev = CATS[(i + CATS.length - 1) % CATS.length], next = CATS[(i + 1) % CATS.length];
    $("#cat-img").src = c.img; $("#h-cat").textContent = c.n; $("#cat-crumb").textContent = c.n; $("#cat-desc").textContent = c.d;
    document.title = `${c.n} | Exercícios | Conect60+`;
    $("#ex-list").innerHTML = c.ex.map(([nome, tempo, nivel, passos], k) => `
      <li class="ex" style="animation-delay:${k * 90}ms">
        <h2>${esc(nome)}</h2>
        <p class="meta"><span>⏱ ${esc(tempo)}</span><span>Nível: ${esc(nivel)}</span></p>
        <details><summary>Ver passo a passo</summary><ol>${passos.map(p => `<li>${esc(p)}</li>`).join("")}</ol></details>
      </li>`).join("");
    $("#cat-prev").textContent = "← " + prev.n; $("#cat-prev").dataset.cat = (i + CATS.length - 1) % CATS.length;
    $("#cat-next").textContent = next.n + " →"; $("#cat-next").dataset.cat = (i + 1) % CATS.length;
  }
  const openCat = i => { location.hash = "#exercicios/" + CATS[i].slug; };
  const leaveCat = () => { document.title = "Conect60+ | Exercícios para a terceira idade"; goHome(); };
  function route() {
    const m = location.hash.match(/^#exercicios\/([\w-]+)$/), u = me();
    const i = m ? CATS.findIndex(c => c.slug === m[1]) : -1;
    if (i >= 0 && u && !u.pro) {
      const same = $("#view-cat").classList.contains("is-active");
      renderCat(i); show("cat");
      if (same) { window.scrollTo({ top: 0, behavior: "smooth" }); $("#h-cat").tabIndex = -1; $("#h-cat").focus({ preventScroll: true }); }
    }
    else if ($("#view-cat").classList.contains("is-active")) leaveCat();
  }
  window.addEventListener("hashchange", route);
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-cat]"); if (b) { lastTrigger = b; openCat(+b.dataset.cat); }
  });
  const backToList = e => { e && e.preventDefault(); leaveCat(); setTimeout(() => $("#tiles button")?.scrollIntoView({ block: "center" }), 350); };
  $("#cat-back").addEventListener("click", backToList);
  $("#crumb-back").addEventListener("click", backToList);

  paintProgress();

  /* ---------- foto de perfil ---------- */
  function paintAvatar() {
    const u = me(), has = !!(u && u.foto);
    [["#avatar-img", "#avatar-svg"], ["#top-avatar", "#top-avatar-svg"]].forEach(([i, s]) => {
      const img = $(i); if (has) img.src = u.foto; img.hidden = !has; $(s).toggleAttribute("hidden", has); // svg não tem a propriedade .hidden
    });
    $("#photo-remove").hidden = !has;
    $("#btn-profile").setAttribute("aria-label", has ? "Abrir meu perfil (com foto)" : "Abrir meu perfil");
  }
  const cropSquare = file => new Promise((ok, no) => {
    const r = new FileReader();
    r.onerror = no;
    r.onload = () => {
      const im = new Image(); im.onerror = no;
      im.onload = () => {
        const S = 256, s = Math.min(im.width, im.height), c = document.createElement("canvas");
        c.width = c.height = S;
        c.getContext("2d").drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, S, S);
        ok(c.toDataURL("image/jpeg", .85));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
  const savePhoto = foto => {
    const list = store.users, u = list.find(x => x.tel === store.session);
    if (!u) return;
    u.foto = foto;
    try { store.users = list; } catch { return toast("Não foi possível salvar a foto neste navegador."); }
    paintAvatar(); toast(foto ? "Foto de perfil atualizada." : "Foto removida.");
  };
  $("#photo-input").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) return toast("Escolha uma imagem PNG, JPG ou WEBP.");
    if (f.size > 8 * 1024 * 1024) return toast("A imagem é muito grande. Use uma de até 8 MB.");
    try { savePhoto(await cropSquare(f)); } catch { toast("Não foi possível ler essa imagem."); }
  });
  $("#photo-remove").addEventListener("click", () => savePhoto(""));

  const h0 = location.hash;
  sync();
  if (h0.startsWith("#exercicios/")) location.hash = h0;
})();
