def test_notifications_flow(client):
    client.post(
        "/auth/register",
        json={"email": "notif@crm.com", "name": "N", "password": "Secret123", "role": "admin"},
    )
    r = client.post("/auth/login", data={"username": "notif@crm.com", "password": "Secret123"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post(
        "/tickets",
        json={"titulo": "Chamado X", "descricao": "d", "tipo": "chamado"},
        headers=headers,
    )
    assert r.status_code == 200

    r = client.get("/notifications", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["unread_count"] == 1
    notif_id = body["items"][0]["id"]

    r = client.post(f"/notifications/{notif_id}/read", headers=headers)
    assert r.status_code == 200

    r = client.get("/notifications", headers=headers)
    assert r.json()["unread_count"] == 0


def test_mark_all_read(client):
    client.post(
        "/auth/register",
        json={"email": "notif2@crm.com", "name": "N", "password": "Secret123", "role": "admin"},
    )
    r = client.post("/auth/login", data={"username": "notif2@crm.com", "password": "Secret123"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/tickets", json={"titulo": "A", "tipo": "chamado"}, headers=headers)
    client.post("/tickets", json={"titulo": "B", "tipo": "chamado"}, headers=headers)

    assert client.get("/notifications", headers=headers).json()["unread_count"] == 2
    client.post("/notifications/read-all", headers=headers)
    assert client.get("/notifications", headers=headers).json()["unread_count"] == 0
