import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_NOW, evaluateEvent, type OperationalEvent } from "../src/event-status.ts";

const pendingEvent = (
  deadline: string | null,
  warningHours = 6,
): OperationalEvent => ({ deadline, warningHours });

test("pending event uses deadline to calculate green, yellow and red", () => {
  const base = {
    hasAgent: true,
    vesselStatus: "Atracada",
    staleEstimate: false,
    now: DEMO_NOW,
  };

  const green = evaluateEvent({
    ...base,
    event: pendingEvent("2026-08-06T10:30:00-05:00", 6),
  });
  const yellow = evaluateEvent({
    ...base,
    event: pendingEvent("2026-08-05T14:30:00-05:00", 6),
  });
  const red = evaluateEvent({
    ...base,
    event: pendingEvent("2026-08-05T09:30:00-05:00", 6),
  });

  assert.deepEqual(
    [green.color, yellow.color, red.color],
    ["green", "yellow", "red"],
  );
  assert.equal(green.executed, false);
  assert.equal(red.stateLabel, "Pendiente");
});

test("confirmed transmission is green on time and red when late", () => {
  const context = {
    hasAgent: true,
    vesselStatus: "Atracada",
    staleEstimate: false,
    now: DEMO_NOW,
  };
  const deadline = "2026-08-05T09:00:00-05:00";
  const onTime = evaluateEvent({
    ...context,
    event: {
      deadline,
      transmittedAt: "2026-08-05T08:45:00-05:00",
      confirmed: true,
      warningHours: 1,
    },
  });
  const late = evaluateEvent({
    ...context,
    event: {
      deadline,
      transmittedAt: "2026-08-05T09:20:00-05:00",
      confirmed: true,
      warningHours: 1,
    },
  });

  assert.deepEqual(
    [onTime.color, late.color],
    ["green", "red"],
  );
  assert.equal(onTime.executed, true);
  assert.equal(late.executed, true);
});

test("no-agent vessel suppresses semaphore colors", () => {
  const result = evaluateEvent({
    hasAgent: false,
    vesselStatus: "En puerto",
    staleEstimate: false,
    event: pendingEvent("2026-08-05T09:00:00-05:00"),
  });

  assert.equal(result.color, "neutral");
  assert.equal(result.timingLabel, "Sin agente marítimo");
});

test("operating vessel remains green unless estimate is stale", () => {
  const overdue = pendingEvent("2026-08-05T08:00:00-05:00");
  const currentEstimate = evaluateEvent({
    hasAgent: true,
    vesselStatus: "En operación",
    staleEstimate: false,
    event: overdue,
  });
  const staleEstimate = evaluateEvent({
    hasAgent: true,
    vesselStatus: "En operación",
    staleEstimate: true,
    event: overdue,
  });

  assert.equal(currentEstimate.color, "green");
  assert.equal(staleEstimate.color, "red");
});
