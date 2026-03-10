const API = "https://gamingrank-api.onrender.com/api";
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
      const ok = confirm(`Excluir a atividade "${atvNome}"? (as notas dela também serão removidas)`);
      if (!ok) return;

      await apiAdmin(`/admin/atividades/${atvId}`, { method: "DELETE" });

      await reloadGrade(true);
      setMsg("Atividade excluída ");
    }
  } catch (err) {
    setMsg(err.message, true);
  }
});

btnAddAluno.addEventListener("click", async () => {
  const matricula = prompt("Matrícula do aluno:");
  if (!matricula || !matricula.trim()) return;

  const nome = prompt("Nome do aluno:");
  if (!nome || !nome.trim()) return;

  try {
    await apiAdmin(`/admin/turmas/${turmaId}/alunos`, {
      method: "POST",
      body: JSON.stringify({ matricula: matricula.trim(), nome: nome.trim() }),
    });

    await reloadGrade(false);
    setMsg("Aluno adicionado");
  } catch (err) {
    setMsg(err.message, true);
  }
});

// ✅ adicionar atividade
btnAddAtv.addEventListener("click", async () => {
  const nome = prompt("Nome da atividade (ex: Atvd 1):");
  if (!nome || !nome.trim()) return;

  const maxStr = prompt("Máximo de pontos (ex: 10):", "10");
  if (maxStr === null) return;
  const max = Number(maxStr);

  if (Number.isNaN(max) || max <= 0) {
    setMsg("Máx inválido.", true);
    return;
  }

  try {
    await apiAdmin(`/admin/turmas/${turmaId}/atividades`, {
      method: "POST",
      body: JSON.stringify({ nome: nome.trim(), max_pontos: max }),
    });

    await reloadGrade(true);
    setMsg("Atividade criada");
  } catch (err) {
    setMsg(err.message, true);
  }
});

btnUsarPontos.addEventListener("click", async () => {
  const alunoId = Number(selectAluno.value);
  const aluno = grade.alunos.find(a => a.id === alunoId);
  if (!aluno) return;

  const str = prompt("Quantos pontos do sistema o aluno vai usar na prova?");
  if (str == null) return;

  const pontos = Number(str);
  if (Number.isNaN(pontos) || pontos <= 0) {
    setMsg("Valor inválido.", true);
    return;
  }

  try {
    await apiAdmin(`/admin/turmas/${turmaId}/alunos/${alunoId}/descontar`, {
      method: "POST",
      body: JSON.stringify({ pontos })
    });

    await reloadGrade(true); // recarrega e atualiza total + pontos disponíveis
    setMsg("Pontos descontados");
  } catch (err) {
    setMsg(err.message, true);
  }
});


btnDelAtv.addEventListener("click", async () => {
  if (!grade?.atividades?.length) {
    setMsg("Não há atividades para excluir.", true);
    return;
  }

  const lista = grade.atividades.map((a) => a.nome).join("\n");
  const nome = prompt(`Digite exatamente o nome da atividade para excluir:\n\n${lista}`);
  if (!nome || !nome.trim()) return;

  const atividade = grade.atividades.find((a) => a.nome.toLowerCase() === nome.trim().toLowerCase());
  if (!atividade) {
    setMsg("Atividade não encontrada (verifique o nome).", true);
    return;
  }

  const ok = confirm(`Excluir a atividade "${atividade.nome}"? (isso remove as notas dela também)`);
  if (!ok) return;

  try {
    await apiAdmin(`/admin/atividades/${atividade.id}`, { method: "DELETE" });
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

btnDelAluno.addEventListener("click", async () => {
  if (!grade?.alunos?.length) {
    setMsg("Não há alunos para excluir.", true);
    return;
  }

  const alunoId = Number(selectAluno.value);
  const aluno = grade.alunos.find(a => a.id === alunoId);
  if (!aluno) return;

  const ok = confirm(`Excluir o aluno "${aluno.nome} (${aluno.matricula})" desta turma?`);
  if (!ok) return;

  try {
    await apiAdmin(`/admin/turmas/${turmaId}/alunos/${alunoId}`, { method: "DELETE" });
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