import pytest


@pytest.fixture
def board(make):
    """Three cards in New (a, b, c from the top) and one in Qualified (q)."""
    org = make.org("Acme")
    contact = make.contact(org, "Ann")
    cards = {name: make.deal(org, contact, name=name, stage="new", value_pence=1_000_00) for name in "abc"}
    cards["q"] = make.deal(org, contact, name="q", stage="qualified", value_pence=2_000_00)
    return cards


def column(client, stage):
    columns = client.get("/api/pipeline").json()["columns"]
    return [d["name"] for d in next(c for c in columns if c["stage"] == stage)["deals"]]


def move(client, deal, **body):
    response = client.post(f"/api/deals/{deal['id']}/move", json=body)
    assert response.status_code == 200, response.json()
    return response.json()


def test_move_within_a_column(client, board):
    move(client, board["c"], stage="new", before_id=board["a"]["id"], after_id=board["b"]["id"])
    assert column(client, "new") == ["a", "c", "b"]


def test_move_to_the_top(client, board):
    move(client, board["c"], stage="new", after_id=board["a"]["id"])
    assert column(client, "new") == ["c", "a", "b"]


def test_move_to_the_bottom(client, board):
    move(client, board["a"], stage="new", before_id=board["c"]["id"])
    assert column(client, "new") == ["b", "c", "a"]


def test_move_to_another_column_between_neighbours(client, board):
    result = move(client, board["b"], stage="qualified", after_id=board["q"]["id"])
    assert column(client, "qualified") == ["b", "q"]
    assert column(client, "new") == ["a", "c"]
    assert result["deal"]["stage"] == "qualified"
    assert result["deal"]["probability"] == 25


def test_move_to_an_empty_column(client, board):
    move(client, board["a"], stage="proposal")
    assert column(client, "proposal") == ["a"]


def test_returns_updated_totals(client, board):
    result = move(client, board["a"], stage="won")
    totals = result["totals"]
    # Left open: b and c at 10%, q at 25%
    assert totals["board"] == {"value_pence": 4_000_00, "expected_pence": 700_00, "count": 3}
    assert totals["columns"]["new"] == {"value_pence": 2_000_00, "expected_pence": 200_00, "count": 2}
    assert totals["columns"]["won"]["count"] == 1
    assert totals["columns"]["won"]["value_pence"] is None


def test_neighbour_must_be_in_the_target_column(client, board):
    response = client.post(f"/api/deals/{board['a']['id']}/move", json={"stage": "new", "before_id": board["q"]["id"]})
    assert response.status_code == 422


def test_unknown_deal(client):
    assert client.post("/api/deals/999/move", json={"stage": "new"}).status_code == 404


def test_failed_move_changes_nothing(client, board):
    client.post(f"/api/deals/{board['a']['id']}/move", json={"stage": "qualified", "before_id": board["b"]["id"]})
    assert column(client, "new") == ["a", "b", "c"]
    assert client.get(f"/api/deals/{board['a']['id']}").json()["timeline"] == []


def test_sixty_drops_in_the_same_spot(client, board):
    """Each drop between the top two cards halves the gap; the column is renumbered before floats run out."""
    by_name = {name: board[name] for name in "abc"}
    for _ in range(60):
        current = column(client, "new")
        top, second, moving = current[0], current[1], current[2]
        move(client, by_name[moving], stage="new", before_id=by_name[top]["id"], after_id=by_name[second]["id"])
        assert column(client, "new") == [top, moving, second]
    positions = [d["position"] for d in client.get("/api/pipeline").json()["columns"][0]["deals"]]
    assert positions == sorted(positions)
    assert len(set(positions)) == 3
