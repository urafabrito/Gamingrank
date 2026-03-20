const API = "https://gamingrank-api.onrender.com/api";
//const API = "http://localhost:3000/api";
const LOGIN_PAGE = "./professor-login.html";

function getSecret() {
  return sessionStorage.getItem("adminSecret") || "";
}

function redirectLogin() {
  window.location.href = LOGIN_PAGE;
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setMsg(text, isError = false) {
  const msg = document.getElementById("msg");
  if (!msg) return;
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

function formatNumero(valor) {
  return valor == null ? "-" : Number(Number(valor).toFixed(1));
}

const atividadeId = Number(qs("id"));
let detalhe = null;

const tituloAtividade = document.getElementById("tituloAtividade");
const nomeTurmaCard = document.getElementById("nomeTurmaCard");
const nomeAtividadeCard = document.getElementById("nomeAtividadeCard");
const tbodyAtividade = document.getElementById("tbodyAtividade");
const linkVoltarTurma = document.getElementById("linkVoltarTurma");

function renderTabela() {
  tbodyAtividade.innerHTML = "";

  if (!detalhe?.alunos?.length) {
    tbodyAtividade.innerHTML = `<tr><td colspan="3" class="subtle">Sem alunos.</td></tr>`;
    return;
  }

  detalhe.alunos.forEach((aluno) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${aluno.nome} (${aluno.matricula})</td>
      <td class="num nota-cell" data-aluno-id="${aluno.id}">
        ${aluno.nota ?? "-"}
      </td>
      <td class="num">${formatNumero(detalhe.atividade.max)}</td>
    `;
    tbodyAtividade.appendChild(tr);
  });
}

async function reloadAtividade() {
  setMsg("Carregando atividade...");
  detalhe = await apiAdmin(`/admin/atividades/${atividadeId}/notas`);

  tituloAtividade.textContent = detalhe.atividade.nome;
  nomeTurmaCard.textContent = detalhe.turma.nome;
  nomeAtividadeCard.textContent = `Atividade: ${detalhe.atividade.nome}`;
  linkVoltarTurma.href = `./turma.html?id=${detalhe.turma.id}`;

  renderTabela();
  setMsg("");
}

tbodyAtividade.addEventListener("click", async (e) => {
  const cell = e.target.closest(".nota-cell");
  if (!cell) return;

  const alunoId = Number(cell.dataset.alunoId);
  const currentText = cell.textContent.trim();
  const currentValue = currentText === "-" ? "" : currentText;

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

    const max = Number(detalhe.atividade.max);

    if (nota > max) {
      cell.innerHTML = old;
      setMsg(`A nota não pode ser maior que o máximo (${max}).`, true);
      return;
    }

    if (nota < 0) {
      cell.innerHTML = old;
      setMsg("A nota não pode ser negativa.", true);
      return;
    }

    try {
      await apiAdmin(`/admin/notas`, {
        method: "PUT",
        body: JSON.stringify({
          aluno_id: alunoId,
          atividade_id: detalhe.atividade.id,
          nota,
        }),
      });

      await reloadAtividade();
      setMsg("Nota salva");
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

  input.addEventListener("blur", save);
});

(async function init() {
  try {
    if (!atividadeId) {
      setMsg("Atividade inválida (id não informado).", true);
      return;
    }

    if (!getSecret()) {
      redirectLogin();
      return;
    }

    await reloadAtividade();
  } catch (err) {
    setMsg(err.message, true);
    sessionStorage.removeItem("adminSecret");
    redirectLogin();
  }
})();