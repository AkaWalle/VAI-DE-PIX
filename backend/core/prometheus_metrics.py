"""
Métricas Prometheus para observabilidade.
Exportadas em GET /metrics para coleta por Prometheus.
"""
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# Duração do cálculo de insights (histograma em segundos)
insights_compute_duration_seconds = Histogram(
    "insights_compute_duration_seconds",
    "Duração do cálculo de insights em segundos",
    ["source"],  # api | job | api_incremental_category | api_incremental_goals | job_incremental_*
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
)

# Cache: hits e misses para calcular ratio (insights_cache_hit_ratio = hits / (hits + misses))
insights_cache_hits_total = Counter(
    "insights_cache_hits_total",
    "Total de respostas de insights servidas a partir do cache (sem recálculo)",
)
insights_cache_misses_total = Counter(
    "insights_cache_misses_total",
    "Total de recálculos de insights (cache ausente, expirado ou entidade alterada)",
)

# Erros durante cálculo de insights
insights_errors_total = Counter(
    "insights_errors_total",
    "Total de erros ao calcular insights",
    ["source"],  # api | job
)

# Trilha 7 — Jobs: locking e duração
job_lock_acquired_total = Counter(
    "job_lock_acquired_total",
    "Total de vezes que o lock do job foi adquirido (1 execução por vez)",
    ["job_name"],
)
job_lock_contended_total = Counter(
    "job_lock_contended_total",
    "Total de vezes que o lock do job estava ocupado (outro worker executando)",
    ["job_name"],
)
job_duration_seconds = Histogram(
    "job_duration_seconds",
    "Duração total do job em segundos",
    ["job_name"],
    buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0),
)
job_failures_total = Counter(
    "job_failures_total",
    "Total de falhas (exceção) em jobs",
    ["job_name"],
)


def get_metrics_content():
    """Retorna o corpo da resposta para GET /metrics (formato Prometheus)."""
    return generate_latest()


def get_metrics_content_type():
    """Retorna o Content-Type para a resposta /metrics."""
    return CONTENT_TYPE_LATEST
