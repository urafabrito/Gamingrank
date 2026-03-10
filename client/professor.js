const API = "http://localhost:3000/api";
const LOGIN_PAGE = "./professor-login.html";

/* ---------- helpers ---------- */
function getSecret() {
  return sessionStorage.getItem("adminSecret") || "";
}

function redirectLogin() {
  window.location.href = LOGIN_PAGE;
}

/* ---------- elementos (precisam existir antes de setMsg) ---------- */
const formCriarTurma = document.getElementById("formCriarTurma");
const nomeTurmaInput = document.getElementById("nomeTurma");
const turmasBody = document.getElementById("turmasBody");
const msg = document.getElementById("msg");

function setMsg(text, isError = false) {
  if (!msg) return;
  msg.textContent = text || "";
  msg.style.color = isError ? "#b91c1c" : "#475569";
}

/* ---------- api ---------- */
async function apiAdmin(path, options = {}) {
  const secret = getSecret();
  if (!secret) {
    redirectLogin();
    return;
  }

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


if (!getSecret()) {
  redirectLogin();
}


async function carregarTurmas() {
  setMsg("Carregando turmas...");
  turmasBody.innerHTML = "";

  const turmas = await apiAdmin("/admin/turmas");

  turmas.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.id}</td>
      <td>
        <a href="./turma.html?id=${t.id}" class="turma-link">${t.nome}</a>
      </td>
      <td style="display:flex; gap:8px;">
        <button class="btn-small" data-action="edit" data-id="${t.id}" data-nome="${t.nome}">Editar</button>
        <button class="btn-small danger" data-action="delete" data-id="${t.id}" data-nome="${t.nome}">Excluir</button>
      </td>
    `;
    turmasBody.appendChild(tr);
  });

  setMsg(`Turmas carregadas: ${turmas.length}`);
}


turmasBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const nomeAtual = btn.dataset.nome;

  try {
    if (action === "edit") {
      const novoNome = prompt("Novo nome da turma:", nomeAtual);
      if (!novoNome || !novoNome.trim()) return;

      await apiAdmin(`/admin/turmas/${id}`, {
        method: "PUT",
        body: JSON.stringify({ nome: novoNome.trim() }),
      });

      await carregarTurmas();
      setMsg("Turma editada ");
    }

    if (action === "delete") {
      const ok = confirm(`Excluir a turma "${nomeAtual}"?`);
      if (!ok) return;

      await apiAdmin(`/admin/turmas/${id}`, { method: "DELETE" });

      await carregarTurmas();
      setMsg("Turma excluída ");
    }
  } catch (err) {
    setMsg(err.message, true);
  }
});


formCriarTurma.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = nomeTurmaInput.value.trim();
  if (!nome) return;

  try {
    await apiAdmin("/admin/turmas", {
      method: "POST",
      body: JSON.stringify({ nome }),
    });

    nomeTurmaInput.value = "";
    await carregarTurmas();
    setMsg("Turma criada com sucesso ");
  } catch (err) {
    setMsg(err.message, true);
  }
});


(async function init() {
  try {
    
    await apiAdmin("/admin/turmas");

    
    await carregarTurmas();
  } catch (err) {
    setMsg(err.message, true);
    sessionStorage.removeItem("adminSecret");
    redirectLogin();
  }
})();