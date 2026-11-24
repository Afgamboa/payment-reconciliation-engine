Cada concepto del reto, con dónde se usa en el proyecto cuando aplica.

## Promises

```ts
const delay = (ms: number) =>
  new Promise<void>((resolve, reject) => {
    if (ms < 0) return reject(new RangeError('ms must be >= 0'));
    setTimeout(resolve, ms);
  });
```

`Promise.allSettled` en un lote con fallos parciales: [event-processor.service.ts](../src/processing/event-processor.service.ts) y [reconciliation.service.ts](../src/reconciliation/reconciliation.service.ts). `Promise.all` no sirve ahí porque rechaza en cuanto una promesa falla: un evento malo ocultaría el resultado de los demás y el lote quedaría sin registrar. `Promise.all` sí es adecuado cuando todas las piezas son necesarias, como en [health.controller.ts](../src/health/health.controller.ts), donde cada check ya captura su propio error.

## Concurrencia

- Límite en proceso: el lote reclamado tiene como máximo `WORKER_CONCURRENCY` eventos y no se reclama otro hasta que todos terminan.
- Entre workers: `FOR UPDATE SKIP LOCKED` en [event-queue-prisma.repository.ts](../src/processing/repository/event-queue-prisma.repository.ts); el e2e "never lets two concurrent workers claim the same event" lo verifica.

## Event loop

Operación CPU-bound que lo bloquea:

```ts
const blocking = () => {
  let hash = 0;
  for (let i = 0; i < 5e9; i++) hash = (hash + i) % 1e9;
  return hash;
};
```

Mientras corre, no se atienden webhooks ni timers. Para medirlo: `nodejs_eventloop_lag_p99_seconds` en `/api/metrics` (o `perf_hooks.monitorEventLoopDelay()`) y `node --cpu-prof dist/main.js` para ubicar la función. La solución es mover el trabajo a `worker_threads` o a otro proceso. En este proyecto el trabajo pesado es de I/O (PostgreSQL), no de CPU.

## Arrow vs function

```ts
const counter = {
  count: 0,
  regular() {
    return [1, 2].map(function () {
      return this; // undefined: una función normal define su propio `this`
    });
  },
  arrow() {
    return [1, 2].map(() => this.count++); // `this` léxico: apunta a counter
  },
};
```

Una arrow function no tiene `this` propio, por eso sirve en callbacks pero no como método de objeto ni como constructor.

## Hoisting y scope

```ts
console.log(a); // undefined: `var` se eleva inicializado
console.log(typeof declared); // 'function': la declaración se eleva completa
// console.log(b);           // ReferenceError: `let`/`const` están en la zona muerta temporal
// expressed();              // TypeError: la variable `expressed` existe pero aún es undefined
var a = 1;
let b = 2;
function declared() {}
var expressed = function () {};
```

`var` tiene scope de función; `let` y `const`, de bloque.

## unknown y narrowing

El payload guardado se lee como `unknown` y se valida antes de usarlo en [payment-status-change.parser.ts](../src/processing/payment-status-change.parser.ts).

## Generics y utility types

En [payment.repository.ts](../src/payments/interfaces/payment.repository.ts): `NewPayment = Omit<Payment, 'id' | 'updatedAt'>`, `PaymentTransition = Pick<Payment, 'status' | 'lastEventAt'>`. En [webhook.reposiroty.ts](../src/webhooks/interfaces/webhook.reposiroty.ts): `NewWebhookEvent` y `WebhookEventDetail` se derivan de `WebhookEvent`.

## Errores

[processing.errors.ts](../src/common/errors/processing.errors.ts): `PermanentError` va directo a `DEAD_LETTER`; `TransientError` y cualquier error inesperado se reintentan con backoff; los errores de validación se rechazan con `400` antes de guardar nada.
