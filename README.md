# BioSchedule

Planejador de Engenharia Biomédica para 2026/2. Interface minimalista em grafite, oliva, âmbar e terracota. HTML, CSS e JavaScript puro, sem compilação, dependências externas ou servidor de aplicação.

## Usar

Abra `index.html` no navegador ou acesse a publicação no GitHub Pages. Escolha disciplinas por período e altere a turma para comparar horários. Marcar uma disciplina como concluída a remove da grade semanal. A disciplina não ofertada continua disponível para registrar conclusão.

As escolhas são salvas no localStorage do navegador e da origem utilizada. Não são sincronizadas entre computadores, entre navegadores nem entre a versão local e a publicada. Se o navegador impedir o armazenamento, a interface avisa. Limpar os dados do navegador apaga as escolhas.

## Dados e limites

- `data.js`: 65 entradas transcritas do PDF `horario_eng._biom._2026-02_atualizado_0.pdf`, incluindo Monitoria Obrigatória. Sem nomes de professores ou cópia do PDF no repositório.
- Fonte: horários de Engenharia Biomédica, segundo semestre de 2026, 12 páginas, fornecidos pelo usuário.
- Cargas curriculares e requisitos dos 64 componentes: `fluxogramaeb2020-versao12.pdf`, página única, fornecido pelo usuário. Associação por nome, pois o fluxograma utiliza numeração própria (1–64), não códigos. Monitoria não consta nele; mantém carga e requisitos desconhecidos.
- `hours` representa horas curriculares totais. `prerequisites` exige conclusão; `corequisites` aceita conclusão ou seleção simultânea. Setas simples e duplas foram conferidas visualmente. Uma lista vazia indica ausência de exigência no fluxograma; `null` significa desconhecido.
- TCC exige 2.700h e estágio 2.300h concluídas. O contador considera somente o catálogo: optativas, atividades complementares e outros créditos não estão cadastrados, portanto avisos não substituem validação acadêmica.
- O contador semanal soma minutos de aula, sem os intervalos, ponderando aulas quinzenais por 1/2. Conta aulas sobrepostas individualmente; não mede tempo livre/ocupado e não substitui carga curricular.
- O fluxograma separa TCC e Extensão V no 9º período e estágio no 10º; o catálogo segue essa informação.
- MCS, ESTAT e EXT3 aparecem na continuação da tabela do 3º período, com cabeçalho “4º período” na página 5. O fluxograma confirma os três no 3º período; a inconsistência do horário está anotada.
- Fonte de requisitos utilizada: fluxograma EB2020 versão 12; horários de oferta: 2026/2.
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

Antes de publicar alterações em CSS ou JavaScript, execute `node tools/version-assets.cjs`. O comando atualiza as URLs dos arquivos com hashes de conteúdo para evitar versões antigas no cache, sem apagar as escolhas salvas do usuário.
