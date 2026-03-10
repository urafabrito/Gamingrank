const express = require("express");
const pool = require("./db");
const adminAuth = require("./adminAuth");

const router = express.Router();

/* =========================
   ADMIN - TURMAS (CRUD)
========================= */

router.get("/admin/turmas", adminAuth, async (req, res) => {
  const result = await pool.query("SELECT id, nome FROM turmas ORDER BY nome");
  res.json(result.rows);
});

router.post("/admin/turmas", adminAuth, async (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ error: "nome obrigatório" });

  const result = await pool.query(
    "INSERT INTO turmas (nome) VALUES ($1) RETURNING id, nome",
    [nome.trim()]
  );
  res.status(201).json(result.rows[0]);
});

router.put("/admin/turmas/:id", adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { nome } = req.body;

  if (!id) return res.status(400).json({ error: "id inválido" });
  if (!nome || !nome.trim()) return res.status(400).json({ error: "nome obrigatório" });

  const result = await pool.query(
    "UPDATE turmas SET nome = $1 WHERE id = $2 RETURNING id, nome",
    [nome.trim(), id]
  );

  if (result.rowCount === 0) return res.status(404).json({ error: "Turma não encontrada" });

  res.json(result.rows[0]);
});

router.delete("/admin/turmas/:id", adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "id inválido" });

  const result = await pool.query(
    "DELETE FROM turmas WHERE id = $1 RETURNING id",
    [id]
  );

  if (result.rowCount === 0) return res.status(404).json({ error: "Turma não encontrada" });

  res.json({ ok: true });
});

/* =========================
   ADMIN - TURMA (DETALHES)
========================= */

router.get("/admin/turmas/:id", adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "id inválido" });

  const result = await pool.query("SELECT id, nome FROM turmas WHERE id = $1", [id]);
  if (result.rowCount === 0) return res.status(404).json({ error: "Turma não encontrada" });

  res.json(result.rows[0]);
});

router.get("/admin/turmas/:id/atividades", adminAuth, async (req, res) => {
  const turmaId = Number(req.params.id);
  if (!turmaId) return res.status(400).json({ error: "id inválido" });

  const result = await pool.query(
    "SELECT id, nome, max_pontos FROM atividades WHERE turma_id = $1 ORDER BY id",
    [turmaId]
  );

  res.json(result.rows);
});

router.get("/admin/turmas/:id/alunos", adminAuth, async (req, res) => {
  const turmaId = Number(req.params.id);
  if (!turmaId) return res.status(400).json({ error: "id inválido" });

  const result = await pool.query(
    `
    SELECT a.id, a.matricula, a.nome
    FROM alunos_turmas at
    JOIN alunos a ON a.id = at.aluno_id
    WHERE at.turma_id = $1
    ORDER BY a.nome
    `,
    [turmaId]
  );

  res.json(result.rows);
});

/* =========================
   HEALTH
========================= */

router.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, dbTime: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* =========================
   ALUNO - CONSULTA NOTAS
========================= */

