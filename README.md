# Agenda de eventos — App Inatel

Projeto de Interface Homem-máquina, Engenharia de Software — Inatel.

**Gabriel Filhagosa Guimaraes · Matrícula 126**  
Professor Raphael Pereira

## Acessar

Interface: **https://gabrielguimaraes12.github.io/S05-TurmaA/**

[Documentação completa em PDF](documentacao/projeto-final.pdf)

## Funcionalidade

A sexta aba **Eventos** permite buscar atividades, combinar categoria e período, consultar detalhes e configurar um lembrete. É possível conferir, editar e excluir lembretes, que ficam salvos no navegador. As outras abas mantêm o contexto de navegação do aplicativo com dados ilustrativos.

O percurso principal começa em Eventos: buscar ou filtrar → abrir evento → criar lembrete → escolher antecedência → salvar → conferir confirmação. Menu → Meus lembretes permite consultar os registros salvos.

## Executar localmente

Não há dependências de instalação ou etapa de build. Sirva a pasta por HTTP, por exemplo:

```sh
python -m http.server 8080
```

Abra `http://localhost:8080`. Para testar as regras de negócio, use Node.js 20 ou superior:

```sh
npm test
```

## Organização

- `index.html`: estrutura inicial e acessibilidade.
- `assets/style.css`: layout mobile e identidade visual.
- `assets/app.mjs`: telas, navegação e feedback.
- `assets/core.mjs`: filtros, datas e persistência dos lembretes.
- `tests/core.test.mjs`: testes das regras de negócio.
- `documentacao/`: PDF final e documentos de planejamento.

## Escopo da demonstração

Eventos e dados acadêmicos são fictícios. Não há conexão com sistemas institucionais, autenticação real, inscrição ou notificação push. O salvamento simula o agendamento e confirma o registro local; limpar os dados do navegador remove os lembretes. As datas dos eventos são geradas na primeira visita; quando toda a agenda expira, novos eventos futuros são criados. Datas e horários são exibidos no fuso do dispositivo.

O visual segue as referências do aplicativo: cabeçalho azul, fundo preto, listas com divisórias e navegação inferior fixa. O projeto é acadêmico e não é uma versão oficial do aplicativo.
