# Clara · Controle financeiro pessoal

Aplicativo em português para planejar salário, entradas, despesas, cartões e pagamentos. Tema claro/escuro com preferência salva no navegador.

## Fluxo mensal

1. Em **Meu mês**, informe o salário líquido total, incluindo adiantamentos. Informe também o dinheiro que já tinha no início do mês.
2. Em **Entradas**, registre depósitos com descrição, conta, data e situação **Já recebi** ou **Vou receber**. Escolha **Dinheiro extra** para renda além do salário, ou **Salário / adiantamento** para valores que fazem parte do salário total.
3. Em **Despesas**, cadastre luz, água, alimentação e outros gastos fora dos cartões.
4. Em **Meus cartões**, copie do banco o limite total, crédito utilizado e limite disponível de Nubank, PicPay e Santander. Informe a fatura total do mês.
5. Em **Pagamentos**, registre pagamentos totais ou parciais de despesas e faturas. Os registros também podem ser criados diretamente nas listas de despesas e cartões.

### Cálculos

- **Saldo disponível agora** = saldo inicial + entradas recebidas − pagamentos registrados. Valores previstos não entram no saldo atual.
- **Ainda falta pagar** = despesas e faturas − pagamentos registrados.
- **Reservar do salário** = valor em aberto menos o saldo atual positivo, com mínimo zero. Pressupõe usar o saldo atual para as contas; recebimentos futuros só reduzem a reserva quando confirmados.
- **Salário ainda a receber** = salário total − salário/adiantamentos já recebidos.
- **Resultado previsto do mês** = saldo inicial + salário total + extras recebidos ou previstos − despesas e faturas totais. Pagamentos e adiantamentos não são descontados ou somados duas vezes.

O salário previsto não é marcado como recebido automaticamente. Para depósitos em outro mês, selecione esse mês antes de registrar. O saldo inicial de cada mês é informado manualmente; não há transferência automática de saldos entre meses. Um saldo negativo indica que faltam entradas/saldo inicial no registro ou que os pagamentos superaram o dinheiro recebido.

Pagamentos não podem ultrapassar o total da conta. Despesas com pagamentos só podem ser excluídas depois de estornar os registros. O histórico permite **Estornar registro** para corrigir a planilha, sem efetuar ou desfazer transferências bancárias.

## Cartões e parcelas

Limite total, crédito utilizado, disponível e fatura são independentes. O app não deduz o disponível a partir da fatura nem aumenta o crédito automaticamente após um pagamento: informe os valores atualizados pelo banco. Limites e posição do crédito são compartilhados entre os meses; faturas e pagamentos pertencem ao mês selecionado.

Em **Parcelas e gastos fixos por um período**, cadastre o cartão, valor mensal, primeiro mês da previsão e quantidade de meses. Se a compra já começou, use o mês da próxima parcela e quantos meses ainda faltam. As parcelas entram automaticamente na fatura prevista durante esse prazo, e param no fim.

Ao digitar uma **fatura total** do banco, ela substitui a previsão para esse cartão/mês. As parcelas não são somadas novamente. Para retornar à previsão, marque **Usar parcelas previstas como fatura** e salve. A previsão automática inclui somente os itens cadastrados; outras compras devem ser incluídas no total informado.

Remover uma previsão altera os meses que usavam a previsão automática. Meses com pagamentos preservam o total anterior como fatura informada. Não há ligação com bancos ou pagamento real pelo aplicativo.

## Dados e migração

Os dados são armazenados em centavos inteiros no `localStorage`, apenas neste navegador. Não há login ou sincronização entre dispositivos. **Baixar backup** exporta JSON; **Restaurar backup** importa versões 2 ou 3, após confirmação, preservando uma cópia interna dos registros anteriores.

A versão 3 migra salário, limites, faturas e despesas da versão anterior sem apagar os dados antigos. Não inventa pagamentos ou recebimentos: você deve registrar os já realizados. O limite disponível antigo, que era uma estimativa, não é convertido em um valor informado pelo banco.

Limpar os dados do navegador remove o histórico. Guarde backups fora do navegador. Dados do HTML independente não são transferidos automaticamente para o endereço do site.

## Desenvolvimento

Requer Node.js 20.19+ ou 22.12+ e npm.

```sh
npm ci
npm run dev
```

## Verificação e build

```sh
npm test
npm run build
```

O build cria `dist/index.html`, assets e o arquivo independente `dist/clara.html`. `npm run preview` serve o build. O desenvolvimento usa a porta 5173. Não são necessárias credenciais ou variáveis de ambiente.

## GitHub Pages

O código-fonte fica em `main`. A publicação usa `gh-pages`, pasta raiz, com `dist/clara.html` copiado para `index.html` e `.nojekyll`. Antes de atualizar, obtenha as mudanças remotas e preserve-as; faça commit e push sem forçar. Confirme a execução de **pages build and deployment** no GitHub antes de afirmar que o site foi atualizado.
