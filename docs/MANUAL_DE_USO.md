
# Manual Rápido de Uso - SysTulsi Caixa

Bem-vindo ao SysTulsi Caixa! Este guia rápido foi criado para ajudar você a se familiarizar com as principais funcionalidades do sistema.

---

### 1. Login no Sistema

O acesso ao sistema é dividido por funções, cada uma com suas permissões específicas.

-   **Administrador**: Tem acesso total a todas as funcionalidades, incluindo configurações, gerenciamento de usuários, relatórios e lançamentos de qualquer data.
-   **Operador**: Tem acesso restrito às funcionalidades de lançamento para o dia atual e para os turnos permitidos. Um operador precisa selecionar seu turno de trabalho ao fazer o login.

![Tela de Login](https://placehold.co/800x450.png "Tela de login com campos para usuário, senha e seleção de turno para operadores.")

---

### 2. Navegação Principal

Após o login, você verá o menu principal no topo da página:

-   **Dashboard**: Sua tela inicial. Oferece uma visão geral e consolidada dos dados do mês, com totais, gráficos de evolução e a análise de IA (para administradores).
-   **Lançamento Diário**: O coração do sistema. É aqui que você insere os dados de vendas e movimentações de cada período.
-   **Relatórios**: Uma ferramenta poderosa para analisar dados históricos, com filtros flexíveis e opções de exportação.
-   **Ajuda**: Acessa este manual a qualquer momento.

---

### 3. Fazendo um Lançamento Diário

Este é o fluxo de trabalho principal para operadores e administradores.

1.  **Selecione o Período**: Na página "Lançamento Diário", você verá vários cards (Ex: "Café da Manhã", "Almoço", "Jantar"). Clique no card correspondente ao período que deseja lançar.
2.  **Preencha os Campos**: Insira os valores de quantidade (Qtd) e/ou valor total (R$) para cada item.
    -   **Resumo Lateral**: Observe o card "SysTulsi Caixa" no lado direito da tela. Ele se atualiza em tempo real, mostrando o impacto dos seus lançamentos nos totais do dia. É uma ótima ferramenta para conferir os dados enquanto os insere.
3.  **Salve o Lançamento**: Ao final do preenchimento, clique no botão **"Salvar Lançamento"** na parte inferior da página. Seus dados serão salvos com segurança.

![Tela de Lançamento](https://placehold.co/800x500.png "Tela de lançamento com os cards de período e o resumo lateral sendo atualizado em tempo real.")

---

### 4. Entendendo o Dashboard

O Dashboard é sua central de inteligência de negócios.

-   **Filtro de Mês (Apenas Administradores)**: Administradores podem selecionar o mês e o ano para visualizar dados retroativos.
-   **Análise com IA (Apenas Administradores)**: Clique em **"Gerar Análise"** para que a IA analise os dados do mês e forneça insights sobre destaques, oportunidades e pontos de atenção.
-   **Tabelas e Gráficos**:
    -   **Totais Diários**: Uma lista de todos os lançamentos do mês, com o valor total de cada dia.
    -   **Acumulativo Mensal**: A soma de todos os valores, agrupados por categoria (Ex: ROOM SERVICE, ALMOÇO, JANTAR).
    -   **Consumo Interno e Total Geral**: Tabelas que detalham os valores de consumo interno e apresentam os totais com e sem C.I.
    -   **Evolução Mensal**: Um gráfico que compara o desempenho dos últimos 3 meses.

![Dashboard Principal](https://placehold.co/800x600.png "Dashboard com os totais mensais, gráficos de evolução e a análise de IA.")

---

### 5. Gerando Relatórios

A página de Relatórios permite uma análise profunda dos dados. É uma ferramenta interativa para explorar seus registros de vendas.

1.  **Use a Barra de Ferramentas de Filtros**:
    -   **Tipo de Filtro**: Escolha como você quer ver os dados:
        -   `Por Período (dentro do Mês)`: Ideal para focar em um serviço específico (ex: todos os Jantares de Julho).
        -   `Geral (Mês Inteiro)`: Visão consolidada de todos os períodos do mês selecionado.
        -   `Por Intervalo de Datas`: Análise personalizada entre duas datas.
        -   `Por Data Específica`: Detalhes completos de um único dia.
    -   **Filtros Adicionais**: Selecione o período, mês, ano ou intervalo de datas conforme o tipo de filtro escolhido.

2.  **Explore a Visualização Dinâmica**:
    -   **Visão por Período**: Ao focar em um período como "Almoço", a tela mostrará abas para cada subcategoria (Room Service, Mesa, Delivery, etc.), permitindo uma análise detalhada. Um gráfico de barras também mostrará a evolução diária da categoria selecionada na aba.
    -   **Visão Geral**: Mostra uma tabela completa com os totais diários de todos os períodos.

3.  **Exporte os Dados**: Após aplicar os filtros, você pode exportar a visualização atual para **PDF** (ideal para impressão e compartilhamento) ou **Excel** (ideal para análises mais profundas em planilhas). O arquivo exportado refletirá exatamente os dados que você está vendo na tela.

![Página de Relatórios](https://placehold.co/800x400.png "Página de relatórios com filtros por data, período e opções de exportação.")

---

### 6. Configurações (Apenas Administradores)

A área de configurações, acessível pelo menu do seu perfil, permite personalizar o sistema.

-   **Perfil & Operadores**: Crie, edite e remova contas de usuários (operadores e administradores).
-   **Visibilidade**: Controle quais cards e itens aparecem nas telas de Lançamento e no Dashboard.
-   **Modelos de Dados e Importação**: Baixe planilhas modelo e importe dados em massa, ideal para migrar registros antigos.
-   **Preços Unitários**: Configure preços fixos para determinados itens, automatizando o cálculo do valor total.
-   **Banco de Dados**: Configure a conexão com um banco de dados MySQL para um armazenamento mais robusto.

Se tiver qualquer dúvida, explore as seções e lembre-se que este manual está sempre a um clique de distância!
