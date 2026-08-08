# ParabelluM — Controle da CP LU4

Aplicativo público de prestação de contas para a CP ParabelluM, com edição exclusiva do proprietário.

Formação principal: **Ardranes, Sooul e xFonseca (Tyrants)**, **DeusCriolo (Tank Dark Elf)** e **Doidinha (Gladiadora humana)**. A identidade visual usa o emblema oficial do grupo e uma arte original dessa formação.

## O que controla

- **Equipamentos:** ciclos com item, valor unitário, fila dos 5 jogadores, contribuições datadas, caixa disponível, recebimentos e saldo individual (crédito/débito).
- **Cristais e drops:** cristalização coletiva, item mantido por jogador, dívida proporcional aos outros quatro membros e compensação automática nas distribuições futuras.
- **Auditoria:** cada alteração salva autor, data, ação, resumo e snapshot completo.

## Modelo de dados

O estado lógico contém `cycles → recipients → contributions`, `drops` e `crystalPayments`. A tabela `app_state` guarda um snapshot versionado; `audit_log` guarda as versões históricas. O salvamento usa controle otimista de versão para impedir que duas janelas sobrescrevam uma à outra.

O primeiro ciclo configurado é **Top Joias D**, no valor de **522.000 Adena por jogador**.

## Administração segura

O público acessa o link sem login e só faz consultas. O botão **Admin**, no canto inferior direito, usa o login gerenciado pela plataforma. O servidor só aceita gravações quando o e-mail autenticado coincide com a variável secreta `ADMIN_EMAIL`; esconder botões no navegador nunca é tratado como proteção.

Na publicação, configure `ADMIN_EMAIL` com o e-mail do proprietário. Não coloque esse valor no repositório.

## Regras e salvaguardas

- valores devem ser inteiros positivos;
- os cinco jogadores e a ordem de turnos não podem ser alterados por lançamentos;
- uma entrega só é confirmada para o próximo da fila e quando o caixa cobre o item;
- um item mantido credita os quatro demais em 1/5 do valor de cristais cada e debita o recebedor em 4/5;
- distribuições futuras quitam primeiro credores e compensam dívidas automaticamente;
- conflitos entre abas retornam erro e exigem recarga.

## Desenvolvimento

Requer Node.js 22+. Instale as dependências, gere a migração com `pnpm db:generate`, execute `pnpm dev` e valide com `pnpm test` e `pnpm lint`. A publicação usa Cloudflare D1 por meio do OpenAI Sites.

## Fluxo do líder

1. Entre pelo botão **Admin**.
2. Crie o item e informe seu valor por jogador.
3. Registre cada contribuição com data e observação.
4. Reorganize os jogadores pendentes em **Ordem de recebimento** quando necessário; jogadores já equipados ficam travados para preservar o histórico.
5. Quando o caixa cobrir o item, confirme a entrega ao próximo da fila.
6. Registre drops cristalizados ou escolha quem manteve o item.
7. Lance lotes de cristais distribuídos; os débitos são compensados pelo sistema.
