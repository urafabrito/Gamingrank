const API = "http://localhost:3000/api";

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function fetchNotas(matricula) {
  const res = await fetch(`${API}/aluno/${encodeURIComponent(matricula)}/notas`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao buscar");
  }
  return res.json();
}

function safeText(v) {
  return (v ?? "").toString();
}

function renderResultado(container, data) {
  container.innerHTML = "";

  data.turmas.forEach((t) => {
    const bloco = document.createElement("div");
    bloco.className = "turma";

    bloco.innerHTML = `<h3>${safeText(t.turma)}</h3>`;

    if (!t.atividades.length) {
      const p = document.createElement("div");
      p.className = "empty";
      p.textContent = "Sem atividades cadastradas.";
      bloco.appendChild(p);
      container.appendChild(bloco);
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "table-wrap";

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Atividade</th>
          <th>Nota</th>
          <th>Máx</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    
    t.atividades.forEach((a) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${safeText(a.atividade)}</td>
        <td>${a.nota ?? "-"}</td>
        <td>${a.max}</td>
      `;
      tbody.appendChild(tr);
    });

    
    const total = t.atividades.reduce((acc, a) => acc + (a.nota ?? 0), 0);
    const maxTotal = t.atividades.reduce((acc, a) => acc + (a.max ?? 0), 0);

    const trTotal = document.createElement("tr");
    trTotal.innerHTML = `
      <td><strong>Total</strong></td>
      <td><strong>${total}</strong></td>
      <td><strong>${maxTotal}</strong></td>
    `;
    tbody.appendChild(trTotal);

    // ✅ linha Pontos disponíveis (saldo)
if (t.pontos) {
  const trDisp = document.createElement("tr");
  trDisp.className = "total-row";
  trDisp.innerHTML = `
    <td><strong>Pontos disponíveis</strong></td>
    <td class="num"><strong>${t.pontos.disponiveis}</strong></td>
    <td class="num">-</td>
  `;
  tbody.appendChild(trDisp);

  // opcional: mostrar equivalente na prova em uma linha de texto
  const info = document.createElement("div");
  info.className = "subtle";
  info.style.marginTop = "8px";
  //info.textContent = `Equivalente na prova: ${t.pontos.equivalenteProva}`;
  bloco.appendChild(info);
}

    wrap.appendChild(table);
    bloco.appendChild(wrap);
    container.appendChild(bloco);
  });
}


const formBusca = document.getElementById("formBusca");
if (formBusca) {
  formBusca.addEventListener("submit", (e) => {
    e.preventDefault();
    const matricula = document.getElementById("matricula").value.trim();
    if (!matricula) return;

    
    window.location.href = `./resultado.html?matricula=${encodeURIComponent(
      matricula
    )}`;
  });
}


const resultadoDiv = document.getElementById("resultado");
if (resultadoDiv) {
  const matricula = qs("matricula");

  if (!matricula) {
    resultadoDiv.innerHTML = `<div class="section-title" style="color:#b91c1c">Matrícula não informada.</div>`;
  } else {
    resultadoDiv.innerHTML = `<div class="subtle">Carregando...</div>`;

    fetchNotas(matricula)
      .then((data) => {
        const nomeAluno = document.getElementById("nomeAluno");
        if (nomeAluno) nomeAluno.textContent = data.aluno.nome;
        renderResultado(resultadoDiv, data);
      })
      .catch((err) => {
        resultadoDiv.innerHTML = `<div class="section-title" style="color:#b91c1c">${err.message}</div>`;
      });
  }
}