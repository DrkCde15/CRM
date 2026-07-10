def test_first_register_creates_admin(client):
    r = client.post(
        "/auth/register",
        json={"email": "a@crm.com", "name": "Admin", "password": "Secret123", "role": "admin"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "a@crm.com"
    assert body["role"] == "admin"


def test_weak_password_rejected(client):
    r = client.post("/auth/register", json={"email": "a@crm.com", "name": "A", "password": "123"})
    assert r.status_code == 422


def test_second_register_requires_admin(client):
    client.post(
        "/auth/register",
        json={"email": "a@crm.com", "name": "A", "password": "Secret123", "role": "admin"},
    )
    r = client.post(
        "/auth/register",
        json={"email": "b@crm.com", "name": "B", "password": "Secret123", "role": "agent"},
    )
    assert r.status_code == 403


def test_login_and_me(client):
    client.post(
        "/auth/register",
        json={"email": "a@crm.com", "name": "A", "password": "Secret123", "role": "admin"},
    )
    r = client.post("/auth/login", data={"username": "a@crm.com", "password": "Secret123"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "a@crm.com"


def test_login_wrong_password_lockout(client):
    client.post(
        "/auth/register",
        json={"email": "a@crm.com", "name": "A", "password": "Secret123", "role": "admin"},
    )
    for _ in range(5):
        r = client.post("/auth/login", data={"username": "a@crm.com", "password": "wrong"})
    assert r.status_code == 429
