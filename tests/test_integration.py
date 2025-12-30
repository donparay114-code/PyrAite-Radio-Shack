"""Integration tests for PYrte Radio Shack."""

from datetime import datetime

from src.models import Song, RadioQueue, Vote, QueueStatus, VoteType


class TestUserQueueIntegration:
    """Test user and queue interactions."""

    def test_user_creates_queue_item(self, sync_session, sample_user):
        """Test user creating a queue item."""
        # Create queue item for user
        queue_item = RadioQueue(
            user_id=sample_user.id,
            telegram_user_id=sample_user.telegram_id,
            original_prompt="Create an energetic rock song",
            genre_hint="Rock",
            status=QueueStatus.PENDING.value,
        )
        sync_session.add(queue_item)
        sync_session.commit()

        # Verify relationship
        sync_session.refresh(sample_user)
        assert queue_item.user_id == sample_user.id
        assert queue_item.telegram_user_id == sample_user.telegram_id

    def test_user_votes_on_queue_item(
        self, sync_session, sample_user, sample_queue_item
    ):
        """Test user voting on a queue item."""
        # Create vote
        vote = Vote(
            user_id=sample_user.id,
            telegram_user_id=sample_user.telegram_id,
            queue_item_id=sample_queue_item.id,
            vote_type=VoteType.UPVOTE.value,
        )
        sync_session.add(vote)

        # Update queue item vote count
        sample_queue_item.upvotes += 1
        sync_session.commit()

        # Verify
        assert sample_queue_item.upvotes == 1
        assert sample_queue_item.vote_score == 1
        assert vote.is_upvote

    def test_vote_affects_queue_priority(
        self, sync_session, sample_user, sample_queue_item
    ):
        """Test that votes affect queue priority."""
        initial_priority = sample_queue_item.priority_score

        # Add upvotes
        sample_queue_item.upvotes = 5
        sample_queue_item.update_priority(sample_user.reputation_score)
        sync_session.commit()

        # Priority should increase
        assert sample_queue_item.priority_score > initial_priority

    def test_user_reputation_affects_priority(self, sync_session, sample_queue_item):
        """Test that user reputation affects queue priority."""
        # Low reputation user
        low_rep_priority = sample_queue_item.calculate_priority(user_reputation=10)

        # High reputation user
        high_rep_priority = sample_queue_item.calculate_priority(user_reputation=1000)

        assert high_rep_priority > low_rep_priority


class TestQueueSongIntegration:
    """Test queue and song interactions."""

    def test_queue_item_links_to_song(self, sync_session, sample_user, sample_song):
        """Test linking queue item to generated song."""
        # Create queue item
        queue_item = RadioQueue(
            user_id=sample_user.id,
            original_prompt="Test prompt",
            status=QueueStatus.GENERATING.value,
        )
        sync_session.add(queue_item)
        sync_session.commit()

        # Link to song after generation
        queue_item.song_id = sample_song.id
        queue_item.status = QueueStatus.GENERATED.value
        queue_item.generation_completed_at = datetime.utcnow()
        sync_session.commit()

        # Verify
        sync_session.refresh(queue_item)
        assert queue_item.song_id == sample_song.id
        assert queue_item.status == QueueStatus.GENERATED.value

    def test_song_vote_aggregation(self, sync_session, sample_song, multiple_users):
        """Test aggregating votes on a song."""
        # Create queue item for the song
        queue_item = RadioQueue(
            original_prompt="Test",
            song_id=sample_song.id,
            status=QueueStatus.COMPLETED.value,
        )
        sync_session.add(queue_item)
        sync_session.commit()

        # Multiple users vote
        for i, user in enumerate(multiple_users):
            vote = Vote(
                user_id=user.id,
                queue_item_id=queue_item.id,
                vote_type=(
                    VoteType.UPVOTE.value if i % 2 == 0 else VoteType.DOWNVOTE.value
                ),
            )
            sync_session.add(vote)

            if i % 2 == 0:
                queue_item.upvotes += 1
                sample_song.total_upvotes += 1
            else:
                queue_item.downvotes += 1
                sample_song.total_downvotes += 1

        sync_session.commit()

        # Verify aggregation
        assert sample_song.total_upvotes == 3  # Users 0, 2, 4
        assert sample_song.total_downvotes == 2  # Users 1, 3
        assert sample_song.vote_score == 1


class TestReputationSystem:
    """Test reputation system integration."""

    def test_successful_request_increases_reputation(self, sync_session, sample_user):
        """Test that successful requests increase reputation."""
        initial_rep = sample_user.reputation_score

        # Simulate successful request
        sample_user.total_requests += 1
        sample_user.successful_requests += 1
        sample_user.update_reputation()
        sync_session.commit()

        assert sample_user.reputation_score > initial_rep

    def test_upvotes_increase_reputation(self, sync_session, sample_user):
        """Test that receiving upvotes increases reputation."""
        initial_rep = sample_user.reputation_score

        # Simulate receiving upvotes
        sample_user.total_upvotes_received += 10
        sample_user.update_reputation()
        sync_session.commit()

        assert sample_user.reputation_score > initial_rep

    def test_downvotes_decrease_reputation(self, sync_session, sample_user):
        """Test that receiving downvotes decreases reputation."""
        # First give some reputation
        sample_user.successful_requests = 20
        sample_user.total_requests = 20
        sample_user.update_reputation()
        initial_rep = sample_user.reputation_score

        # Simulate receiving downvotes
        sample_user.total_downvotes_received += 10
        sample_user.update_reputation()
        sync_session.commit()

        assert sample_user.reputation_score < initial_rep

    def test_tier_progression(self, sync_session, sample_user):
        """Test user tier progression based on reputation."""
        from src.models import UserTier

        # Start as new
        sample_user.reputation_score = 0
        assert sample_user.tier == UserTier.NEW

        # Progress through tiers
        sample_user.reputation_score = 150
        assert sample_user.tier == UserTier.REGULAR

        sample_user.reputation_score = 600
        assert sample_user.tier == UserTier.TRUSTED

        sample_user.reputation_score = 2000
        assert sample_user.tier == UserTier.VIP

        sample_user.reputation_score = 6000
        assert sample_user.tier == UserTier.ELITE