router.get("/aluno/:matricula/notas", async (req, res) => {
  const { matricula } = req.params;

  try {
    const alunoRes = await pool.query(
      "SELECT id, matricula, nome FROM alunos WHERE matricula = $1",
      [matricula]
    );

    if (alunoRes.rowCount === 0) {
      return res.status(404).json({ error: "Aluno não encontrado" });
    }

    const aluno = alunoRes.rows[0];

    // ✅ Agora também traz t.id (turma_id) para buscar pontos_usados sem ambiguidade
    const rowsRes = await pool.query(
      `
      SELECT
        t.id   AS turma_id,
        t.nome AS turma,
        at.nome AS atividade,
        at.max_pontos AS max,
        n.nota AS nota
      FROM alunos_turmas al_t
      JOIN turmas t ON t.id = al_t.turma_id
      LEFT JOIN atividades at ON at.turma_id = t.id
      LEFT JOIN notas n ON n.atividade_id = at.id AND n.aluno_id = al_t.aluno_id
      WHERE al_t.aluno_id = $1
      ORDER BY t.nome, at.nome
      `,
      [aluno.id]
    );

    // mantém o agrupamento por NOME como antes, mas guarda turma_id junto
    const turmasMap = new Map();

    for (const r of rowsRes.rows) {
      if (!turmasMap.has(r.turma)) {
        turmasMap.set(r.turma, {
          turma: r.turma,
          turma_id: r.turma_id, // auxiliar interno
          atividades: [],
        });
      }

      if (r.atividade) {
        turmasMap.get(r.turma).atividades.push({
          atividade: r.atividade,
          nota: r.nota === null ? null : Number(r.nota),
          max: Number(r.max),
        });
      }
    }

    const turmasArr = Array.from(turmasMap.values());

    // ✅ Busca pontos usados (saldo) em uma query só
    const turmaIds = turmasArr.map(t => t.turma_id);
    const usadosMap = new Map(); // turma_id -> usados

    if (turmaIds.length) {
      const usadosRes = await pool.query(
        `
        SELECT turma_id, pontos_usados
        FROM pontos_uso
        WHERE aluno_id = $1 AND turma_id = ANY($2::int[])
        `,
        [aluno.id, turmaIds]
      );

      for (const u of usadosRes.rows) {
        usadosMap.set(u.turma_id, Number(u.pontos_usados));
      }
    }

    // ✅ Adiciona os campos novos sem alterar os antigos
    for (const t of turmasArr) {
      const total = t.atividades.reduce(
        (acc, a) => acc + (a.nota == null ? 0 : Number(a.nota)),
        0
      );

      const maxTotal = t.atividades.reduce(
        (acc, a) => acc + (a.max == null ? 0 : Number(a.max)),
        0
      );

      const usados = usadosMap.get(t.turma_id) || 0;
      const disponiveis = Math.max(0, total - usados);

      t.pontos = {
        total: Number(total.toFixed(2)),
        usados: Number(usados.toFixed(2)),
        disponiveis: Number(disponiveis.toFixed(2)),
        equivalenteProva: Number((disponiveis / 10).toFixed(2)), // 10 pts => 1,0 na prova
      };

      // opcional (se quiser usar no front): t.maxTotal = Number(maxTotal.toFixed(2));
      t.maxTotal = Number(maxTotal.toFixed(2));

      // remove campo auxiliar pra não “poluir” o retorno (não existia antes)
      delete t.turma_id;
    }

    res.json({
      aluno: { matricula: aluno.matricula, nome: aluno.nome },
      turmas: turmasArr,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao consultar notas" });
  }
});



router.get("/admin/turmas/:id/grade", adminAuth, async (req, res) => {
  const turmaId = Number(req.params.id);
  if (!turmaId) return res.status(400).json({ error: "id inválido" });

  const turmaRes = await pool.query("SELECT id, nome FROM turmas WHERE id = $1", [turmaId]);
  if (turmaRes.rowCount === 0) return res.status(404).json({ error: "Turma não encontrada" });
  const turma = turmaRes.rows[0];

  const atvRes = await pool.query(
    "SELECT id, nome, max_pontos FROM atividades WHERE turma_id = $1 ORDER BY id",
    [turmaId]
  );

  const alunosRes = await pool.query(
    `
    SELECT a.id, a.matricula, a.nome
    FROM alunos_turmas at
    JOIN alunos a ON a.id = at.aluno_id
    WHERE at.turma_id = $1
    ORDER BY a.nome
    `,
    [turmaId]
  );

  const notasRes = await pool.query(
    `
    SELECT n.aluno_id, n.atividade_id, n.nota
    FROM notas n
    JOIN atividades a ON a.id = n.atividade_id
    WHERE a.turma_id = $1
    `,
    [turmaId]
  );

  const notasMap = new Map();
  for (const r of notasRes.rows) {
    notasMap.set(`${r.aluno_id}:${r.atividade_id}`, r.nota === null ? null : Number(r.nota));
  }

  res.json({
    turma,
    atividades: atvRes.rows.map((a) => ({
      id: a.id,
      nome: a.nome,
      max: Number(a.max_pontos),
    })),
    alunos: alunosRes.rows.map((al) => ({
      id: al.id,
      matricula: al.matricula,
      nome: al.nome,
    })),
    notas: Object.fromEntries(notasMap),
  });
});



router.post("/admin/turmas/:id/atividades", adminAuth, async (req, res) => {
  const turmaId = Number(req.params.id);
  const { nome, max_pontos } = req.body;

  if (!turmaId) return res.status(400).json({ error: "id inválido" });
  if (!nome || !nome.trim()) return res.status(400).json({ error: "nome obrigatório" });

  const max = max_pontos == null ? 10 : Number(max_pontos);
  if (Number.isNaN(max) || max <= 0) return res.status(400).json({ error: "max_pontos inválido" });

  const result = await pool.query(
    "INSERT INTO atividades (turma_id, nome, max_pontos) VALUES ($1,$2,$3) RETURNING id, nome, max_pontos",
    [turmaId, nome.trim(), max]
  );

  res.status(201).json(result.rows[0]);
});

router.post("/admin/turmas/:id/alunos", adminAuth, async (req, res) => {
  const turmaId = Number(req.params.id);
  const { matricula, nome } = req.body;

  if (!turmaId) return res.status(400).json({ error: "id inválido" });
  if (!matricula || !matricula.trim()) return res.status(400).json({ error: "matricula obrigatória" });
  if (!nome || !nome.trim()) return res.status(400).json({ error: "nome obrigatório" });

  const alunoRes = await pool.query(
    `
    INSERT INTO alunos (matricula, nome)
    VALUES ($1,$2)
    ON CONFLICT (matricula) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id, matricula, nome
    `,
    [matricula.trim(), nome.trim()]
  );

  const aluno = alunoRes.rows[0];

  await pool.query(
    "INSERT INTO alunos_turmas (aluno_id, turma_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [aluno.id, turmaId]
  );

  res.status(201).json(aluno);
});

router.put("/admin/notas", adminAuth, async (req, res) => {
  const { aluno_id, atividade_id, nota } = req.body;

  const alunoId = Number(aluno_id);
  const atividadeId = Number(atividade_id);
  const notaNum = Number(nota);

  if (!alunoId || !atividadeId) return res.status(400).json({ error: "aluno_id e atividade_id obrigatórios" });
  if (Number.isNaN(notaNum)) return res.status(400).json({ error: "nota inválida" });

  // valida max_pontos
  const maxRes = await pool.query("SELECT max_pontos FROM atividades WHERE id = $1", [atividadeId]);
  if (maxRes.rowCount === 0) return res.status(404).json({ error: "Atividade não encontrada" });

  const max = Number(maxRes.rows[0].max_pontos);
  if (notaNum > max) return res.status(400).json({ error: `Nota não pode ser maior que o máximo (${max}).` });
  if (notaNum < 0) return res.status(400).json({ error: "Nota não pode ser negativa." });

  const result = await pool.query(
    `
    INSERT INTO notas (aluno_id, atividade_id, nota)
    VALUES ($1,$2,$3)
    ON CONFLICT (aluno_id, atividade_id)
    DO UPDATE SET nota = EXCLUDED.nota, updated_at = NOW()
    RETURNING aluno_id, atividade_id, nota
    `,
    [alunoId, atividadeId, notaNum]
  );

  res.json(result.rows[0]);
});

router.delete("/admin/atividades/:id", adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "id inválido" });

  try {
    await pool.query("DELETE FROM notas WHERE atividade_id = $1", [id]);

    const result = await pool.query(
      "DELETE FROM atividades WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Atividade não encontrada" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir atividade" });
  }
});

