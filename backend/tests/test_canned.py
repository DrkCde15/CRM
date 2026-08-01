def _auth(client):
    client.post(
        "/api/auth/register",
        json={"email": "a@crm.com", "name": "A", "password": "Secret123", "role": "admin"},
    )
    r = client.post("/api/auth/login", data={"username": "a@crm.com", "password": "Secret123"})
    return r.json()["access_token"]


def test_quick_reply_crud(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}

    create = client.post(
        "/api/quick-replies",
        json={"title": "Oi", "content": "Olá, como posso ajudar?"},
        headers=h,
    )
    assert create.status_code == 201
    qid = create.json()["id"]
    assert create.json()["kind"] == "quick_reply"

    lst = client.get("/api/quick-replies", headers=h)
    assert lst.status_code == 200
    assert any(i["id"] == qid for i in lst.json())

    upd = client.put(
        f"/api/quick-replies/{qid}", json={"content": "Olá! Em que posso ajudar hoje?"}, headers=h
    )
    assert upd.status_code == 200
    assert upd.json()["content"] == "Olá! Em que posso ajudar hoje?"

    dele = client.delete(f"/api/quick-replies/{qid}", headers=h)
    assert dele.status_code == 200
    assert client.get("/api/quick-replies", headers=h).json() == []


def test_macro_crud(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}

    create = client.post(
        "/api/macros",
        json={"title": "Boas-vindas", "content": "Seja bem-vindo à Mochi!"},
        headers=h,
    )
    assert create.status_code == 201
    assert create.json()["kind"] == "macro"

    mid = create.json()["id"]
    assert client.get("/api/macros", headers=h).json()[0]["id"] == mid
    assert client.delete(f"/api/macros/{mid}", headers=h).status_code == 200


def test_quick_reply_isolated_from_macros(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}
    client.post("/api/quick-replies", json={"title": "Q", "content": "q"}, headers=h)
    client.post("/api/macros", json={"title": "M", "content": "m"}, headers=h)

    qr = client.get("/api/quick-replies", headers=h).json()
    mc = client.get("/api/macros", headers=h).json()
    assert all(i["kind"] == "quick_reply" for i in qr)
    assert all(i["kind"] == "macro" for i in mc)
    assert len(qr) == 1 and len(mc) == 1


def test_requires_auth(client):
    assert client.get("/api/quick-replies").status_code == 401
    assert client.post("/api/macros", json={"title": "x", "content": "y"}).status_code == 401


def test_update_missing_returns_404(client):
    token = _auth(client)
    h = {"Authorization": f"Bearer {token}"}
    assert client.put("/api/quick-replies/9999", json={"content": "x"}, headers=h).status_code == 404
    assert client.delete("/api/macros/9999", headers=h).status_code == 404
