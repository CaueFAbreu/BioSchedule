# BioSchedule

Planejador de semestre para o curso de **Engenharia Biomédica (EB2020)**, com oferta de turmas de **2026/2**. Monte a grade horária, compare turmas, acompanhe requisitos e horas concluídas e organize provas, trabalhos e entregas em uma agenda com notas.

**Acesse:** [cauefabreu.github.io/BioSchedule](https://cauefabreu.github.io/BioSchedule/)

HTML, CSS e JavaScript puros, sem etapa de build. O login é opcional e usa [Supabase](https://supabase.com); sem ele, tudo funciona localmente no navegador.

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Como usar](#como-usar)
- [Armazenamento e sincronização](#armazenamento-e-sincronização)
- [Configurar o login (Supabase)](#configurar-o-login-supabase)
- [Arquitetura](#arquitetura)
- [Desenvolvimento](#desenvolvimento)
- [Publicação](#publicação)
- [Segurança](#segurança)
- [Fontes dos dados e limitações](#fontes-dos-dados-e-limitações)
- [Licenças de terceiros](#licenças-de-terceiros)

## Funcionalidades

**Grade horária**
- Catálogo com 64 componentes curriculares, organizados do 1º ao 10º período.
- Escolha de turma com atualização imediata da grade semanal (segunda a sábado).
- Detecção de conflitos de horário, incluindo conflitos *potenciais* com aulas quinzenais.
- Verificação de pré-requisitos, co-requisitos e carga mínima concluída (TCC e estágio).
- Totais de aulas por semana, carga curricular da grade e horas já concluídas.

**Agenda acadêmica**
- Registro de provas, trabalhos, atividades e outros compromissos em qualquer disciplina.
- Data, hora opcional, valor em pontos, nota obtida, anotações e marcação de concluído.
- Visão em lista (atrasados, hoje, próximos 7 dias, mais adiante, concluídos) e calendário mensal.
- Filtros por disciplina, tipo e situação.
- Resumo por disciplina: pontos obtidos, pontos distribuídos e aproveitamento no que já foi corrigido.

**Conta (opcional)**
- Cadastro com confirmação por e-mail, login, recuperação e redefinição de senha.
- Sincronização da grade e da agenda entre dispositivos.
- Aviso de privacidade (link no rodapé) e exclusão da conta com todos os dados pelo próprio usuário.

## Como usar

1. Abra um período no catálogo e marque as disciplinas que pretende cursar.
2. Troque a turma no seletor de cada disciplina para comparar horários. Conflitos aparecem destacados na grade e nos alertas.
3. Marque como **Concluída** o que você já cursou. A disciplina sai da grade e passa a contar nas horas concluídas. Disciplinas não ofertadas no semestre também podem ser marcadas como concluídas.
4. Na seção **Agenda**, use **+ Novo compromisso** ou clique em um dia do calendário. O botão **Agenda** de cada disciplina mostra apenas os compromissos dela.

## Armazenamento e sincronização

| Situação | Onde ficam os dados |
|---|---|
| Sem conta | `localStorage` do navegador e da origem utilizada. Não há sincronização entre navegadores, computadores ou entre a versão local e a publicada. Limpar os dados do navegador apaga as escolhas. |
| Com conta | Banco do Supabase, sincronizado entre dispositivos. |

Ao entrar pela primeira vez em um navegador, os dados locais são mesclados à conta:

- disciplinas concluídas se somam;
- se a mesma disciplina estiver selecionada nos dois lugares, prevalece a turma escolhida na conta;
- os compromissos são unidos e, em caso de conflito, vence a edição mais recente.

Depois do envio, a cópia local é removida, para que nenhum dado fique no computador após o logout. Alterações feitas sem conexão ficam pendentes e são reenviadas automaticamente quando a conexão volta, ou manualmente pelo botão **Tentar de novo**.

## Configurar o login (Supabase)

Sem configuração, o botão **Entrar** não aparece e a aplicação funciona apenas no navegador.

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute [`supabase/schema.sql`](supabase/schema.sql). O script cria as tabelas `plans` e `agenda_items`, as políticas de Row Level Security, o limite de registros por usuário e a função `delete_own_account`, usada na exclusão de conta. Pode ser reexecutado com segurança.
3. Em **Authentication → URL Configuration**, defina `https://cauefabreu.github.io/BioSchedule/` como *Site URL* e adicione-a em *Redirect URLs*. Para testes locais, inclua também `http://127.0.0.1:4173/`.
4. Em **Authentication → Providers → Email**, mantenha a confirmação de e-mail ativa e defina senha mínima de 8 caracteres.
5. Em **Project Settings → API**, copie a *Project URL* e a chave pública (*anon* ou *publishable*) para [`config.js`](config.js):

   ```js
   window.BIO_CONFIG = Object.freeze({
     supabaseUrl: 'https://<projeto>.supabase.co',
     supabaseAnonKey: '<chave pública>',
   });
   ```

> [!WARNING]
> Use somente a chave pública. A chave `service_role`/`secret` ignora o Row Level Security e nunca deve ser versionada nem enviada ao navegador. A aplicação detecta essa chave e desativa o login se ela for configurada por engano.

## Arquitetura

Scripts clássicos, carregados com `defer`, sem módulos ES. Por isso a aplicação também funciona aberta direto do disco (`file://`).

| Arquivo | Responsabilidade |
|---|---|
| [`index.html`](index.html) | Estrutura da página, Content-Security-Policy e diálogos. |
| [`config.js`](config.js) | Credenciais públicas do Supabase (vazias por padrão). |
| [`data.js`](data.js) | Catálogo, turmas, horários, cargas e requisitos. |
| [`core.js`](core.js) | Regras puras: conflitos, requisitos, totais, validação e resumo da agenda, calendário. Sem DOM nem rede. |
| [`store.js`](store.js) | Persistência local e na nuvem, autenticação, mesclagem e fila de sincronização. |
| [`app.js`](app.js) | Interface da grade e inicialização. |
| [`agenda.js`](agenda.js) | Interface da agenda: lista, calendário e formulário. |
| [`auth.js`](auth.js) | Diálogos de conta. |
| [`styles.css`](styles.css) | Tema escuro e layout responsivo. |
| [`supabase/schema.sql`](supabase/schema.sql) | Tabelas, restrições e políticas de acesso. |
| [`vendor/`](vendor/) | Cliente oficial `@supabase/supabase-js` 2.117.2, carregado sob demanda. |

## Desenvolvimento

Requisitos: um navegador moderno. Node.js 18 ou superior só é necessário para testes e versionamento de assets.

```sh
# servidor local (qualquer servidor estático serve)
python -m http.server 4173 --bind 127.0.0.1

# testes
node --test tools/core.test.cjs tools/store.test.cjs
```

Os testes cobrem regras da grade, integridade do catálogo, validação da agenda, persistência local e o fluxo de login e sincronização. O fluxo de login usa um Supabase simulado em memória, sem acesso à rede.

O diretório `qa/` guarda material local de conferência, é ignorado pelo Git e não deve ser publicado.

## Publicação

O site é publicado pelo **GitHub Pages** a partir da raiz da branch `initial-site`. O arquivo `.nojekyll` desativa o processamento do Jekyll. Veja a [documentação de publicação por branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Antes de publicar alterações em CSS ou JavaScript, atualize as URLs com hash de conteúdo para evitar versões antigas em cache. O comando não apaga as escolhas salvas dos usuários.

```sh
node tools/version-assets.cjs
```

## Segurança

- **Content-Security-Policy:** scripts e estilos apenas da própria origem; conexões apenas com `*.supabase.co`; `base`, `object` e envio de formulários bloqueados. Um domínio personalizado do Supabase exige ajustar `connect-src` em `index.html` e `SUPABASE_URL` em `store.js`.
- **Isolamento de dados:** Row Level Security em todas as tabelas. Cada usuário acessa apenas as próprias linhas, e visitantes anônimos não têm acesso.
- **Validação em camadas:** entradas são validadas no navegador e novamente no banco (título até 120 caracteres, anotações até 2.000, pontuação de 0 a 1.000, no máximo 2.000 compromissos por usuário). Dados lidos do navegador ou da conta são conferidos contra o catálogo.
- **Saída segura:** todo texto é escapado antes de ser inserido no HTML.
- **Autenticação:** fluxo PKCE e mensagens de erro genéricas, que não revelam se um e-mail está cadastrado.
- **Privacidade (LGPD):** o aviso no rodapé descreve os dados coletados e a finalidade. Estando conectado, o usuário exclui a própria conta pela função `delete_own_account`, que só apaga quem a chama. Grade e agenda são removidas junto por `on delete cascade`. Ao alterar o que é coletado, atualize o texto e a data do aviso em `index.html`.
- **Sem dependências de CDN:** a biblioteca do Supabase é servida pelo próprio site.
- **Sem dados sensíveis no repositório:** nenhum dado pessoal ou chave secreta é versionado. `config.js` contém apenas a chave pública.

## Fontes dos dados e limitações

**Fontes**
- Horários: `horario_eng._biom._2026-02_atualizado_0.pdf` (Engenharia Biomédica, 2026/2, 12 páginas).
- Cargas curriculares, períodos e requisitos: `fluxogramaeb2020-versao12.pdf` (página única).
- O repositório não inclui cópias dos PDFs nem nomes de professores.

**Modelo de dados**
- `hours` é a carga curricular total do componente.
- `prerequisites` exige conclusão.
- `corequisites` aceita conclusão ou seleção na mesma grade.
- Lista vazia indica ausência de exigência no fluxograma; `null` indica informação desconhecida.
- As disciplinas foram associadas ao fluxograma pelo nome, pois ele usa numeração própria (1 a 64) em vez de códigos. As setas simples (pré-requisito) e duplas (co-requisito) foram conferidas visualmente.

**Decisões e observações**
- Monitoria Obrigatória foi removida do catálogo por solicitação.
- Todas as extensões (I a V) são online e sem horário fixo. Suas cargas (90h, 60h, 90h, 60h e 120h, total de 420h) contam nos totais sem ocupar a grade semanal.
- TCC exige 2.700h e estágio 2.300h concluídas. A contagem considera apenas o catálogo: optativas, atividades complementares e créditos externos não estão cadastrados. Os avisos não substituem a validação acadêmica oficial.
- O fluxograma aloca TCC e Extensão V no 9º período e estágio no 10º. O PDF de horários agrupa os dois períodos.
- MCS, ESTAT e EXT3 aparecem na continuação da tabela do 3º período, sob o cabeçalho "4º período" na página 5. O fluxograma confirma o 3º período.
- PP mostra "A1/A" nas duas primeiras aulas de quinta. Foi interpretado como A1/A2, com aviso para confirmação.
- E-CE1 é quinzenal e não tem calendário de alternância. Bioquímica tem laboratório quinzenal: B1 a partir de 04/09/2026 e B2 a partir de 11/09/2026. Sobreposições com aulas quinzenais são indicadas como potenciais.
- A média semanal soma a duração das aulas selecionadas, com aulas quinzenais valendo metade e aulas sobrepostas contadas individualmente. Ela não mede tempo livre e não equivale à carga curricular.
- Os asteriscos das turmas de BIOMEC e EHOS não são explicados no PDF e foram mantidos.
- Os horários noturnos e a coluna de sábado seguem a imagem de referência. O PDF não aloca disciplinas nesses horários.

## Licenças de terceiros

- [`@supabase/supabase-js`](https://github.com/supabase/supabase-js), MIT. Texto da licença em [`vendor/supabase-LICENSE.txt`](vendor/supabase-LICENSE.txt).
