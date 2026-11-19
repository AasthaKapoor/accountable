from datetime import date

import pytest

from accountable import rules

TODAY = date(2026, 11, 19)


@pytest.mark.parametrize(
    ("stage", "probability"),
    [("new", 10), ("qualified", 25), ("proposal", 50), ("negotiation", 75), ("won", 100), ("lost", 0)],
)
def test_default_probability(stage, probability):
    assert rules.DEFAULT_PROBABILITY[stage] == probability


def test_won_and_lost_probability_fixed():
    assert rules.probability_is_fixed("won")
    assert rules.probability_is_fixed("lost")
    assert not any(rules.probability_is_fixed(s) for s in rules.OPEN_STAGES)


def test_stage_order():
    assert rules.STAGES == ("new", "qualified", "proposal", "negotiation", "won", "lost")


class TestLate:
    def test_open_deal_past_close_date_is_late(self):
        assert rules.is_late("proposal", date(2026, 11, 18), TODAY)

    def test_due_today_is_not_late(self):
        assert not rules.is_late("proposal", TODAY, TODAY)

    def test_future_is_not_late(self):
        assert not rules.is_late("new", date(2026, 12, 1), TODAY)

    @pytest.mark.parametrize("stage", ["won", "lost"])
    def test_closed_deals_are_never_late(self, stage):
        assert not rules.is_late(stage, date(2026, 1, 1), TODAY)


class TestFollowUps:
    def test_before_today_is_overdue(self):
        assert rules.follow_up_status(date(2026, 11, 18), False, TODAY) == "overdue"

    def test_today_is_upcoming(self):
        assert rules.follow_up_status(TODAY, False, TODAY) == "upcoming"

    def test_later_is_upcoming(self):
        assert rules.follow_up_status(date(2026, 11, 30), False, TODAY) == "upcoming"

    def test_done_is_neither(self):
        assert rules.follow_up_status(date(2026, 11, 1), True, TODAY) is None
        assert rules.follow_up_status(date(2026, 12, 1), True, TODAY) is None

    def test_no_date_is_neither(self):
        assert rules.follow_up_status(None, False, TODAY) is None


class TestTotals:
    def test_counts_open_deals_only(self):
        deals = [
            {"stage": "new", "value_pence": 1_000_00, "probability": 10},
            {"stage": "negotiation", "value_pence": 2_000_00, "probability": 75},
            {"stage": "won", "value_pence": 5_000_00, "probability": 100},
            {"stage": "lost", "value_pence": 7_000_00, "probability": 0},
        ]
        assert rules.totals(deals) == {"value_pence": 3_000_00, "expected_pence": 1_600_00, "count": 2}

    def test_expected_rounds_once_at_the_end(self):
        # Each deal alone is 0.5p and 0.33p; rounding per deal would give 1p + 0p.
        deals = [
            {"stage": "new", "value_pence": 5, "probability": 10},
            {"stage": "new", "value_pence": 33, "probability": 1},
        ]
        assert rules.totals(deals)["expected_pence"] == 1  # 0.83p rounds to 1p
        assert rules.totals(deals[:1])["expected_pence"] == 1  # 0.5p rounds half up
        assert rules.totals([{"stage": "new", "value_pence": 4, "probability": 10}])["expected_pence"] == 0

    def test_empty(self):
        assert rules.totals([]) == {"value_pence": 0, "expected_pence": 0, "count": 0}


class TestPosition:
    def test_between_neighbours(self):
        assert rules.position_between(1.0, 2.0) == 1.5

    def test_at_the_top(self):
        assert rules.position_between(None, 3.0) == 2.0

    def test_at_the_bottom(self):
        assert rules.position_between(4.0, None) == 5.0

    def test_empty_column(self):
        assert rules.position_between(None, None) == 1.0

    def test_gap_too_small(self):
        assert rules.gap_too_small(1.0, 1.0 + 1e-7)
        assert not rules.gap_too_small(1.0, 1.5)
        assert not rules.gap_too_small(None, 1.0)

    def test_renumbered(self):
        assert rules.renumbered(3) == [1.0, 2.0, 3.0]


def test_advance_furthest_moves_forward_only():
    assert rules.advance_furthest("new", "proposal") == "proposal"
    assert rules.advance_furthest("proposal", "qualified") == "proposal"
    assert rules.advance_furthest("negotiation", "won") == "negotiation"
    assert rules.advance_furthest("qualified", "lost") == "qualified"


def test_stage_change_description():
    assert rules.stage_change_description("proposal", "negotiation") == "Moved from Proposal to Negotiation"
