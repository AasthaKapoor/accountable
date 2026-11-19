import pytest


@pytest.fixture
def data(make):
    northgate = make.org("Northgate Logistics", industry="Logistics", website="b.example")
    harbour = make.org("Harbour Finance", industry="Financial services", website="a.example")
    lumen = make.org("lumen studio", industry="Design")
    priya = make.contact(northgate, "Priya Shah", email="priya@northgate.example", status="customer", job_title="Director")
    oliver = make.contact(harbour, "Oliver Shaw", email="oliver@harbour.example", status="lead", job_title="COO")
    isla = make.contact(lumen, "Isla Grant", status="qualified")
    make.deal(northgate, priya, name="Fleet tracking", stage="qualified", value_pence=42_000_00, close_date="2027-01-30")
    make.deal(harbour, oliver, name="Risk reporting", stage="won", value_pence=52_000_00, close_date="2026-06-01")
    make.deal(lumen, isla, name="Studio CMS", stage="new", value_pence=6_400_00, close_date="2026-12-01")
    return {"northgate": northgate, "harbour": harbour, "lumen": lumen}


def names(response):
    assert response.status_code == 200, response.json()
    return [item["name"] for item in response.json()["items"]]


class TestSearch:
    def test_organizations_by_name_and_industry(self, client, data):
        assert names(client.get("/api/organizations?search=NORTH")) == ["Northgate Logistics"]
        assert names(client.get("/api/organizations?search=financial")) == ["Harbour Finance"]
        assert names(client.get("/api/organizations?search=a.example")) == []

    def test_contacts_by_name_email_and_organization(self, client, data):
        assert names(client.get("/api/contacts?search=priya")) == ["Priya Shah"]
        assert names(client.get("/api/contacts?search=HARBOUR.example")) == ["Oliver Shaw"]
        assert names(client.get("/api/contacts?search=lumen")) == ["Isla Grant"]

    def test_deals_by_name_organization_and_contact(self, client, data):
        assert names(client.get("/api/deals?search=fleet")) == ["Fleet tracking"]
        assert names(client.get("/api/deals?search=harbour")) == ["Risk reporting"]
        assert names(client.get("/api/deals?search=isla")) == ["Studio CMS"]

    def test_blank_search_matches_everything(self, client, data):
        assert len(names(client.get("/api/organizations?search=%20"))) == 3


class TestFilters:
    def test_contacts_by_status(self, client, data):
        # Oliver became a customer when his deal was created as Won.
        assert names(client.get("/api/contacts?status=lead")) == []
        assert names(client.get("/api/contacts?status=customer")) == ["Oliver Shaw", "Priya Shah"]
        assert names(client.get("/api/contacts?status=qualified")) == ["Isla Grant"]
        assert client.get("/api/contacts?status=vip").status_code == 422

    def test_contacts_by_organization(self, client, data):
        assert names(client.get(f"/api/contacts?organization_id={data['lumen']['id']}")) == ["Isla Grant"]

    def test_deals_by_stage(self, client, data):
        assert names(client.get("/api/deals?stage=won")) == ["Risk reporting"]


ORG_SORTS = {
    "name": ["Harbour Finance", "lumen studio", "Northgate Logistics"],
    "industry": ["Lumen studio", "Harbour Finance", "Northgate Logistics"],
    "website": ["Harbour Finance", "Northgate Logistics", "lumen studio"],
    "open_value": ["Harbour Finance", "lumen studio", "Northgate Logistics"],
}
CONTACT_SORTS = {
    "name": ["Isla Grant", "Oliver Shaw", "Priya Shah"],
    "organization": ["Oliver Shaw", "Isla Grant", "Priya Shah"],
    "job_title": ["Oliver Shaw", "Priya Shah", "Isla Grant"],
    "email": ["Oliver Shaw", "Priya Shah", "Isla Grant"],
    "status": ["Priya Shah", "Oliver Shaw", "Isla Grant"],
}
DEAL_SORTS = {
    "name": ["Fleet tracking", "Risk reporting", "Studio CMS"],
    "organization": ["Risk reporting", "Studio CMS", "Fleet tracking"],
    "contact": ["Studio CMS", "Risk reporting", "Fleet tracking"],
    "stage": ["Studio CMS", "Fleet tracking", "Risk reporting"],
    "value": ["Studio CMS", "Fleet tracking", "Risk reporting"],
    "probability": ["Studio CMS", "Fleet tracking", "Risk reporting"],
    "close_date": ["Risk reporting", "Studio CMS", "Fleet tracking"],
}


@pytest.mark.parametrize(("sort", "expected"), [(k, v) for k, v in ORG_SORTS.items() if k != "industry"])
def test_organization_sorts(client, data, sort, expected):
    assert names(client.get(f"/api/organizations?sort={sort}")) == expected


def test_organization_sort_by_industry(client, data):
    items = client.get("/api/organizations?sort=industry&order=desc").json()["items"]
    assert [i["industry"] for i in items] == ["Logistics", "Financial services", "Design"]


def test_organization_counts(client, data):
    items = client.get("/api/organizations?sort=name").json()["items"]
    assert [(i["contact_count"], i["deal_count"], i["open_value_pence"]) for i in items] == [(1, 1, 0), (1, 1, 6_400_00), (1, 1, 42_000_00)]


@pytest.mark.parametrize(("sort", "expected"), CONTACT_SORTS.items())
def test_contact_sorts_both_ways(client, data, sort, expected):
    if sort in ("job_title", "email"):
        # Isla has no job title or email; blanks always go last.
        assert names(client.get(f"/api/contacts?sort={sort}"))[-1] == "Isla Grant"
        assert names(client.get(f"/api/contacts?sort={sort}&order=desc")) == [expected[1], expected[0], expected[2]]
        return
    assert names(client.get(f"/api/contacts?sort={sort}")) == expected
    assert names(client.get(f"/api/contacts?sort={sort}&order=desc")) == expected[::-1]


@pytest.mark.parametrize(("sort", "expected"), DEAL_SORTS.items())
def test_deal_sorts_both_ways(client, data, sort, expected):
    assert names(client.get(f"/api/deals?sort={sort}")) == expected
    assert names(client.get(f"/api/deals?sort={sort}&order=desc")) == expected[::-1]


def test_organization_sorts_descending(client, data):
    for sort, expected in ORG_SORTS.items():
        if sort in ("industry", "website"):
            continue
        assert names(client.get(f"/api/organizations?sort={sort}&order=desc")) == expected[::-1]


def test_unknown_sort(client, data):
    response = client.get("/api/deals?sort=colour")
    assert response.status_code == 422
    assert "sort" in response.json()["errors"]
    assert client.get("/api/deals?order=sideways").status_code == 422


def test_pagination(client, make):
    org = make.org("Acme")
    for i in range(30):
        make.contact(org, f"Person {i:02d}")
    first = client.get("/api/contacts?sort=name").json()
    assert first["total"] == 30
    assert first["page_size"] == 25
    assert len(first["items"]) == 25
    assert first["items"][0]["name"] == "Person 00"
    second = client.get("/api/contacts?sort=name&page=2").json()
    assert [c["name"] for c in second["items"]] == [f"Person {i:02d}" for i in range(25, 30)]
    assert second["total"] == 30
    filtered = client.get("/api/contacts?search=person 1").json()
    assert filtered["total"] == 10
    assert client.get("/api/contacts?page=0").status_code == 422
