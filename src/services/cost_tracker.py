"""Cost tracking service for API usage monitoring."""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional


logger = logging.getLogger(__name__)


class ServiceType(str, Enum):
    """Types of services being tracked."""

    SUNO = "suno"
    OPENAI = "openai"
    TELEGRAM = "telegram"
    STORAGE = "storage"
    BANDWIDTH = "bandwidth"


@dataclass
class UsageRecord:
    """Single usage record."""

    service: ServiceType
    operation: str
    units: float
    cost: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: dict = field(default_factory=dict)


@dataclass
class ServicePricing:
    """Pricing configuration for a service."""

    service: ServiceType
    unit_name: str
    cost_per_unit: float
    free_tier_units: float = 0.0
    monthly_budget: Optional[float] = None


@dataclass
class UsageSummary:
    """Usage summary for a time period."""

    service: ServiceType
    total_units: float
    total_cost: float
    operation_counts: dict[str, int]
    period_start: datetime
    period_end: datetime


class CostTracker:
    """Tracks API usage costs across services."""

    # Default pricing (as of late 2024, update as needed)
    DEFAULT_PRICING = {
        ServiceType.SUNO: ServicePricing(
            service=ServiceType.SUNO,
            unit_name="generation",
            cost_per_unit=0.05,  # Estimated per song
            free_tier_units=50,
            monthly_budget=100.0,
        ),
        ServiceType.OPENAI: ServicePricing(
            service=ServiceType.OPENAI,
            unit_name="1K tokens",
            cost_per_unit=0.002,  # GPT-3.5-turbo
            free_tier_units=0,
            monthly_budget=50.0,
        ),
        ServiceType.TELEGRAM: ServicePricing(
            service=ServiceType.TELEGRAM,
            unit_name="message",
            cost_per_unit=0.0,  # Free
            free_tier_units=float("inf"),
        ),
        ServiceType.STORAGE: ServicePricing(
            service=ServiceType.STORAGE,
            unit_name="GB",
            cost_per_unit=0.023,  # S3 standard
            free_tier_units=5,
            monthly_budget=20.0,
        ),
        ServiceType.BANDWIDTH: ServicePricing(
            service=ServiceType.BANDWIDTH,
            unit_name="GB",
            cost_per_unit=0.09,  # AWS data transfer
            free_tier_units=100,
            monthly_budget=50.0,
        ),
    }

    def __init__(self, pricing: Optional[dict[ServiceType, ServicePricing]] = None):
        self.pricing = pricing or self.DEFAULT_PRICING
        self._records: list[UsageRecord] = []
        self._alerts_sent: set[str] = set()

    def record_usage(
        self,
        service: ServiceType,
        operation: str,
        units: float = 1.0,
        metadata: Optional[dict] = None,
    ) -> UsageRecord:
        """
        Record a usage event.

        Args:
            service: Service type
            operation: Operation name (e.g., "generate", "chat", "upload")
            units: Number of units consumed
            metadata: Additional metadata

        Returns:
            Created usage record
        """
        pricing = self.pricing.get(service)
        cost = 0.0

        if pricing:
            # Calculate cost considering free tier
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
            month_usage = self.get_usage_for_period(service, month_start)

            billable_units = max(0, month_usage + units - pricing.free_tier_units)
            new_billable = min(units, billable_units)
            cost = new_billable * pricing.cost_per_unit

        record = UsageRecord(
            service=service,
            operation=operation,
            units=units,
            cost=cost,
            metadata=metadata or {},
        )

        self._records.append(record)
        logger.debug(
            f"Recorded usage: {service.value}/{operation} - {units} units, ${cost:.4f}"
        )

        # Check budget alerts
        self._check_budget_alerts(service)

        return record

    def get_usage_for_period(
        self,
        service: ServiceType,
        start: datetime,
        end: Optional[datetime] = None,
    ) -> float:
        """Get total units used for a service in a time period."""
        end = end or datetime.utcnow()
        return sum(
            r.units
            for r in self._records
            if r.service == service and start <= r.timestamp <= end
        )

    def get_cost_for_period(
        self,
        service: Optional[ServiceType] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> float:
        """Get total cost for a time period."""
        start = start or datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        end = end or datetime.utcnow()

        return sum(
            r.cost
            for r in self._records
            if start <= r.timestamp <= end and (service is None or r.service == service)
        )

    def get_summary(
        self,
        service: ServiceType,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> UsageSummary:
        """Get usage summary for a service."""
        start = start or datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        end = end or datetime.utcnow()

        records = [
            r
            for r in self._records
            if r.service == service and start <= r.timestamp <= end
        ]

        operation_counts: dict[str, int] = {}
        for r in records:
            operation_counts[r.operation] = operation_counts.get(r.operation, 0) + 1

        return UsageSummary(
            service=service,
            total_units=sum(r.units for r in records),
            total_cost=sum(r.cost for r in records),
            operation_counts=operation_counts,
            period_start=start,
            period_end=end,
        )

    def get_all_summaries(
        self,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> dict[ServiceType, UsageSummary]:
        """Get summaries for all services."""
        return {
            service: self.get_summary(service, start, end) for service in ServiceType
        }

    def get_monthly_report(self) -> dict:
        """Generate monthly cost report."""
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        summaries = self.get_all_summaries(start=month_start)

        report = {
            "period": {
                "start": month_start.isoformat(),
                "end": datetime.utcnow().isoformat(),
            },
            "total_cost": sum(s.total_cost for s in summaries.values()),
            "services": {},
            "budget_status": {},
        }

        for service, summary in summaries.items():
            pricing = self.pricing.get(service)
            report["services"][service.value] = {
                "units": summary.total_units,
                "cost": summary.total_cost,
                "operations": summary.operation_counts,
            }

            if pricing and pricing.monthly_budget:
                budget_used = (summary.total_cost / pricing.monthly_budget) * 100
                report["budget_status"][service.value] = {
                    "budget": pricing.monthly_budget,
                    "used": summary.total_cost,
                    "percent_used": budget_used,
                    "remaining": pricing.monthly_budget - summary.total_cost,
                }

        return report

    def _check_budget_alerts(self, service: ServiceType) -> None:
        """Check and send budget alerts."""
        pricing = self.pricing.get(service)
        if not pricing or not pricing.monthly_budget:
            return

        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        month_cost = self.get_cost_for_period(service, month_start)
        percent_used = (month_cost / pricing.monthly_budget) * 100

        thresholds = [50, 75, 90, 100]
        for threshold in thresholds:
            alert_key = f"{service.value}_{threshold}_{month_start.strftime('%Y%m')}"
            if percent_used >= threshold and alert_key not in self._alerts_sent:
                self._alerts_sent.add(alert_key)
                logger.warning(
                    f"Budget alert: {service.value} has used {percent_used:.1f}% "
                    f"of monthly budget (${month_cost:.2f}/${pricing.monthly_budget:.2f})"
                )

    def estimate_monthly_cost(self, service: ServiceType) -> float:
        """Estimate end-of-month cost based on current usage rate."""
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0)
        days_elapsed = (now - month_start).days + 1
        days_in_month = 30  # Approximation

        current_cost = self.get_cost_for_period(service, month_start)
        daily_rate = current_cost / days_elapsed
        return daily_rate * days_in_month

    def clear_old_records(self, days: int = 90) -> int:
        """Clear records older than specified days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        original_count = len(self._records)
        self._records = [r for r in self._records if r.timestamp >= cutoff]
        removed = original_count - len(self._records)
        logger.info(f"Cleared {removed} old usage records")
        return removed


# Singleton instance
_cost_tracker: Optional[CostTracker] = None


def get_cost_tracker() -> CostTracker:
    """Get the cost tracker singleton."""
    global _cost_tracker
    if _cost_tracker is None:
        _cost_tracker = CostTracker()
    return _cost_tracker


# Convenience decorators
def track_suno_usage(func):
    """Decorator to track Suno API usage."""

    async def wrapper(*args, **kwargs):
        result = await func(*args, **kwargs)
        get_cost_tracker().record_usage(
            ServiceType.SUNO,
            "generate",
            units=1,
            metadata={"function": func.__name__},
        )
        return result

    return wrapper


def track_openai_usage(tokens: int):
    """Record OpenAI token usage."""
    get_cost_tracker().record_usage(
        ServiceType.OPENAI,
        "completion",
        units=tokens / 1000,
        metadata={"tokens": tokens},
    )
