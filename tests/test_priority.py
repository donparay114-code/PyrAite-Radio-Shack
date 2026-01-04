"""
Test suite for RadioQueue priority calculation system.

Tests cover:
- Base priority calculation
- Upvote/downvote effects
- User reputation influence
- Priority boost mechanics
- Time decay after 1 hour
- Edge cases and boundary conditions
"""

from datetime import datetime, timedelta
from unittest.mock import patch

import pytest

from src.models.queue import QueueStatus, RadioQueue


class TestPriorityCalculation:
    """Test RadioQueue priority calculation methods."""

    @pytest.fixture
    def base_queue_item(self):
        """Create a basic queue item for testing."""
        item = RadioQueue(
            original_prompt="Test song",
            base_priority=100.0,
            upvotes=0,
            downvotes=0,
            is_priority_boost=False,
            requested_at=datetime.utcnow(),
        )
        return item

    # Base Priority Tests
    def test_calculate_priority_base_only(self, base_queue_item):
        """Test priority calculation with only base priority."""
        priority = base_queue_item.calculate_priority(user_reputation=0)
        assert priority == 100.0, "Base priority should be 100 with no other factors"

    def test_calculate_priority_with_base_variations(self):
        """Test different base priority values."""
        test_cases = [
            (50.0, 50.0),
            (100.0, 100.0),
            (150.0, 150.0),
        ]

        for base_priority, expected in test_cases:
            item = RadioQueue(
                original_prompt="Test",
                base_priority=base_priority,
                upvotes=0,
                downvotes=0,
                is_priority_boost=False,
                requested_at=datetime.utcnow(),
            )
            priority = item.calculate_priority(user_reputation=0)
            assert priority == expected

    # Upvote Tests
    def test_upvotes_increase_priority(self, base_queue_item):
        """Test that upvotes increase priority by 10 points each."""
        base_queue_item.upvotes = 5
        priority = base_queue_item.calculate_priority(user_reputation=0)
        # Priority = 100 + (5 * 10) = 150
        assert priority == 150.0

    def test_multiple_upvotes_linear_increase(self, base_queue_item):
        """Test that upvotes increase priority linearly."""
        test_cases = [
            (1, 110.0),  # 100 + 10
            (3, 130.0),  # 100 + 30
            (10, 200.0),  # 100 + 100
        ]

        for upvotes, expected in test_cases:
            base_queue_item.upvotes = upvotes
            priority = base_queue_item.calculate_priority(user_reputation=0)
            assert priority == expected

    # Downvote Tests
    def test_downvotes_decrease_priority(self, base_queue_item):
        """Test that downvotes decrease priority by 5 points each."""
        base_queue_item.downvotes = 4
        priority = base_queue_item.calculate_priority(user_reputation=0)
        # Priority = 100 - (4 * 5) = 80
        assert priority == 80.0

    def test_multiple_downvotes_linear_decrease(self, base_queue_item):
        """Test that downvotes decrease priority linearly."""
        test_cases = [
            (1, 95.0),  # 100 - 5
            (2, 90.0),  # 100 - 10
            (5, 75.0),  # 100 - 25
        ]

        for downvotes, expected in test_cases:
            base_queue_item.downvotes = downvotes
            priority = base_queue_item.calculate_priority(user_reputation=0)
            assert priority == expected

    def test_priority_cannot_go_negative(self, base_queue_item):
        """Test that priority is clamped at 0."""
        base_queue_item.downvotes = 100  # Would be 100 - 500 = -400
        priority = base_queue_item.calculate_priority(user_reputation=0)
        assert priority >= 0.0

    # Combined Votes Tests
    def test_upvotes_and_downvotes_combined(self, base_queue_item):
        """Test priority with both upvotes and downvotes."""
        base_queue_item.upvotes = 5  # +50
        base_queue_item.downvotes = 3  # -15
        priority = base_queue_item.calculate_priority(user_reputation=0)
        # Priority = 100 + 50 - 15 = 135
        assert priority == 135.0

    # Reputation Tests
    def test_reputation_affects_priority(self, base_queue_item):
        """Test that user reputation adds to priority (0.5x multiplier)."""
        priority = base_queue_item.calculate_priority(user_reputation=100)
        # Priority = 100 + (100 * 0.5) = 150
        assert priority == 150.0

    def test_various_reputation_levels(self, base_queue_item):
        """Test different reputation levels."""
        test_cases = [
            (0, 100.0),  # 100 + 0
            (50, 125.0),  # 100 + 25
            (100, 150.0),  # 100 + 50
            (200, 200.0),  # 100 + 100
        ]

        for reputation, expected in test_cases:
            priority = base_queue_item.calculate_priority(user_reputation=reputation)
            assert priority == expected

    # Priority Boost Tests
    def test_priority_boost_adds_100(self, base_queue_item):
        """Test that priority boost adds 100 points."""
        base_queue_item.is_priority_boost = True
        priority = base_queue_item.calculate_priority(user_reputation=0)
        # Priority = 100 + 100 = 200
        assert priority == 200.0

    def test_priority_boost_with_all_factors(self, base_queue_item):
        """Test priority boost combined with all other factors."""
        base_queue_item.upvotes = 5  # +50
        base_queue_item.downvotes = 2  # -10
        base_queue_item.is_priority_boost = True  # +100
        priority = base_queue_item.calculate_priority(user_reputation=100)  # +50
        # Priority = 100 + 50 + 50 - 10 + 100 = 290
        assert priority == 290.0

    # Time Decay Tests
    def test_no_decay_within_first_hour(self, base_queue_item):
        """Test that priority doesn't decay within the first hour."""
        base_queue_item.requested_at = datetime.utcnow() - timedelta(minutes=30)
        priority = base_queue_item.calculate_priority(user_reputation=0)
        assert priority == 100.0

    def test_decay_after_one_hour(self, base_queue_item):
        """Test that priority decays after 1 hour (2 points per hour over 1)."""
        now = datetime.utcnow()
        base_queue_item.requested_at = now - timedelta(hours=2)

        with patch("src.models.queue.datetime") as mock_dt:
            mock_dt.utcnow.return_value = now
            # We need to set side_effect to behave like real datetime for other attributes if needed,
            # but here only utcnow is used.
            # Ideally we should mock the whole class but return_value for methods.
            # However, since we imported datetime, mock_dt replaces the class.

            priority = base_queue_item.calculate_priority(user_reputation=0)

        # Priority = 100 - (2-1) * 2 = 100 - 2 = 98
        assert priority == 98.0

    def test_decay_multiple_hours(self, base_queue_item):
        """Test priority decay over multiple hours."""
        test_cases = [
            (timedelta(hours=3), 96.0),  # 100 - 2*2 = 96
            (timedelta(hours=5), 92.0),  # 100 - 4*2 = 92
            (timedelta(hours=10), 82.0),  # 100 - 9*2 = 82
        ]

        now = datetime.utcnow()
        with patch("src.models.queue.datetime") as mock_dt:
            mock_dt.utcnow.return_value = now
            for time_delta, expected in test_cases:
                base_queue_item.requested_at = now - time_delta
                priority = base_queue_item.calculate_priority(user_reputation=0)
                assert priority == expected

    # Update Priority Method Tests
    def test_update_priority_method(self, base_queue_item):
        """Test that update_priority correctly updates the priority field."""
        base_queue_item.upvotes = 5
        base_queue_item.update_priority(user_reputation=50)
        # Priority = 100 + 50 + 25 = 175
        assert base_queue_item.priority_score == 175.0

    def test_update_priority_idempotent(self, base_queue_item):
        """Test that calling update_priority twice gives same result."""
        base_queue_item.update_priority(user_reputation=50)
        first_priority = base_queue_item.priority_score

        base_queue_item.update_priority(user_reputation=50)
        second_priority = base_queue_item.priority_score

        assert first_priority == second_priority

    # Edge Cases
    def test_maximum_priority_scenario(self, base_queue_item):
        """Test maximum possible priority scenario."""
        base_queue_item.base_priority = 100.0
        base_queue_item.upvotes = 50
        base_queue_item.is_priority_boost = True
        priority = base_queue_item.calculate_priority(user_reputation=1000)
        # Priority = 100 + 500 + 500 + 100 = 1200
        assert priority == 1200.0

    def test_minimum_priority_clamped_at_zero(self, base_queue_item):
        """Test minimum priority is clamped at 0."""
        base_queue_item.base_priority = 10.0
        base_queue_item.downvotes = 100
        priority = base_queue_item.calculate_priority(user_reputation=0)
        assert priority == 0.0

    def test_all_factors_combined(self, base_queue_item):
        """Test priority with all factors combined."""
        now = datetime.utcnow()
        base_queue_item.base_priority = 100.0
        base_queue_item.upvotes = 8
        base_queue_item.downvotes = 3
        base_queue_item.is_priority_boost = True
        base_queue_item.requested_at = now - timedelta(hours=3)

        with patch("src.models.queue.datetime") as mock_dt:
            mock_dt.utcnow.return_value = now
            priority = base_queue_item.calculate_priority(user_reputation=100)

        # base=100, upvotes=80, reputation=50, downvotes=-15, boost=100, decay=-4
        # Priority = 100 + 80 + 50 - 15 + 100 - 4 = 311
        assert priority == 311.0


