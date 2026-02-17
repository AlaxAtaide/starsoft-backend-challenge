# Sistema Distribuído de Venda de Ingressos – NestJS

## Visão Geral

Este projeto implementa um sistema distribuído de venda de ingressos para uma rede de cinemas, com foco em:

- Controle rigoroso de concorrência
- Garantia de que nenhum assento seja vendido duas vezes
- Reservas temporárias com expiração automática
- Confirmação de pagamento transacional
- Publicação de eventos via mensageria
- Logging estruturado

A solução foi desenvolvida utilizando NestJS, PostgreSQL, RabbitMQ e Docker Compose.

---

## Tecnologias Escolhidas

### NestJS
Framework estruturado que favorece modularização, injeção de dependência e separação clara de responsabilidades.

### PostgreSQL
Escolhido por:
- Forte consistência transacional (ACID)
- Suporte robusto a locks pessimistas
- Excelente controle de concorrência

O banco atua como coordenador distribuído entre múltiplas instâncias da aplicação.

### RabbitMQ
Utilizado para comunicação assíncrona entre componentes.
- Exchange do tipo `topic`
- Mensagens persistentes
- Filas duráveis
- Acknowledgement manual

### Redis
Provisionado no Docker Compose.
Pode ser utilizado futuramente para:
- Cache de disponibilidade
- Rate limiting
- Locks distribuídos adicionais

---

## Como Executar (Docker)

### Pré-requisitos
- Docker
- Docker Compose

### Subir ambiente

```bash
docker-compose up --build
```

Serviços disponíveis:

- API: http://localhost:3000
- Swagger: http://localhost:3000/api-docs
- RabbitMQ UI: http://localhost:15672 (guest/guest)

---

## Popular Dados Iniciais

Não há seed automática.

Utilize o endpoint:

POST /sessions

para criar sessões manualmente via Swagger ou Postman.

---

## Endpoints Principais

### Criar Sessão
POST /sessions

Exemplo (request):
```json
{
  "movieTitle": "Filme X",
  "startsAt": "2026-02-17T19:00:00Z",
  "room": "Sala 1",
  "seatCount": 16,
  "priceCents": 2500
}
```

### Disponibilidade de Assentos
GET /sessions/:sessionId/seats

### Criar Reserva
POST /sessions/:sessionId/reservations

Exemplo (request):
```json
{
  "userId": "user-123",
  "seats": [1, 2],
  "idempotencyKey": "abc-123"
}
```

- Reserva válida por 30 segundos
- Retorna id e expiresAt
- Suporte a idempotencyKey

### Confirmar Pagamento
POST /reservations/:reservationId/confirm-payment

Exemplo (request):
```json
{
  "userId": "user-123",
  "paymentId": "pay-456"
}
```

- Valida status e expiração
- Converte reserva em venda
- Marca assentos como SOLD
- Publica evento sale.confirmed

### Consultar Reserva
GET /reservations/:reservationId

### Histórico de Compras
GET /users/:userId/purchases

---

## Estratégias de Concorrência

### Race Condition
- Uso de locks pessimistas (pessimistic_write)
- Transações atômicas
- Validação de status antes da venda

### Deadlock
- Ordenação determinística de assentos (ordem crescente)
- Retry automático para erros 40P01 e 40001

### Idempotência
- idempotencyKey por sessão
- Reenvios não geram reservas duplicadas

### Expiração Automática
- TTL padrão: 30 segundos
- Job cron executado a cada 5s
- Liberação automática de assentos

---

## Coordenação entre Múltiplas Instâncias

A coordenação distribuída é garantida pelo PostgreSQL:

- Locks de linha garantem exclusão mútua
- Transações evitam inconsistências
- Nenhum estado crítico depende apenas da memória da aplicação

---

## Eventos Publicados

- reservation.created
- reservation.expired
- seat.released
- sale.confirmed

Exchange: ticket.events (topic)

---

## Variáveis de Ambiente

Defina via Docker Compose ou `.env` (execução local):

- `DB_HOST`: host do Postgres
- `DB_PORT`: porta do Postgres (ex.: `5432`)
- `DB_USER`: usuário do banco
- `DB_PASSWORD`: senha do banco
- `DB_NAME`: nome do banco
- `RABBITMQ_URL`: URL do RabbitMQ (ex.: `amqp://rabbitmq:5672`)
- `REDIS_URL`: URL do Redis (ex.: `redis://redis:6379`)
- `RESERVATION_TTL_SECONDS`: tempo de expiração da reserva em segundos (default `30`)

Nota: `RESERVATION_TTL_SECONDS` controla em quanto tempo uma reserva `PENDING` expira caso não seja confirmada. O job de expiração roda a cada 5s para liberar assentos expirados.

---

## Logging Estruturado

Integração com nestjs-pino.

Níveis:
- DEBUG
- INFO
- WARN
- ERROR

Logs instrumentados em:
- Operações de reserva
- Confirmação de pagamento
- Job de expiração
- Publisher/Consumer RabbitMQ

---

## Estrutura do Banco

Entidades principais:

- Session
- Seat
- Reservation
- ReservationItem
- Sale

---

## Decisões Técnicas

- Uso de lock pessimista em vez de otimista para evitar venda dupla sob alta concorrência.
- Banco relacional como mecanismo central de coordenação.
- Retry para falhas transacionais.
- Separação clara entre Controllers, Services, Messaging e Jobs.

---

## Limitações

- Redis não utilizado para lock distribuído.
- Não há DLQ implementada.
- Testes automatizados podem ser ampliados.
- Não há métricas/observabilidade avançada.

---

## Melhorias Futuras

- Dead Letter Queue
- Retry com backoff exponencial em consumers
- Testes de concorrência automatizados
- Rate limiting por usuário/IP
- Cache de disponibilidade via Redis

---

## Fluxo de Teste

1. Criar sessão com pelo menos 16 assentos.
2. Simular dois usuários tentando reservar o mesmo assento.
3. Confirmar pagamento.
4. Verificar histórico.
5. Validar que nenhum assento foi vendido duas vezes.
