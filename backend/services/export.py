import csv
import json
from io import StringIO, BytesIO
from typing import Any

from fastapi.responses import Response
from openpyxl import Workbook


def export_response(
    rows: list[dict[str, Any]],
    format: str,
    filename: str,
) -> Response:
    format = format.lower()
    if format == "csv":
        return _csv(rows, filename)
    elif format == "json":
        return _json(rows, filename)
    elif format == "xlsx":
        return _xlsx(rows, filename)
    else:
        raise ValueError(f"Formato inválido: {format}")


def _csv(rows: list[dict[str, Any]], filename: str) -> Response:
    buf = StringIO()
    if not rows:
        w = csv.writer(buf)
        w.writerow(["sem_dados"])
    else:
        w = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
    )


def _json(rows: list[dict[str, Any]], filename: str) -> Response:
    return Response(
        content=json.dumps(rows, ensure_ascii=False, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}.json"},
    )


def _xlsx(rows: list[dict[str, Any]], filename: str) -> Response:
    wb = Workbook()
    ws = wb.active
    ws.title = filename[:31]
    if rows:
        ws.append(list(rows[0].keys()))
        for r in rows:
            ws.append(list(r.values()))
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"},
    )
