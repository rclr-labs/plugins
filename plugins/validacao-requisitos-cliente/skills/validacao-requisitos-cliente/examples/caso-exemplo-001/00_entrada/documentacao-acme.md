# Documentação do sistema ACME (trecho relevante)

> ⚠️ EXEMPLO SINTÉTICO.

## Módulo Contratos
- Entidades: `Contrato`, `Servico`, `JanelaAtendimento`, `EventoAtendimento`, `SlaSnapshot`.
- Cada contrato pode ter N serviços; o SLA é definido por **serviço**, com janela de atendimento (dias e horários) própria.
- **Contratos anteriores a 2019 podem não ter `JanelaAtendimento` cadastrada** (estimativa da base: ~18% dos contratos ativos). Nesses casos o cálculo de SLA daquele serviço é ignorado pelo job.

## Cálculo de SLA
- Job noturno `calc_sla` executa às **03:00** e grava um snapshot diário em `SlaSnapshot`.
- Não há cálculo sob demanda: qualquer tela/relatório mostra o snapshot **de até 24h atrás**.
- Janela de atendimento considera dias úteis, mas **não considera feriados** (limitação conhecida, sem previsão de correção).

## Tela "Painel SLA" (existente desde 2021)
- Filtra por contrato e período, mostra percentual de cumprimento por serviço.
- **Uso muito baixo** (não há telemetria de acesso; a percepção do time é de abandono).
- Não exporta.

## Relatório Mensal de Conformidade (RMC)
- Gerado pelo time de Compliance no **dia 5 de cada mês** e **enviado ao cliente**.
- Consome diretamente `SlaSnapshot` para apurar o cumprimento.
- A **cláusula 7.2** dos contratos prevê **multa** por descumprimento de SLA. O RMC é a evidência usada em disputa contratual.
- ⚠️ Qualquer mudança na forma de calcular/agregar o SLA afeta o RMC e, portanto, tem efeito contratual.

## Exportação e e-mail
- Exportação atual (CSV) é limitada a **50.000 linhas**; acima disso o job é abortado.
- E-mail corporativo limita anexo a **20 MB**.
- Não existe envio automático de relatórios agendados hoje.

## Permissões
- Perfil `GestorContrato` vê **apenas os contratos da própria carteira**.
- Perfil `Administrador` vê todos.
- Um gerente pode ter mais de uma carteira; a carteira é atribuída por `responsavel_id`.

## Dados e privacidade
- `EventoAtendimento` tem campo livre `descricao` que frequentemente contém **nome e CPF do solicitante** (dado pessoal).
- Política interna: envio de dado pessoal para fora da plataforma exige avaliação de privacidade.

## Operação
- Deploy é **mensal**, janela terça-feira 22h. Não há feature flag habilitada no módulo.
- Não há monitoramento do job `calc_sla`; falha é percebida quando alguém reclama.