class TestPriorityFormula:
    """Test the priority formula components individually."""

    def test_upvote_weight_is_10(self):
        """Verify upvote weight constant is 10."""
        item = RadioQueue(
            original_prompt="Test",
            base_priority=0.0,
            upvotes=1,
            downvotes=0,
            is_priority_boost=False,
            requested_at=datetime.utcnow(),
        )
        priority = item.calculate_priority(user_reputation=0)
        assert priority == 10.0

    def test_downvote_weight_is_5(self):
        """Verify downvote weight constant is 5."""
        item = RadioQueue(
            original_prompt="Test",
            base_priority=100.0,
            upvotes=0,
            downvotes=1,
            is_priority_boost=False,
            requested_at=datetime.utcnow(),
        )
        priority = item.calculate_priority(user_reputation=0)
        assert priority == 95.0

    def test_reputation_multiplier_is_half(self):
        """Verify reputation multiplier is 0.5."""
        item = RadioQueue(
            original_prompt="Test",
            base_priority=0.0,
            upvotes=0,
            downvotes=0,
            is_priority_boost=False,
            requested_at=datetime.utcnow(),
        )
        priority = item.calculate_priority(user_reputation=100)
        assert priority == 50.0

    def test_priority_boost_is_100(self):
        """Verify priority boost constant is 100."""
        item = RadioQueue(
            original_prompt="Test",
            base_priority=0.0,
            upvotes=0,
            downvotes=0,
            is_priority_boost=True,
            requested_at=datetime.utcnow(),
        )
        priority = item.calculate_priority(user_reputation=0)
        assert priority == 100.0


