
INSERT INTO turmas (nome) VALUES ('PDS'), ('Manutenção')
ON CONFLICT (nome) DO NOTHING;


INSERT INTO alunos (matricula, nome) VALUES ('2023001', 'Aluno A')
ON CONFLICT (matricula) DO NOTHING;

INSERT INTO alunos_turmas (aluno_id, turma_id)
SELECT a.id, t.id
FROM alunos a
JOIN turmas t ON t.nome IN ('PDS', 'Manutenção')
WHERE a.matricula = '2023001'
ON CONFLICT DO NOTHING;


INSERT INTO atividades (turma_id, nome, max_pontos)
SELECT t.id, 'Atvd 1', 10 FROM turmas t WHERE t.nome='PDS'
ON CONFLICT (turma_id, nome) DO NOTHING;

INSERT INTO atividades (turma_id, nome, max_pontos)
SELECT t.id, 'Atvd 2', 10 FROM turmas t WHERE t.nome='PDS'
ON CONFLICT (turma_id, nome) DO NOTHING;


INSERT INTO notas (aluno_id, atividade_id, nota)
SELECT a.id, at.id, 10
FROM alunos a
JOIN turmas t ON t.nome='PDS'
JOIN atividades at ON at.turma_id=t.id AND at.nome='Atvd 1'
WHERE a.matricula='2023001'
ON CONFLICT (aluno_id, atividade_id) DO UPDATE SET nota=EXCLUDED.nota, updated_at=NOW();

INSERT INTO notas (aluno_id, atividade_id, nota)
SELECT a.id, at.id, 8
FROM alunos a
JOIN turmas t ON t.nome='PDS'
JOIN atividades at ON at.turma_id=t.id AND at.nome='Atvd 2'
WHERE a.matricula='2023001'
ON CONFLICT (aluno_id, atividade_id) DO UPDATE SET nota=EXCLUDED.nota, updated_at=NOW();