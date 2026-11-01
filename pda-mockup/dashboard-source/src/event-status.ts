export type TrafficColor = "green" | "yellow" | "red" | "neutral";

export type OperationalEvent = {
  deadline: string | null;
  transmittedAt?: string;
  warningHours: number;
  confirmed?: boolean;
  manual?: boolean;
  source?: string;
};

export type EventPresentation = {
  color: TrafficColor;
  executed: boolean;
  stateLabel: string;
  timingLabel: string;
  detail: string;
};

export type EventContext = {
  hasAgent: boolean;
  vesselStatus: string;
  staleEstimate: boolean;
  event: OperationalEvent;
  now?: Date;
};

export const DEMO_NOW = new Date("2026-08-05T10:30:00-05:00");

export function evaluateEvent({
  hasAgent,
  vesselStatus,
  staleEstimate,
  event,
  now = DEMO_NOW,
}: EventContext): EventPresentation {
  if (!hasAgent) {
    return {
      color: "neutral",
      executed: false,
      stateLabel: "Sin semáforo",
      timingLabel: "Sin agente marítimo",
      detail: "No se calcula color hasta contar con agente marítimo asignado.",
    };
  }

  const isConfirmedTransmission = Boolean(
    event.transmittedAt && event.confirmed !== false,
  );

  if (vesselStatus === "En operación" && !staleEstimate) {
    return {
      color: "green",
      executed: isConfirmedTransmission,
      stateLabel: isConfirmedTransmission ? "Ejecutado" : "Pendiente",
      timingLabel: "Nave en operación",
      detail: isConfirmedTransmission
        ? "Evento ejecutado. Nave en operación sin estimados desactualizados."
        : "Pendiente sin alerta: nave en operación y estimados vigentes.",
    };
  }

  if (isConfirmedTransmission && event.transmittedAt) {
    const onTime =
      !event.deadline || new Date(event.transmittedAt) <= new Date(event.deadline);
    return {
      color: onTime ? "green" : "red",
      executed: true,
      stateLabel: "Ejecutado",
      timingLabel: onTime ? "Dentro del plazo" : "Fuera del plazo",
      detail: onTime
        ? "Transmisión confirmada antes de la fecha límite."
        : "Transmisión confirmada después de la fecha límite.",
    };
  }

  if (!event.deadline) {
    return {
      color: "neutral",
      executed: false,
      stateLabel: "Pendiente",
      timingLabel: "Sin fecha base",
      detail: "No existe fecha suficiente para calcular el plazo.",
    };
  }

  const hoursToDeadline =
    (new Date(event.deadline).getTime() - now.getTime()) / 3_600_000;
  const isDraft = Boolean(event.transmittedAt && event.confirmed === false);

  if (hoursToDeadline < 0) {
    return {
      color: "red",
      executed: false,
      stateLabel: isDraft ? "Registro sin confirmar" : "Pendiente",
      timingLabel: "Vencido",
      detail: isDraft
        ? "Existe un registro manual, pero falta confirmación y el plazo venció."
        : "No existe transmisión confirmada y la fecha límite ya pasó.",
    };
  }

  if (hoursToDeadline <= event.warningHours) {
    return {
      color: "yellow",
      executed: false,
      stateLabel: isDraft ? "Registro sin confirmar" : "Pendiente",
      timingLabel: "Próximo a vencer",
      detail: isDraft
        ? "Registro manual guardado sin confirmar dentro de la ventana de riesgo."
        : "Sin transmisión confirmada y dentro de la ventana de riesgo.",
    };
  }

  return {
    color: "green",
    executed: false,
    stateLabel: isDraft ? "Registro sin confirmar" : "Pendiente",
    timingLabel: "Con holgura",
    detail: isDraft
      ? "Registro manual guardado sin confirmar; aún existe holgura."
      : "Sin transmisión confirmada; aún existe tiempo suficiente.",
  };
}
