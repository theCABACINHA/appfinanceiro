# Clara · Planilha financeira pessoal

Aplicativo simples em português para planejar o mês com salário, despesas externas e cartões de crédito.

## Como usar

1. Selecione o mês na parte superior da página.
2. Em **Meu mês**, informe e salve seu salário líquido total.
3. Em **Despesas**, adicione contas de luz, água, alimentação e outros gastos fora dos cartões. Você pode editar e excluir cada item.
4. Em **Meus cartões**, informe os limites e as faturas do Nubank, PicPay e Santander. Salve cada cartão.
5. O resumo calcula: **salário − faturas dos três cartões − despesas externas**. Se os gastos superarem o salário, mostra o valor que falta.

O limite de crédito não é renda. Compras já incluídas na fatura não devem entrar novamente nas despesas externas. O indicador de limite menos fatura é uma estimativa; parcelas futuras, juros e compras pendentes podem alterar o limite real no banco. As faturas são informadas manualmente, sem conexão com bancos.

Salário, faturas e despesas são separados por mês. Limites dos cartões são compartilhados entre os meses. A aplicação começa com valores zero, sem dados fictícios. As receitas e despesas da versão anterior são convertidas em salário total e despesas externas do respectivo mês; os dados originais ficam preservados no armazenamento antigo.

## Desenvolvimento

Requer Node.js 20.19+ ou 22.12+ e npm.

```sh
npm ci
npm run dev
```

## Verificação e compilação

```sh
npm test
npm run build
```

A compilação cria `dist/index.html`, seus assets e o arquivo independente `dist/clara.html`. `npm run preview` serve a versão compilada. O servidor de desenvolvimento usa a porta 5173.

## Publicação no GitHub Pages

O repositório usa a branch `gh-pages`, pasta raiz. O site é servido pelo `index.html` independente nessa branch. Para publicar uma atualização, compile, copie `dist/clara.html` como `index.html` na branch de publicação, mantenha `.nojekyll`, faça commit e push sem substituir alterações remotas. A branch `main` contém o código-fonte. O GitHub executa a publicação após o push; confirme o resultado em Actions.

## Dados e backup

Os dados são armazenados em centavos inteiros no `localStorage` do navegador. Não há servidor de dados, login ou sincronização entre dispositivos. Use **Baixar backup** para exportar um JSON e **Restaurar backup** para importar. A restauração requer confirmação e preserva uma cópia interna dos registros anteriores. Limpar os dados do navegador remove o histórico; guarde backups fora do navegador.

A versão HTML independente pode ser aberta em um computador, mas os dados ficam associados ao navegador e à localização do arquivo. Não são transferidos automaticamente para o endereço do site. Nenhuma credencial ou variável de ambiente é necessária.
