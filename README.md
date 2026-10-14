# Clara · Finanças pessoais

Aplicativo web em português para acompanhar contas, receitas, despesas e saldo em reais. Interface responsiva com painel mensal, gráficos de seis meses, categorias, busca, filtros, edição e exclusão de transações com confirmação.

## Desenvolvimento

Requer Node.js 20.19+ ou 22.12+ e npm.

```sh
npm ci
npm run dev
```

## Verificação

```sh
npm test
npm run build
```

`npm run preview` serve a versão compilada. O servidor de desenvolvimento usa a porta 5173 por padrão.

## Abrir sem instalar ferramentas

Após a compilação, `dist/clara.html` contém o aplicativo em um único arquivo. Baixe esse arquivo e abra no Chrome, Edge ou Firefox em um computador. Não é necessário iniciar um servidor. Fontes externas são opcionais; o app funciona sem elas.

Os dados da versão em arquivo ficam associados ao navegador e à localização desse arquivo. Mantenha o arquivo no mesmo lugar e exporte seus dados regularmente. Os dados não são transferidos automaticamente da versão servida para a versão em arquivo. Para acesso por celular ou por um endereço público, é necessário hospedar a pasta `dist` em um serviço de sites estáticos.

## Dados

O aplicativo começa sem transações, com uma conta principal de saldo zero. Cadastre contas com seus saldos iniciais e registre os próximos movimentos. O saldo total considera todo o histórico; receitas e despesas do painel consideram o mês selecionado.

Os valores são armazenados em centavos inteiros. Os dados são salvos no `localStorage` deste navegador, sem servidor ou autenticação. Não há sincronização entre dispositivos. Use **Exportar meus dados** para baixar uma cópia JSON. Limpar o armazenamento do navegador remove os dados. A primeira versão permite exportação; restauração de arquivos ainda não está disponível.

A interface usa fontes do Google Fonts quando disponíveis, com fontes locais alternativas. Nenhuma credencial ou variável de ambiente é necessária.
