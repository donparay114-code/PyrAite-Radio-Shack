"""Tests for database models."""

from datetime import datetime

from src.models import (
    User,
    UserTier,
    Song,
    SunoStatus,
    RadioQueue,
    QueueStatus,
    RadioHistory,
    Vote,
    VoteType,
)


class TestUserModel:
    """Tests for User model."""

    def test_user_creation(self, sync_session, sample_user_data):
        """Test creating a user."""
        user = User(**sample_user_data)
        sync_session.add(user)
        sync_session.commit()

        assert user.id is not None
        assert user.telegram_id == sample_user_data["telegram_id"]
        assert user.telegram_username == sample_user_data["telegram_username"]
        assert user.reputation_score == 0.0
        assert user.is_banned is False
        assert user.is_premium is False

    def test_user_display_name_with_username(self, sample_user):
        """Test display name when username is set."""
        assert sample_user.display_name == "@testuser"

    def test_user_display_name_without_username(self, sync_session):
        """Test display name when username is not set."""
        user = User(
            telegram_id=999,
            telegram_first_name="John",
            telegram_last_name="Doe",
        )
        sync_session.add(user)
        sync_session.commit()

        assert user.display_name == "John Doe"

    def test_user_tier_new(self, sample_user):
        """Test tier is 'new' for 0 reputation."""
        sample_user.reputation_score = 0
        assert sample_user.tier == UserTier.NEW

    def test_user_tier_regular(self, sample_user):
        """Test tier is 'regular' for 100-499 reputation."""
        sample_user.reputation_score = 250
        assert sample_user.tier == UserTier.REGULAR

    def test_user_tier_trusted(self, sample_user):
        """Test tier is 'trusted' for 500-999 reputation."""
        sample_user.reputation_score = 750
        assert sample_user.tier == UserTier.TRUSTED

    def test_user_tier_vip(self, sample_user):
        """Test tier is 'vip' for 1000-4999 reputation."""
        sample_user.reputation_score = 2500
        assert sample_user.tier == UserTier.VIP

    def test_user_tier_elite(self, sample_user):
        """Test tier is 'elite' for 5000+ reputation."""
        sample_user.reputation_score = 5000
        assert sample_user.tier == UserTier.ELITE

    def test_user_priority_multiplier(self, sample_user):
        """Test priority multiplier based on tier."""
        sample_user.reputation_score = 0
        assert sample_user.priority_multiplier == 1.0

        sample_user.reputation_score = 5000
        assert sample_user.priority_multiplier == 2.0

    def test_user_max_daily_requests(self, sample_user):
        """Test max daily requests based on tier."""
        sample_user.reputation_score = 0
        assert sample_user.max_daily_requests == 3

        sample_user.reputation_score = 5000
        assert sample_user.max_daily_requests == 50

    def test_user_success_rate(self, sample_user):
        """Test success rate calculation."""
        sample_user.total_requests = 10
        sample_user.successful_requests = 8
        assert sample_user.success_rate == 0.8

    def test_user_success_rate_no_requests(self, sample_user):
        """Test success rate with no requests."""
        sample_user.total_requests = 0
        assert sample_user.success_rate == 0.0

    def test_user_vote_ratio(self, sample_user):
        """Test vote ratio calculation."""
        sample_user.total_upvotes_received = 8
        sample_user.total_downvotes_received = 2
        assert sample_user.vote_ratio == 0.8

    def test_user_calculate_reputation(self, sample_user):
        """Test reputation calculation."""
        sample_user.successful_requests = 10
        sample_user.total_upvotes_received = 5
        sample_user.total_downvotes_received = 2
        sample_user.total_requests = 10
        sample_user.is_premium = False

        expected = (10 * 10) + (5 * 5) - (2 * 3) + (1.0 * 50)  # 100 + 25 - 6 + 50
        assert sample_user.calculate_reputation() == expected


class TestSongModel:
    """Tests for Song model."""

    def test_song_creation(self, sync_session, sample_song_data):
        """Test creating a song."""
        song = Song(**sample_song_data)
        sync_session.add(song)
        sync_session.commit()

        assert song.id is not None
        assert song.title == sample_song_data["title"]
        assert song.suno_status == SunoStatus.COMPLETE.value

    def test_song_duration_formatted(self, sample_song):
        """Test duration formatting."""
        sample_song.duration_seconds = 185.5
        assert sample_song.duration_formatted == "3:05"

    def test_song_duration_formatted_zero(self, sample_song):
        """Test duration formatting with no duration."""
        sample_song.duration_seconds = None
        assert sample_song.duration_formatted == "0:00"

    def test_song_vote_score(self, sample_song):
        """Test vote score calculation."""
        sample_song.total_upvotes = 10
        sample_song.total_downvotes = 3
        assert sample_song.vote_score == 7

    def test_song_vote_ratio(self, sample_song):
        """Test vote ratio calculation."""
        sample_song.total_upvotes = 8
        sample_song.total_downvotes = 2
        assert sample_song.vote_ratio == 0.8

    def test_song_is_ready_for_broadcast(self, sample_song):
        """Test broadcast readiness check."""
        sample_song.suno_status = SunoStatus.COMPLETE.value
        sample_song.local_file_path = "/path/to/song.mp3"
        sample_song.is_approved = True
        assert sample_song.is_ready_for_broadcast is True

    def test_song_not_ready_unapproved(self, sample_song):
        """Test song not ready when unapproved."""
        sample_song.suno_status = SunoStatus.COMPLETE.value
        sample_song.local_file_path = "/path/to/song.mp3"
        sample_song.is_approved = False
        assert sample_song.is_ready_for_broadcast is False


