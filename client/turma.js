const API = "https://gamingrank-api.onrender.com/api";
//const API = "http://localhost:3000/api";

const LOGIN_PAGE = "./professor-login.html";
const btnImportTxt = document.getElementById("btnImportTxt");
const fileImport = document.getElementById("fileImport");
const btnDelAluno = document.getElementById("btnDelAluno");
const btnUsarPontos = document.getElementById("btnUsarPontos");

function getSecret() {
  return sessionStorage.getItem("adminSecret") || "";
}
function redirectLogin() {
  window.location.href = LOGIN_PAGE;
}
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

const msg = document.getElementById("msg");
const tituloTurma = document.getElementById("tituloTurma");

const nomeTurmaCard = document.getElementById("nomeTurmaCard");
const nomeAlunoCard = document.getElementById("nomeAlunoCard");

const selectAluno = document.getElementById("selectAluno");
const tbodyNotas = document.getElementById("tbodyNotas");

// botões
const btnAddAluno = document.getElementById("btnAddAluno");
const btnAddAtv = document.getElementById("btnAddAtv");
const btnDelAtv = document.getElementById("btnDelAtv");
const btnRelatorio = document.getElementById("btnRelatorio");
const modalAluno = document.getElementById("modalAluno");
const fecharModalAluno = document.getElementById("fecharModalAluno");
const cancelarModalAluno = document.getElementById("cancelarModalAluno");
const formModalAluno = document.getElementById("formModalAluno");
const modalMatricula = document.getElementById("modalMatricula");
const modalNome = document.getElementById("modalNome");
const modalAtividade = document.getElementById("modalAtividade");
const fecharModalAtividade = document.getElementById("fecharModalAtividade");
const cancelarModalAtividade = document.getElementById("cancelarModalAtividade");
const formModalAtividade = document.getElementById("formModalAtividade");
const modalNomeAtividade = document.getElementById("modalNomeAtividade");
const modalMaxAtividade = document.getElementById("modalMaxAtividade");

const modalPontos = document.getElementById("modalPontos");
const fecharModalPontos = document.getElementById("fecharModalPontos");
const cancelarModalPontos = document.getElementById("cancelarModalPontos");
const formModalPontos = document.getElementById("formModalPontos");
const modalPontosAlunoInfo = document.getElementById("modalPontosAlunoInfo");
const modalQtdPontos = document.getElementById("modalQtdPontos");

const modalExcluirAluno = document.getElementById("modalExcluirAluno");
const fecharModalExcluirAluno = document.getElementById("fecharModalExcluirAluno");
const cancelarModalExcluirAluno = document.getElementById("cancelarModalExcluirAluno");
const confirmarExcluirAluno = document.getElementById("confirmarExcluirAluno");
const textoExcluirAluno = document.getElementById("textoExcluirAluno");

const modalExcluirAtividade = document.getElementById("modalExcluirAtividade");
const fecharModalExcluirAtividade = document.getElementById("fecharModalExcluirAtividade");
const cancelarModalExcluirAtividade = document.getElementById("cancelarModalExcluirAtividade");
const formModalExcluirAtividade = document.getElementById("formModalExcluirAtividade");
const modalSelectAtividadeExcluir = document.getElementById("modalSelectAtividadeExcluir");
const textoExcluirAtividade = document.getElementById("textoExcluirAtividade");

function setMsg(text, isError = false) {
  msg.textContent = text || "";
  msg.style.color = isError ? "#b91c1c" : "#475569";
}

