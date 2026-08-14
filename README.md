# ParabelluM — Controle da CP LU4

Aplicativo público de prestação de contas para a CP ParabelluM, com edição exclusiva do proprietário.

Formação principal: **Ardranes, Sooul e xFonseca (Tyrants)**, **DeusCriolo (Tank Dark Elf)** e **Doidinha (Gladiadora humana com dual blunt)**. A identidade visual usa o emblema oficial do grupo e uma arte original dessa formação; o brasão fica no alto da composição para não competir com o cartão do objetivo atual.

## O que controla

- **Equipamentos:** ciclos com item, valor unitário, fila dos 5 jogadores, contribuições datadas, caixa disponível, recebimentos e saldo individual (crédito/débito).
- **Correção de contribuições:** todos os lançamentos aparecem individualmente no cartão do jogador e no painel **Gerenciar todas as contribuições**. O Admin pode editar jogador, valor, data e observação ou excluir um registro com confirmação; toda mudança entra na auditoria.
- **Reward parcial:** o Admin pode adiantar parte da Adena diretamente pelo cartão de um jogador, mesmo acima do que ele já contribuiu; cada reward pode ser excluído com confirmação. Rewards pendentes devolvem a Adena ao caixa; em item já entregue, a exclusão corrige o histórico sem alterar o custo final do item.
- **Rodada atual editável:** o Admin pode alterar item e valor sem perder fila ou contribuições, ou encerrar a rodada e iniciar a próxima preservando a anterior no histórico.
- **Cristais C e D:** cofre visual com contas completamente separadas por grade. Cada drop escolhe C ou D; dívida, compensação e entrega individual acontecem somente dentro da mesma grade.
- **Venda de drops:** anúncios com item, quantidade e preço unitário editável; a Adena só entra no saldo dos cinco após a confirmação da venda. Enquanto estiver na loja, o Admin também pode excluir o anúncio ou cristalizar o lote, escolhendo grade C/D e quantidade total.
- **Auditoria:** cada alteração salva autor, data, ação, resumo e snapshot completo.

## Modelo de dados

O estado lógico contém `cycles → recipients → contributions/rewards`, `drops` e `crystalPayments`. A tabela `app_state` guarda um snapshot versionado; `audit_log` guarda as versões históricas. O salvamento usa controle otimista de versão para impedir que duas janelas sobrescrevam uma à outra.

O primeiro ciclo configurado é **Top Joias D**, no valor de **522.000 Adena por jogador**.

## Administração segura

O público acessa o link sem login e só faz consultas. O botão **Admin**, no canto inferior direito, usa o login gerenciado pela plataforma. O servidor só aceita gravações quando o e-mail autenticado coincide com a variável secreta `ADMIN_EMAIL`; esconder botões no navegador nunca é tratado como proteção.

Na publicação, configure `ADMIN_EMAIL` com o e-mail do proprietário. Não coloque esse valor no repositório.

## Regras e salvaguardas

- valores devem ser inteiros positivos;
- cada contribuição deve pertencer ao mesmo jogador que recebe seu saldo, e correções que deixariam o caixa negativo são bloqueadas;
- os cinco jogadores e a ordem de turnos não podem ser alterados por lançamentos;
- uma entrega só é confirmada para o próximo da fila e quando o caixa cobre o item;
- um reward parcial pode ultrapassar a contribuição do jogador, mas nunca a Adena existente no caixa nem o valor restante do item para aquele jogador;
- um item mantido credita os quatro demais em 1/5 do valor de cristais cada e debita o recebedor em 4/5, sempre na grade C ou D informada;
- cristais C nunca quitam dívida D e cristais D nunca quitam dívida C; registros antigos sem grade são preservados como D;
- distribuições futuras quitam primeiro credores e compensam dívidas automaticamente;
- conflitos entre abas retornam erro e exigem recarga.

## Desenvolvimento

Requer Node.js 22+. Instale as dependências, gere a migração com `pnpm db:generate`, execute `pnpm dev` e valide com `pnpm test` e `pnpm lint`. A publicação usa Cloudflare D1 por meio do OpenAI Sites.

## Fluxo do líder

1. Entre pelo botão **Admin**.
2. Em **Editar rodada atual**, altere o item ou o valor por jogador quando o objetivo mudar; fila e contribuições são preservadas.
3. Registre cada contribuição com data e observação.
   O campo de Adena aceita o padrão do jogo (`50k`, `500k`, `1kk`) e números com pontos (`500.000`); atalhos comuns aparecem logo abaixo do campo.
4. Se lançar no personagem errado, abra **Gerenciar todas as contribuições**, localize o valor pelo jogador/data/item e use **Editar** ou **Excluir → Confirmar exclusão**. A lista não esconde lançamentos antigos. Os mesmos registros ficam visíveis em **Contribuições** dentro do cartão de cada jogador.
5. Reorganize os jogadores pendentes em **Ordem de recebimento** quando necessário; jogadores já equipados ficam travados para preservar o histórico.
6. Para adiantar parte da Adena, clique em **Reward parcial** no cartão do jogador, informe o valor (`200k`, por exemplo) e confirme. Se o reward for maior que a contribuição individual, o saldo fica negativo e as próximas contribuições quitam essa dívida. Para desfazer um reward incorreto, use **Excluir → Confirmar exclusão** no mesmo cartão; a Adena volta ao caixa e a operação fica na auditoria.
7. Quando o caixa cobrir o item, confirme a entrega ao próximo da fila.
   Para avançar mantendo o histórico, use **Encerrar e iniciar próxima rodada**; a anterior deixa de aceitar alterações e a nova vira o objetivo ativo.
8. Registre drops cristalizados ou escolha quem manteve o item.
9. Ao registrar um drop, escolha **D-Grade** ou **C-Grade** e informe a quantidade. O sistema divide ou cria a dívida apenas nessa grade.
10. Na tela **Cristais & Drops**, cada cartão mostra os saldos C e D separadamente. Cada saldo positivo possui sua própria **Confirmar entrega**; um clique registra a entrega total daquela grade e grava a operação no histórico.
11. Para itens vendidos, crie o anúncio em **Colocar item na loja** informando a quantidade e o preço de cada unidade. O painel mostra a conta completa antes de registrar (por exemplo, `2 × 30k = 60k Adena`) e repete o total no botão **Confirmar venda**. Ajuste o preço no cartão enquanto necessário e confirme somente quando a loja vender; o total do lote é então dividido entre os cinco. Se desistir da venda, use **Excluir anúncio**. Para cristalizar, use **Cristalizar**, escolha C ou D, digite o total e confirme; o anúncio sai da loja e os cristais entram na conta da grade escolhida.
