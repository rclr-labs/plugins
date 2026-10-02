# Fatias — [NOME DO MVP]

Checklist vivo da construção. **Leia este arquivo no início de cada sessão.**

Uma fatia é um pedaço da jornada que funciona **ponta a ponta**. Nunca "o banco todo" nem "todas as telas".

Ordem fixa dentro de cada fatia:

```
migration -> model + factory -> rota -> controller -> Form Request -> view -> testes
```

Portão para fechar uma fatia (os dois, não um):
- [ ] `php artisan test` verde, com a saída mostrada
- [ ] a tela aberta no navegador, funcionando

## Fatia 1 — [nome curto]

**Entrega:** [o que a pessoa consegue fazer na tela ao final]

- [ ] migration
- [ ] model + factory
- [ ] rota
- [ ] controller
- [ ] Form Request
- [ ] view
- [ ] testes (feature + unit onde houver cálculo)
- [ ] **portão:** testes verdes + tela funcionando no navegador

## Fatia 2 — [nome curto]

**Entrega:** [...]

- [ ] migration
- [ ] model + factory
- [ ] rota
- [ ] controller
- [ ] Form Request
- [ ] view
- [ ] testes
- [ ] **portão:** testes verdes + tela funcionando no navegador

---

## Diário de sessão

Uma linha por sessão, para a próxima começar sabendo onde parou.

| Data | O que foi feito | Onde parou |
|---|---|---|
| [AAAA-MM-DD] | [fatia 1 fechada] | [próximo: fatia 2] |