async function apiAdmin(path, options = {}) {
  const secret = getSecret();
  if (!secret) redirectLogin();

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": secret,
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

const turmaId = Number(qs("id"));
let grade = null;
let alunoIdParaExcluir = null;

function abrirModalAluno() {
  modalAluno.classList.remove("hidden");
  modalMatricula.value = "";
  modalNome.value = "";
  modalMatricula.focus();
}

function fecharModalAlunoFn() {
  modalAluno.classList.add("hidden");
}

function abrirModalAtividade() {
  modalAtividade.classList.remove("hidden");
  modalNomeAtividade.value = "";
  modalMaxAtividade.value = "10";
  modalNomeAtividade.focus();
}

function fecharModalAtividadeFn() {
  modalAtividade.classList.add("hidden");
}

function abrirModalPontos(aluno) {
  modalPontos.classList.remove("hidden");
  modalQtdPontos.value = "";
  modalPontosAlunoInfo.textContent = `Aluno: ${aluno.nome} (${aluno.matricula})`;
  modalQtdPontos.focus();
}

function fecharModalPontosFn() {
  modalPontos.classList.add("hidden");
}

function abrirModalExcluirAluno(aluno) {
  alunoIdParaExcluir = aluno.id;
  textoExcluirAluno.textContent = `Tem certeza que deseja excluir o aluno "${aluno.nome} (${aluno.matricula})" desta turma?`;
  modalExcluirAluno.classList.remove("hidden");
}

function fecharModalExcluirAlunoFn() {
  modalExcluirAluno.classList.add("hidden");
  alunoIdParaExcluir = null;
}

function preencherSelectExcluirAtividade(preselectedId = null) {
  modalSelectAtividadeExcluir.innerHTML = "";

  grade.atividades.forEach((atv) => {
    const opt = document.createElement("option");
    opt.value = atv.id;
    opt.textContent = `${atv.nome} (máx: ${atv.max})`;
    modalSelectAtividadeExcluir.appendChild(opt);
  });

  if (preselectedId && grade.atividades.some((a) => a.id === preselectedId)) {
    modalSelectAtividadeExcluir.value = String(preselectedId);
  }
}

function atualizarTextoExcluirAtividade() {
  const atividadeId = Number(modalSelectAtividadeExcluir.value);
  const atividade = grade.atividades.find((a) => a.id === atividadeId);

  if (!atividade) {
    textoExcluirAtividade.textContent = "As notas dessa atividade também serão removidas.";
    return;
  }

  textoExcluirAtividade.textContent = `A atividade "${atividade.nome}" será excluída e as notas dela também serão removidas.`;
}

function abrirModalExcluirAtividade(preselectedId = null) {
  preencherSelectExcluirAtividade(preselectedId);
  atualizarTextoExcluirAtividade();
  modalExcluirAtividade.classList.remove("hidden");
  modalSelectAtividadeExcluir.focus();
}

function fecharModalExcluirAtividadeFn() {
  modalExcluirAtividade.classList.add("hidden");
  modalSelectAtividadeExcluir.innerHTML = "";
}

function fillSelectAlunos() {
  selectAluno.innerHTML = "";
  grade.alunos.forEach((al) => {
    const opt = document.createElement("option");
    opt.value = al.id;
    opt.textContent = `${al.nome} (${al.matricula})`;
    selectAluno.appendChild(opt);
  });
}

function renderAluno(alunoId) {
  const aluno = grade.alunos.find((a) => a.id === alunoId);
  if (!aluno) return;

  nomeAlunoCard.textContent = `Aluno: ${aluno.nome} (${aluno.matricula})`;

  let total = 0;
  let maxTotal = 0;

  tbodyNotas.innerHTML = "";

  // linhas das atividades
  grade.atividades.forEach((atv) => {
    const key = `${aluno.id}:${atv.id}`;
    const nota = grade.notas[key];

    if (nota != null) total += Number(nota);
    maxTotal += Number(atv.max);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="atv-cell">
            <span>${atv.nome}</span>
            <span class="atv-actions">
            <button class="icon-btn" data-action="editAtv" data-atv-id="${atv.id}" data-atv-nome="${atv.nome}" title="Editar">✏️</button>
            <button class="icon-btn danger" data-action="delAtv" data-atv-id="${atv.id}" data-atv-nome="${atv.nome}" title="Excluir">✖</button>
            </span>
        </div>
      </td>
      <td class="num nota-cell" data-aluno-id="${aluno.id}" data-atividade-id="${atv.id}">
        ${nota ?? "-"}
      </td>
      <td class="num">${atv.max}</td>
    `;
    tbodyNotas.appendChild(tr);
  });

  // total
  const trTotal = document.createElement("tr");
  trTotal.className = "total-row";
  trTotal.innerHTML = `
    <td>Total</td>
    <td class="num">${total}</td>
    <td class="num">${maxTotal}</td>
  `;
  tbodyNotas.appendChild(trTotal);
  // buscar pontos do aluno nesta turma
apiAdmin(`/admin/turmas/${turmaId}/alunos/${aluno.id}/pontos`)
  .then((p) => {
    const tr = document.createElement("tr");
    tr.className = "total-row";
    tr.innerHTML = `
      <td>Pontos disponíveis</td>
      <td class="num"><strong>${p.disponiveis}</strong> <span class="subtle"></span></td>
      <td class="num">-</td>
    `;
    tbodyNotas.appendChild(tr);
  })
  .catch(() => {
    // se der erro, não quebra a tela
  });
}

async function reloadGrade(keepAluno = true) {
  const currentAluno = keepAluno ? Number(selectAluno.value) : null;

  setMsg("Atualizando...");
  grade = await apiAdmin(`/admin/turmas/${turmaId}/grade`);

  tituloTurma.textContent = grade.turma.nome;
  nomeTurmaCard.textContent = grade.turma.nome;

  if (!grade.alunos.length) {
    selectAluno.innerHTML = "";
    nomeAlunoCard.textContent = "";
    tbodyNotas.innerHTML = `<tr><td colspan="3" class="subtle">Sem alunos.</td></tr>`;
    setMsg("Turma sem alunos. Use 'Adicionar aluno'.");
    return;
  }

  fillSelectAlunos();

  // tenta manter o aluno selecionado
  let alunoId = Number(selectAluno.value);
  if (keepAluno && currentAluno && grade.alunos.some((a) => a.id === currentAluno)) {
    selectAluno.value = String(currentAluno);
    alunoId = currentAluno;
  }

  renderAluno(alunoId);
  setMsg("");
}

selectAluno.addEventListener("change", () => {
  renderAluno(Number(selectAluno.value));
});

tbodyNotas.addEventListener("click", async (e) => {
  const cell = e.target.closest(".nota-cell");
  if (!cell) return;

  // não edita a linha Total
  if (cell.parentElement.classList.contains("total-row")) return;

  const alunoId = Number(cell.dataset.alunoId);
  const atividadeId = Number(cell.dataset.atividadeId);

  // valor atual
  const currentText = cell.textContent.trim();
  const currentValue = currentText === "-" ? "" : currentText;

  // cria input
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.1";
  input.min = "0";
  input.value = currentValue;
  input.style.width = "70px";
  input.style.textAlign = "center";

  
  const old = cell.innerHTML;
  cell.innerHTML = "";
  cell.appendChild(input);
  input.focus();
  input.select();

  async function save() {
    const v = input.value.trim();

    
    const nota = v === "" ? 0 : Number(v);
    if (Number.isNaN(nota)) {
      cell.innerHTML = old;
      setMsg("Nota inválida.", true);
      return;
    }

    
    const atv = grade.atividades.find(a => a.id === atividadeId);
    const max = atv ? Number(atv.max) : null;

    if (max != null && nota > max) {
    cell.innerHTML = old;
    setMsg(`A nota não pode ser maior que o máximo (${max}).`, true);
    return;
    }

    try {
      await apiAdmin(`/admin/notas`, {
        method: "PUT",
        body: JSON.stringify({
          aluno_id: alunoId,
          atividade_id: atividadeId,
          nota: nota,
        }),
      });

      
      await reloadGrade(true);
      setMsg("Nota salva ✅");
    } catch (err) {
      cell.innerHTML = old;
      setMsg(err.message, true);
    }
  }

  function cancel() {
    cell.innerHTML = old;
  }

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") save();
    if (ev.key === "Escape") cancel();
  });

  
  input.addEventListener("blur", () => {
    save();
  });
});

tbodyNotas.addEventListener("click", async (e) => {
  const btn = e.target.closest("button.icon-btn");
  if (!btn) return;

  const action = btn.dataset.action;
  const atvId = Number(btn.dataset.atvId);
  const atvNome = btn.dataset.atvNome;

  try {
    if (action === "editAtv") {
      const novoNome = prompt("Novo nome da atividade:", atvNome);
      if (!novoNome || !novoNome.trim()) return;

      await apiAdmin(`/admin/atividades/${atvId}`, {
        method: "PUT",
        body: JSON.stringify({ nome: novoNome.trim() }),
      });

      await reloadGrade(true);
      setMsg("Atividade editada ");
    }

    if (action === "delAtv") {
      abrirModalExcluirAtividade(atvId);
      return;
    }

  } catch (err) {
    setMsg(err.message, true);
  }
});

btnAddAluno.addEventListener("click", () => {
  abrirModalAluno();
});

fecharModalAluno?.addEventListener("click", fecharModalAlunoFn);
cancelarModalAluno?.addEventListener("click", fecharModalAlunoFn);

modalAluno?.addEventListener("click", (e) => {
  if (e.target === modalAluno) {
    fecharModalAlunoFn();
  }
});

formModalAluno?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const matricula = modalMatricula.value.trim();
  const nome = modalNome.value.trim();

  if (!matricula || !nome) {
    setMsg("Preencha matrícula e nome do aluno.", true);
    return;
  }

fecharModalExcluirAluno?.addEventListener("click", fecharModalExcluirAlunoFn);
cancelarModalExcluirAluno?.addEventListener("click", fecharModalExcluirAlunoFn);

modalExcluirAluno?.addEventListener("click", (e) => {
  if (e.target === modalExcluirAluno) {
    fecharModalExcluirAlunoFn();
  }
});

fecharModalExcluirAtividade?.addEventListener("click", fecharModalExcluirAtividadeFn);
cancelarModalExcluirAtividade?.addEventListener("click", fecharModalExcluirAtividadeFn);

modalExcluirAtividade?.addEventListener("click", (e) => {
  if (e.target === modalExcluirAtividade) {
    fecharModalExcluirAtividadeFn();
  }
});

modalSelectAtividadeExcluir?.addEventListener("change", atualizarTextoExcluirAtividade);

  try {
    await apiAdmin(`/admin/turmas/${turmaId}/alunos`, {
      method: "POST",
      body: JSON.stringify({
        matricula,
        nome,
      }),
    });

    fecharModalAlunoFn();
    await reloadGrade(false);
    setMsg("Aluno adicionado");
  } catch (err) {
    setMsg(err.message, true);
  }
});

// ✅ adicionar atividade
btnAddAtv.addEventListener("click", () => {
  abrirModalAtividade();
});

fecharModalAtividade?.addEventListener("click", fecharModalAtividadeFn);
cancelarModalAtividade?.addEventListener("click", fecharModalAtividadeFn);

modalAtividade?.addEventListener("click", (e) => {
  if (e.target === modalAtividade) {
    fecharModalAtividadeFn();
  }
});

formModalAtividade?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = modalNomeAtividade.value.trim();
  const max = Number(modalMaxAtividade.value);

  if (!nome) {
    setMsg("Digite o nome da atividade.", true);
    return;
  }

  if (Number.isNaN(max) || max <= 0) {
    setMsg("Máximo inválido.", true);
    return;
  }

  try {
    await apiAdmin(`/admin/turmas/${turmaId}/atividades`, {
      method: "POST",
      body: JSON.stringify({
        nome,
        max_pontos: max,
      }),
    });

    fecharModalAtividadeFn();
    await reloadGrade(true);
    setMsg("Atividade criada");
  } catch (err) {
    setMsg(err.message, true);
  }
});

fecharModalExcluirAluno.addEventListener("click", fecharModalExcluirAlunoFn);
cancelarModalExcluirAluno.addEventListener("click", fecharModalExcluirAlunoFn);

modalExcluirAluno.addEventListener("click", (e) => {
  if (e.target === modalExcluirAluno) {
    fecharModalExcluirAlunoFn();
  }
});

fecharModalExcluirAtividade.addEventListener("click", fecharModalExcluirAtividadeFn);
cancelarModalExcluirAtividade.addEventListener("click", fecharModalExcluirAtividadeFn);

modalExcluirAtividade.addEventListener("click", (e) => {
  if (e.target === modalExcluirAtividade) {
    fecharModalExcluirAtividadeFn();
  }
});

modalSelectAtividadeExcluir.addEventListener("change", atualizarTextoExcluirAtividade);

btnUsarPontos.addEventListener("click", () => {
  const alunoId = Number(selectAluno.value);
  const aluno = grade.alunos.find((a) => a.id === alunoId);

  if (!aluno) {
    setMsg("Selecione um aluno.", true);
    return;
  }

  abrirModalPontos(aluno);
});

fecharModalPontos?.addEventListener("click", fecharModalPontosFn);
cancelarModalPontos?.addEventListener("click", fecharModalPontosFn);

modalPontos?.addEventListener("click", (e) => {
  if (e.target === modalPontos) {
    fecharModalPontosFn();
  }
});

formModalPontos?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const alunoId = Number(selectAluno.value);
  const aluno = grade.alunos.find((a) => a.id === alunoId);
  if (!aluno) {
    setMsg("Selecione um aluno.", true);
    return;
  }

  const pontos = Number(modalQtdPontos.value);

  if (Number.isNaN(pontos) || pontos <= 0) {
    setMsg("Valor inválido.", true);
    return;
  }

  try {
    await apiAdmin(`/admin/turmas/${turmaId}/alunos/${alunoId}/descontar`, {
      method: "POST",
      body: JSON.stringify({ pontos }),
    });

    fecharModalPontosFn();
    await reloadGrade(true);
    setMsg("Pontos descontados");
  } catch (err) {
    setMsg(err.message, true);
  }
});

btnDelAtv.addEventListener("click", () => {
  if (!grade?.atividades?.length) {
    setMsg("Não há atividades para excluir.", true);
    return;
  }

  abrirModalExcluirAtividade();
});

formModalExcluirAtividade?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const atividadeId = Number(modalSelectAtividadeExcluir.value);
  if (!atividadeId) {
    setMsg("Selecione uma atividade.", true);
    return;
  }

  try {
    await apiAdmin(`/admin/atividades/${atividadeId}`, {
      method: "DELETE",
    });

    fecharModalExcluirAtividadeFn();
    await reloadGrade(true);
    setMsg("Atividade excluída");
  } catch (err) {
    setMsg(err.message, true);
  }
});

// ✅ relatório (depois fazemos)
btnRelatorio.addEventListener("click", () => {
  alert("Relatório: vamos implementar no próximo passo 🙂");
});

btnImportTxt.addEventListener("click", () => {
  fileImport.click();
});

fileImport.addEventListener("change", async () => {
  const file = fileImport.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();

    setMsg("Importando...");
    await apiAdmin(`/admin/turmas/${turmaId}/import`, {
      method: "POST",
      body: JSON.stringify({ content: text })
    });

    await reloadGrade(true);
    setMsg("Importação concluída");
  } catch (err) {
    setMsg(err.message, true);
  } finally {
    fileImport.value = "";
  }
});

btnDelAluno.addEventListener("click", () => {
  if (!grade?.alunos?.length) {
    setMsg("Não há alunos para excluir.", true);
    return;
  }

  const alunoId = Number(selectAluno.value);
  const aluno = grade.alunos.find((a) => a.id === alunoId);
  if (!aluno) return;

  abrirModalExcluirAluno(aluno);
});

confirmarExcluirAluno?.addEventListener("click", async () => {
  if (!alunoIdParaExcluir) return;

  try {
    await apiAdmin(`/admin/turmas/${turmaId}/alunos/${alunoIdParaExcluir}`, {
      method: "DELETE",
    });

    fecharModalExcluirAlunoFn();
    await reloadGrade(false);
    setMsg("Aluno removido da turma");
  } catch (err) {
    setMsg(err.message, true);
  }
});

/* =========================
   INIT
========================= */
(async function init() {
  try {
    if (!turmaId) {
      setMsg("Turma inválida (id não informado).", true);
      return;
    }

    setMsg("Carregando turma...");
    await reloadGrade(false);
  } catch (err) {
    setMsg(err.message, true);
    sessionStorage.removeItem("adminSecret");
    redirectLogin();
  }
})();