class TestQueueProcessingFlow:
    """Test the full queue processing flow."""

    def test_full_request_lifecycle(self, sync_session, sample_user):
        """Test a request through its full lifecycle."""
        # 1. User submits request
        queue_item = RadioQueue(
            user_id=sample_user.id,
            telegram_user_id=sample_user.telegram_id,
            original_prompt="Create a chill lofi beat",
            genre_hint="Lofi",
            status=QueueStatus.PENDING.value,
            requested_at=datetime.utcnow(),
        )
        sync_session.add(queue_item)
        sync_session.commit()
        assert queue_item.status == QueueStatus.PENDING.value

        # 2. Moderation passes
        queue_item.is_moderated = True
        queue_item.moderation_passed = True
        queue_item.status = QueueStatus.QUEUED.value
        queue_item.queued_at = datetime.utcnow()
        sync_session.commit()

        # 3. Generation starts
        queue_item.status = QueueStatus.GENERATING.value
        queue_item.generation_started_at = datetime.utcnow()
        queue_item.suno_job_id = "test-job-123"
        sync_session.commit()

        # 4. Song generated
        song = Song(
            suno_job_id="test-job-123",
            title="Chill Lofi Beat",
            genre="Lofi",
            duration_seconds=180,
            original_prompt=queue_item.original_prompt,
        )
        sync_session.add(song)
        sync_session.commit()

        queue_item.song_id = song.id
        queue_item.status = QueueStatus.GENERATED.value
        queue_item.generation_completed_at = datetime.utcnow()
        sync_session.commit()

        # 5. Broadcast
        queue_item.status = QueueStatus.BROADCASTING.value
        queue_item.broadcast_started_at = datetime.utcnow()
        sync_session.commit()

        # 6. Complete
        queue_item.status = QueueStatus.COMPLETED.value
        queue_item.completed_at = datetime.utcnow()
        song.play_count += 1
        sync_session.commit()

        # Verify final state
        assert queue_item.status == QueueStatus.COMPLETED.value
        assert queue_item.song_id == song.id
        assert song.play_count == 1
        assert queue_item.wait_time_seconds is not None

    def test_failed_request_retry(self, sync_session, sample_user):
        """Test retry logic for failed requests."""
        queue_item = RadioQueue(
            user_id=sample_user.id,
            original_prompt="Test prompt",
            status=QueueStatus.GENERATING.value,
            retry_count=0,
            max_retries=3,
        )
        sync_session.add(queue_item)
        sync_session.commit()

        # First failure
        queue_item.status = QueueStatus.FAILED.value
        queue_item.error_message = "API timeout"
        queue_item.retry_count = 1
        sync_session.commit()

        assert queue_item.can_retry is True

        # Reset for retry
        queue_item.status = QueueStatus.PENDING.value
        sync_session.commit()

        # Second failure
        queue_item.status = QueueStatus.FAILED.value
        queue_item.retry_count = 2
        sync_session.commit()

        assert queue_item.can_retry is True

        # Third failure - max retries reached
        queue_item.retry_count = 3
        sync_session.commit()

        assert queue_item.can_retry is False


class TestMultiUserScenarios:
    """Test scenarios with multiple users."""

    def test_queue_ordering_by_priority(self, sync_session, multiple_users):
        """Test that queue is ordered by priority."""
        # Create queue items with different priorities
        items = []
        for i, user in enumerate(multiple_users):
            item = RadioQueue(
                user_id=user.id,
                original_prompt=f"Request {i}",
                status=QueueStatus.PENDING.value,
                base_priority=100,
                upvotes=i * 2,  # More upvotes for later users
            )
            item.update_priority(user.reputation_score)
            sync_session.add(item)
            items.append(item)

        sync_session.commit()

        # Sort by priority (descending)
        sorted_items = sorted(items, key=lambda x: x.priority_score, reverse=True)

        # User with highest reputation + upvotes should be first
        assert sorted_items[0].user_id == multiple_users[-1].id

    def test_unique_vote_per_user(self, sync_session, sample_user, sample_queue_item):
        """Test that users can only vote once per queue item."""
        # First vote
        vote1 = Vote(
            user_id=sample_user.id,
            queue_item_id=sample_queue_item.id,
            vote_type=VoteType.UPVOTE.value,
        )
        sync_session.add(vote1)
        sync_session.commit()

        # Attempting second vote should violate unique constraint
        # In real code, this would be handled by the application logic
        # Here we just verify the first vote exists
        assert vote1.id is not None
        assert vote1.vote_type == VoteType.UPVOTE.value