class TestRadioQueueModel:
    """Tests for RadioQueue model."""

    def test_queue_creation(self, sync_session, sample_user):
        """Test creating a queue item."""
        item = RadioQueue(
            user_id=sample_user.id,
            original_prompt="Test prompt",
            status=QueueStatus.PENDING.value,
        )
        sync_session.add(item)
        sync_session.commit()

        assert item.id is not None
        assert item.status == QueueStatus.PENDING.value
        assert item.priority_score == 100.0

    def test_queue_vote_score(self, sample_queue_item):
        """Test vote score calculation."""
        sample_queue_item.upvotes = 10
        sample_queue_item.downvotes = 3
        assert sample_queue_item.vote_score == 7

    def test_queue_can_retry_failed(self, sample_queue_item):
        """Test retry check for failed items."""
        sample_queue_item.status = QueueStatus.FAILED.value
        sample_queue_item.retry_count = 1
        sample_queue_item.max_retries = 3
        assert sample_queue_item.can_retry is True

    def test_queue_cannot_retry_max_reached(self, sample_queue_item):
        """Test retry check when max retries reached."""
        sample_queue_item.status = QueueStatus.FAILED.value
        sample_queue_item.retry_count = 3
        sample_queue_item.max_retries = 3
        assert sample_queue_item.can_retry is False

    def test_queue_is_active(self, sample_queue_item):
        """Test active status check."""
        sample_queue_item.status = QueueStatus.PENDING.value
        assert sample_queue_item.is_active is True

        sample_queue_item.status = QueueStatus.GENERATING.value
        assert sample_queue_item.is_active is True

    def test_queue_is_not_active_completed(self, sample_queue_item):
        """Test inactive status for terminal states."""
        sample_queue_item.status = QueueStatus.COMPLETED.value
        assert sample_queue_item.is_active is False

        sample_queue_item.status = QueueStatus.FAILED.value
        assert sample_queue_item.is_active is False

    def test_queue_calculate_priority(self, sample_queue_item):
        """Test priority calculation."""
        sample_queue_item.base_priority = 100
        sample_queue_item.upvotes = 5
        sample_queue_item.downvotes = 1
        sample_queue_item.is_priority_boost = False
        sample_queue_item.requested_at = datetime.utcnow()

        priority = sample_queue_item.calculate_priority(user_reputation=100)
        # 100 (base) + 50 (rep * 0.5) + 50 (5 upvotes * 10) - 5 (1 downvote * 5) = 195
        assert priority == 195.0


class TestVoteModel:
    """Tests for Vote model."""

    def test_vote_creation(self, sync_session, sample_user, sample_queue_item):
        """Test creating a vote."""
        vote = Vote(
            user_id=sample_user.id,
            queue_item_id=sample_queue_item.id,
            vote_type=VoteType.UPVOTE.value,
        )
        sync_session.add(vote)
        sync_session.commit()

        assert vote.id is not None
        assert vote.is_upvote is True
        assert vote.is_downvote is False

    def test_vote_value(self, sync_session, sample_user, sample_queue_item):
        """Test vote value calculation."""
        upvote = Vote(
            user_id=sample_user.id,
            queue_item_id=sample_queue_item.id,
            vote_type=VoteType.UPVOTE.value,
        )
        assert upvote.vote_value == 1

        downvote = Vote(
            user_id=sample_user.id,
            queue_item_id=sample_queue_item.id,
            vote_type=VoteType.DOWNVOTE.value,
        )
        assert downvote.vote_value == -1

    def test_vote_flip(self, sync_session, sample_user, sample_queue_item):
        """Test flipping a vote."""
        vote = Vote(
            user_id=sample_user.id,
            queue_item_id=sample_queue_item.id,
            vote_type=VoteType.UPVOTE.value,
        )
        sync_session.add(vote)
        sync_session.commit()

        vote.flip_vote()
        assert vote.vote_type == VoteType.DOWNVOTE.value
        assert vote.previous_vote_type == VoteType.UPVOTE.value
        assert vote.was_changed is True


class TestRadioHistoryModel:
    """Tests for RadioHistory model."""

    def test_history_creation(self, sync_session, sample_song):
        """Test creating a history entry."""
        history = RadioHistory(
            song_id=sample_song.id,
            song_title=sample_song.title,
            song_artist=sample_song.artist,
            played_at=datetime.utcnow(),
        )
        sync_session.add(history)
        sync_session.commit()

        assert history.id is not None
        assert history.song_id == sample_song.id

    def test_history_engagement_score(self, sync_session, sample_song):
        """Test engagement score calculation."""
        history = RadioHistory(
            song_id=sample_song.id,
            upvotes_during_play=10,
            downvotes_during_play=3,
        )
        assert history.engagement_score == 7

    def test_history_play_duration_formatted(self, sync_session, sample_song):
        """Test play duration formatting."""
        history = RadioHistory(
            song_id=sample_song.id,
            duration_played_seconds=125.5,
        )
        assert history.play_duration_formatted == "2:05"
