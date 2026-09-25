# BioSchedule

Planejador de Engenharia Biomédica para 2026/2. Interface minimalista em creme, oliva e terracota. HTML, CSS e JavaScript puro, sem compilação, dependências externas ou servidor de aplicação.

## Usar

Abra `index.html` no navegador ou acesse a publicação no GitHub Pages. Escolha disciplinas por período e altere a turma para comparar horários. Marcar uma disciplina como concluída a remove da grade semanal. A disciplina não ofertada continua disponível para registrar conclusão.

As escolhas são salvas no localStorage do navegador e da origem utilizada. Não são sincronizadas entre computadores, entre navegadores nem entre a versão local e a publicada. Se o navegador impedir o armazenamento, a interface avisa. Limpar os dados do navegador apaga as escolhas.

## Dados e limites

- `data.js`: 65 entradas transcritas do PDF `horario_eng._biom._2026-02_atualizado_0.pdf`, incluindo Monitoria Obrigatória. Sem nomes de professores ou cópia do PDF no repositório.
- Fonte: horários de Engenharia Biomédica, segundo semestre de 2026, 12 páginas, fornecidos pelo usuário.
- Cargas curriculares e pré-requisitos NÃO constam no PDF. `hours: null` e `prerequisites: null` significam **não informado**. Não foram inventados valores.
- Após obter a matriz correspondente, preencher `hours` com a carga curricular e `prerequisites` com os códigos exigidos. Uma lista vazia significa ausência confirmada de pré-requisitos; `null` significa desconhecido. O motor de avisos já trata esses estados.
- O contador semanal soma minutos de aula, sem os intervalos, ponderando aulas quinzenais por 1/2. Conta aulas sobrepostas individualmente; não mede tempo livre/ocupado e não substitui carga curricular.
- O PDF agrupa 9º/10º períodos; o catálogo preserva o agrupamento.
- MCS, ESTAT e EXT3 aparecem na continuação da tabela do 3º período, com cabeçalho “4º período” na página 5. MCS tem horário no 3º; a inconsistência está anotada.
- PP tem “A1/A” nas duas primeiras aulas de quinta. Interpretado como A1/A2, com aviso para confirmação.
- E-CE1 é quinzenal, sem datas. Bioquímica tem laboratório quinzenal B1 desde 04/09/2026 e B2 desde 11/09/2026. A grade representa as duas semanas; sobreposições quinzenais são potenciais.
- Os asteriscos em BIOMEC/EHOS não são explicados no PDF e foram preservados.
- Os horários noturnos e a coluna de sábado seguem a imagem de referência; o PDF não aloca disciplinas nesses horários.

## Desenvolvimento e validação

```sh
python -m http.server 4173 --bind 127.0.0.1
node --test tools/core.test.cjs
```

`core.js` contém cálculos e regras; `app.js` controla a interface e persistência; `styles.css` contém a apresentação responsiva. A aplicação também funciona sem HTTP por usar scripts clássicos e nenhum fetch.

O diretório `qa/` guarda apenas material local de conferência e é ignorado pelo Git. Não publicar seu conteúdo.

## GitHub Pages

Publicação estática pela raiz da branch `codex/initial-site`, com `.nojekyll`. Não há chaves de API ou dados pessoais armazenados no repositório.

[Documentação oficial de publicação por branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
