"""
Barramento de eventos internos (in-memory, sem fila externa).
Permite emitir eventos (ex.: goal_entered_risk_state, spending_spike_detected)
e registrar handlers para uso futuro (ex.: C2 notificações).
"""
from typing import Callable, Dict, List, Any

# Tipos de evento suportados
EVENT_GOAL_ENTERED_RISK_STATE = "goal_entered_risk_state"
EVENT_SPENDING_SPIKE_DETECTED = "spending_spike_detected"

# Limiar de variação (%) para considerar "spike" de gasto (ex.: 30%)
SPENDING_SPIKE_PCT_THRESHOLD = 30.0


class EventBus:
    """Barramento in-memory: registra handlers e emite eventos (síncrono)."""

    def __init__(self) -> None:
        self._handlers: Dict[str, List[Callable[[str, Dict[str, Any]], None]]] = {}

    def register(self, event_type: str, handler: Callable[[str, Dict[str, Any]], None]) -> None:
        """Registra um handler para um tipo de evento. Payload: (event_type, payload)."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def emit(self, event_type: str, payload: Dict[str, Any]) -> None:
        """Emite um evento; chama todos os handlers registrados. Falha em um handler não interrompe os demais."""
        for h in self._handlers.get(event_type, []):
            try:
                h(event_type, payload)
            except Exception:
                pass  # não propagar para não quebrar quem emitiu

    def clear(self, event_type: str | None = None) -> None:
        """Remove handlers (todos ou só do tipo). Útil para testes."""
        if event_type is None:
            self._handlers.clear()
        elif event_type in self._handlers:
            del self._handlers[event_type]


# Singleton usado pela aplicação
_event_bus: EventBus | None = None


def get_event_bus() -> EventBus:
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
    return _event_bus
