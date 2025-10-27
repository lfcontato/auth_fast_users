Arquivo: HOWTOUSE_TOOLS.md
Resumo: Exemplos de consumo de rotas de Tools (PATs) para integrações externas.

Manutenção: mantenha estes exemplos alinhados com TOOLS.md e com o backend. Não incluir checklists aqui.

# Exemplos

Criar PAT
```
curl -X POST http://localhost:8080/tools/pat \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"ci-token","scopes":["read","write"],"expires_in":"30d"}'
```

Listar PATs
```
curl http://localhost:8080/tools/pat \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

Revogar PAT
```
curl -X DELETE http://localhost:8080/tools/pat/<ID> \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