class TestQueueItemProperties:
    """Test RadioQueue model properties."""

    def test_vote_score_property(self):
        """Test the vote_score property."""
        item = RadioQueue(
            original_prompt="Test",
            upvotes=10,
            downvotes=3,
        )
        assert item.vote_score == 7

    def test_is_active_property(self):
        """Test the is_active property for different statuses."""
        active_statuses = [
            QueueStatus.PENDING.value,
            QueueStatus.QUEUED.value,
            QueueStatus.GENERATING.value,
            QueueStatus.GENERATED.value,
            QueueStatus.BROADCASTING.value,
        ]

        for status in active_statuses:
            item = RadioQueue(
                original_prompt="Test",
                status=status,
            )
            assert item.is_active, f"Status {status} should be active"

        terminal_statuses = [
            QueueStatus.COMPLETED.value,
            QueueStatus.FAILED.value,
            QueueStatus.CANCELLED.value,
            QueueStatus.MODERATED.value,
        ]

        for status in terminal_statuses:
            item = RadioQueue(
                original_prompt="Test",
                status=status,
            )
            assert not item.is_active, f"Status {status} should not be active"

    def test_can_retry_property(self):
        """Test the can_retry property."""
        item = RadioQueue(
            original_prompt="Test",
            status=QueueStatus.FAILED.value,
            retry_count=1,
            max_retries=3,
        )
        assert item.can_retry

        item.retry_count = 3
        assert not item.can_retry
