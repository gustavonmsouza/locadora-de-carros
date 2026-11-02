# Modelagem do DriveOn

Modelagem do protótipo do Laboratório 02. Os diagramas usam Mermaid para permanecerem editáveis junto ao código e documentam os fluxos e as entidades implementados no DriveOn.

## Casos de uso

```mermaid
flowchart LR
  Cliente[Cliente]
  Empresa[Agente de empresa]
  Banco[Agente de banco]
  Sistema((DriveOn))
  Cliente -->|Cadastrar-se / entrar| Sistema
  Cliente -->|Consultar frota e detalhes| Sistema
  Cliente -->|Criar, consultar, editar e cancelar pedido| Sistema
  Cliente -->|Consultar e editar perfil| Sistema
  Cliente -->|Excluir conta| Sistema
  Empresa -->|Consultar e modificar pedidos| Sistema
  Empresa -->|Consultar dados financeiros| Sistema
  Empresa -->|Avaliar pedido e registrar parecer| Sistema
  Empresa -->|Executar pedido aprovado| Sistema
  Banco -->|Consultar e modificar pedidos| Sistema
  Banco -->|Consultar dados financeiros| Sistema
  Banco -->|Avaliar pedido e registrar parecer| Sistema
  Banco -->|Conceder crédito solicitado| Sistema
  Banco -->|Executar pedido aprovado| Sistema
```

## Histórias do usuário

- Como cliente, quero criar uma conta com meus dados de identificação e até três fontes de renda para solicitar aluguéis.
- Como cliente, quero pesquisar veículos, informar um período e acompanhar o status do meu pedido.
- Como cliente, quero editar ou cancelar pedidos ainda em análise e atualizar ou excluir meu cadastro.
- Como agente de empresa ou banco, quero consultar os dados do cliente e avaliar o pedido com um parecer para registrar uma decisão financeira.
- Como agente de empresa ou banco, quero ajustar o veículo, o período e o banco solicitado de um pedido em aberto para corrigir seus dados antes da análise.
- Como agente bancário, quero conceder o crédito solicitado para que ele conste no contrato executado.
- Como agente, quero executar um pedido aprovado e gerar um contrato associado ao veículo, cliente e período.

## Diagrama de classes

```mermaid
classDiagram
  class Usuario {
    +id
    +nome
    +email
    +senha
    +tipo
  }
  class Cliente {
    +id
    +usuarioId
    +nome
    +cpf
    +rg
    +endereco
    +profissao
    +rendimentos[0..3]
  }
  class Rendimento {
    +empregador
    +valor
  }
  class Automovel {
    +id
    +matricula
    +ano
    +marca
    +modelo
    +placa
    +proprietario
    +proprietarioId? (banco)
    +proprietarioClienteId? (cliente)
    +disponivel
  }
  class Pedido {
    +id
    +dataInicio
    +dataFim
    +status
    +parecer
    +avaliadoPor
    +bancoSolicitadoId?
    +bancoId?
    +creditoConcedidoPor?
  }
  class Contrato {
    +id
    +numero
    +dataEmissao
    +dataInicio
    +dataFim
    +status
    +proprietario
    +proprietarioId?
    +bancoId?
  }
  Usuario "1" --> "0..1" Cliente : perfil
  Cliente "1" o-- "0..3" Rendimento : declara
  Cliente "1" --> "0..*" Pedido : solicita
  Automovel "1" --> "0..*" Pedido : recebe
  Usuario "0..1" --> "0..*" Pedido : banco concedente
  Pedido "1" --> "0..1" Contrato : origina
  Automovel "1" --> "0..*" Contrato : alugado em
  Cliente "1" --> "0..*" Contrato : locatario
```

`Usuario.tipo` assume `cliente`, `empresa` ou `banco`. `Automovel.proprietario` assume `cliente`, `empresa` ou `banco`; quando o proprietário é cliente, `proprietarioClienteId` referencia o cadastro de cliente. O banco solicitado no pedido é separado do banco que efetivamente concedeu o crédito.

## Diagrama de pacotes (visão lógica)

```mermaid
flowchart TB
  subgraph Apresentacao[Apresentação - HTML e Bootstrap 5]
    Home[index.html / catálogo]
    Detalhes[detalhes.html]
    AreaCliente[cliente.html]
    AreaAgente[agente.html]
    Documento[contrato.html]
  end
  subgraph Aplicacao[Aplicação - JavaScript no navegador]
    Auth[auth.js]
    ClienteJS[cliente.js]
    AgenteJS[agente.js]
    HomeJS[home.js e details.js]
    ContratoJS[contrato.js]
    API[api.js - Fetch API e sessão]
  end
  subgraph Persistencia[Persistência simulada]
    JSONServer[JSON Server - API REST]
    DB[(db.json)]
  end
  Home --> Auth
  Home --> HomeJS
  Detalhes --> HomeJS
  AreaCliente --> ClienteJS
  AreaAgente --> AgenteJS
  Documento --> ContratoJS
  Auth --> API
  ClienteJS --> API
  AgenteJS --> API
  HomeJS --> API
  ContratoJS --> API
  API --> JSONServer
  JSONServer --> DB
```

## Diagrama de componentes

```mermaid
flowchart LR
  Navegador[Computador do cliente ou agente\nNavegador + HTML/CSS/JavaScript]
  Web[Servidor de páginas estáticas\nLive Server ou http-server]
  ApiClient[Cliente REST\nFetch API em js/api.js]
  JsonServer[JSON Server\nlocalhost:3000]
  Arquivo[(db.json)]
  Navegador -->|HTTP: páginas e recursos| Web
  Navegador --> ApiClient
  ApiClient -->|HTTP/JSON: CRUD| JsonServer
  JsonServer -->|Lê e grava| Arquivo
```

## Decisões e alinhamento com o código

- A interface está separada por fluxo: catálogo e detalhes públicos, painel do cliente, painel dos agentes e documento do contrato.
- `js/api.js` concentra chamadas Fetch, sessão local e funções comuns de apresentação; os demais scripts implementam seus respectivos fluxos.
- `db.json` contém as coleções `usuarios`, `clientes`, `automoveis`, `pedidos` e `contratos`, consumidas como recursos REST pelo JSON Server.
- `bancoSolicitadoId` registra a opção do cliente; `bancoId` junto de `creditoConcedidoPor` registra a concessão do banco.
- Agentes podem alterar veículo, período e banco solicitado enquanto o pedido estiver `Em análise` ou `Aprovado`. Toda alteração volta o pedido para `Em análise` e limpa parecer e crédito concedido para exigir nova avaliação.
- O contrato copia os dados de propriedade do automóvel. A execução altera a disponibilidade do veículo, sem confundir propriedade com crédito.
- As regras e a autenticação são demonstrativas e ficam no cliente; JSON Server não oferece autorização segura para uso em produção.