router.put("/admin/atividades/:id", adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { nome } = req.body;

  if (!id) return res.status(400).json({ error: "id inválido" });
  if (!nome || !nome.trim()) return res.status(400).json({ error: "nome obrigatório" });

  const result = await pool.query(
    "UPDATE atividades SET nome = $1 WHERE id = $2 RETURNING id, nome, max_pontos",
    [nome.trim(), id]
  );

  if (result.rowCount === 0) return res.status(404).json({ error: "Atividade não encontrada" });

  res.json(result.rows[0]);
});



router.post("/admin/turmas/:id/import", adminAuth, async (req, res) => {
  const turmaId = Number(req.params.id);
  if (!turmaId) return res.status(400).json({ error: "id inválido" });

  const { content } = req.body;
  if (!content || typeof content !== "string") {
    return res.status(400).json({ error: "content (texto do arquivo) é obrigatório" });
  }

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return res.status(400).json({ error: "Arquivo inválido: precisa de cabeçalho + pelo menos 1 aluno" });
  }

  // 1ª linha: Atv1(10)/Atv2(10)
  const header = lines[0];
  const atvParts = header.split("/").map((s) => s.trim()).filter(Boolean);

  const atividades = atvParts.map((p) => {
    const m = p.match(/^(.+?)\((\d+(\.\d+)?)\)$/);
    if (!m) return null;
    return { nome: m[1].trim(), max: Number(m[2]) };
  });

  if (atividades.some((a) => !a) || atividades.length === 0) {
    return res.status(400).json({
      error: "Cabeçalho inválido. Use: Atividade1(10)/Atividade2(10)",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // garante turma
    const turmaRes = await client.query("SELECT id FROM turmas WHERE id = $1", [turmaId]);
    if (turmaRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Turma não encontrada" });
    }

    // cria/acha atividades na turma
    const atividadeIdByIndex = [];
    let createdAtividades = 0;

    for (let i = 0; i < atividades.length; i++) {
      const { nome, max } = atividades[i];

      const ex = await client.query(
        "SELECT id FROM atividades WHERE turma_id = $1 AND nome = $2",
        [turmaId, nome]
      );

      if (ex.rowCount > 0) {
        atividadeIdByIndex[i] = ex.rows[0].id;
      } else {
        const ins = await client.query(
          "INSERT INTO atividades (turma_id, nome, max_pontos) VALUES ($1,$2,$3) RETURNING id",
          [turmaId, nome, max]
        );
        atividadeIdByIndex[i] = ins.rows[0].id;
        createdAtividades++;
      }
    }

    let createdAlunos = 0;
    let upsertedNotas = 0;

    for (let li = 1; li < lines.length; li++) {
      const parts = lines[li].split("/").map((s) => s.trim());
      if (parts.length < 1) continue;

      // parts[0] = "Nome - Matricula"
      const headerAluno = parts[0];

      const idx = headerAluno.lastIndexOf("-");
      if (idx === -1) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Linha inválida (faltou "- matricula"): "${headerAluno}"`,
        });
      }

      const nomeAluno = headerAluno.slice(0, idx).trim();
      const matricula = headerAluno.slice(idx + 1).trim();

      if (!nomeAluno) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Nome do aluno vazio em: "${headerAluno}"` });
      }
      if (!matricula) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Matrícula vazia em: "${headerAluno}"` });
      }

      // conta se é novo
      const existed = await client.query("SELECT id FROM alunos WHERE matricula = $1", [matricula]);
      const wasNew = existed.rowCount === 0;

      // upsert por matrícula
      const alunoRes = await client.query(
        `
        INSERT INTO alunos (matricula, nome)
        VALUES ($1,$2)
        ON CONFLICT (matricula) DO UPDATE SET nome = EXCLUDED.nome
        RETURNING id
        `,
        [matricula, nomeAluno]
      );

      const alunoId = alunoRes.rows[0].id;

      if (wasNew) createdAlunos++;

      // vincula na turma
      await client.query(
        "INSERT INTO alunos_turmas (aluno_id, turma_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [alunoId, turmaId]
      );

      // notas na ordem das atividades
      for (let ai = 0; ai < atividades.length; ai++) {
        const notaStr = parts[ai + 1];
        if (notaStr == null || notaStr === "") continue;

        const notaNum = Number(notaStr);
        if (Number.isNaN(notaNum)) continue;

        const max = atividades[ai].max;
        if (notaNum > max) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `Nota maior que o máximo: aluno "${nomeAluno} - ${matricula}", atividade "${atividades[ai].nome}" (${notaNum} > ${max})`,
          });
        }

        const atividadeId = atividadeIdByIndex[ai];

        await client.query(
          `
          INSERT INTO notas (aluno_id, atividade_id, nota)
          VALUES ($1,$2,$3)
          ON CONFLICT (aluno_id, atividade_id)
          DO UPDATE SET nota = EXCLUDED.nota, updated_at = NOW()
          `,
          [alunoId, atividadeId, notaNum]
        );

        upsertedNotas++;
      }
    }

    await client.query("COMMIT");

    res.json({
      ok: true,
      createdAtividades,
      createdAlunos,
      upsertedNotas,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro ao importar arquivo" });
  } finally {
    client.release();
  }
});


router.delete("/admin/turmas/:turmaId/alunos/:alunoId", adminAuth, async (req, res) => {
  const turmaId = Number(req.params.turmaId);
  const alunoId = Number(req.params.alunoId);

  if (!turmaId || !alunoId) return res.status(400).json({ error: "id inválido" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) apaga notas do aluno SOMENTE nas atividades dessa turma
    await client.query(
      `
      DELETE FROM notas n
      USING atividades a
      WHERE n.atividade_id = a.id
        AND a.turma_id = $1
        AND n.aluno_id = $2
      `,
      [turmaId, alunoId]
    );

    // 2) remove vínculo aluno_turma
    const delLink = await client.query(
      "DELETE FROM alunos_turmas WHERE turma_id = $1 AND aluno_id = $2 RETURNING aluno_id",
      [turmaId, alunoId]
    );

    if (delLink.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Aluno não está vinculado a essa turma" });
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir aluno da turma" });
  } finally {
    client.release();
  }
});

router.get("/admin/turmas/:turmaId/alunos/:alunoId/pontos", adminAuth, async (req, res) => {
  const turmaId = Number(req.params.turmaId);
  const alunoId = Number(req.params.alunoId);
  if (!turmaId || !alunoId) return res.status(400).json({ error: "id inválido" });

  // Total = soma das notas do aluno nas atividades da turma
  const totRes = await pool.query(
    `
    SELECT COALESCE(SUM(n.nota),0) AS total
    FROM atividades a
    LEFT JOIN notas n ON n.atividade_id = a.id AND n.aluno_id = $2
    WHERE a.turma_id = $1
    `,
    [turmaId, alunoId]
  );
  const total = Number(totRes.rows[0].total);

  // Usados = pontos já descontados
  const usedRes = await pool.query(
    "SELECT pontos_usados FROM pontos_uso WHERE turma_id=$1 AND aluno_id=$2",
    [turmaId, alunoId]
  );
  const usados = usedRes.rowCount ? Number(usedRes.rows[0].pontos_usados) : 0;

  const disponiveis = Math.max(0, total - usados);

  res.json({
    total,
    usados,
    disponiveis,
    equivalenteProva: Number((disponiveis / 10).toFixed(2)),
  });
});

router.post("/admin/turmas/:turmaId/alunos/:alunoId/descontar", adminAuth, async (req, res) => {
  const turmaId = Number(req.params.turmaId);
  const alunoId = Number(req.params.alunoId);
  const { pontos } = req.body;

  const p = Number(pontos);
  if (!turmaId || !alunoId) return res.status(400).json({ error: "id inválido" });
  if (Number.isNaN(p) || p <= 0) return res.status(400).json({ error: "pontos inválidos" });

  // total acumulado
  const totRes = await pool.query(
    `
    SELECT COALESCE(SUM(n.nota),0) AS total
    FROM atividades a
    LEFT JOIN notas n ON n.atividade_id = a.id AND n.aluno_id = $2
    WHERE a.turma_id = $1
    `,
    [turmaId, alunoId]
  );
  const total = Number(totRes.rows[0].total);

  // usados atuais
  const usedRes = await pool.query(
    "SELECT pontos_usados FROM pontos_uso WHERE turma_id=$1 AND aluno_id=$2",
    [turmaId, alunoId]
  );
  const usados = usedRes.rowCount ? Number(usedRes.rows[0].pontos_usados) : 0;

  const disponiveis = Math.max(0, total - usados);
  if (p > disponiveis) {
    return res.status(400).json({ error: `Saldo insuficiente. Disponíveis: ${disponiveis}` });
  }

  // incrementa usados
  await pool.query(
    `
    INSERT INTO pontos_uso (turma_id, aluno_id, pontos_usados)
    VALUES ($1,$2,$3)
    ON CONFLICT (turma_id, aluno_id)
    DO UPDATE SET pontos_usados = pontos_uso.pontos_usados + EXCLUDED.pontos_usados,
                  updated_at = NOW()
    `,
    [turmaId, alunoId, p]
  );

  res.json({ ok: true });
});

module.exports = router;