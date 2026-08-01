def test_create_ticket_notifies_without_smtp(client):
    client.post(
        "/api/auth/register",
        json={"email": "admin@crm.com", "name": "A", "password": "Secret123", "role": "admin"},
    )
    r = client.post("/api/auth/login", data={"username": "admin@crm.com", "password": "Secret123"})
    token = r.json()["access_token"]

    r = client.post(
        "/api/tickets",
        json={"titulo": "Problema X", "descricao": "Descrição", "tipo": "chamado"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["titulo"] == "Problema X"
