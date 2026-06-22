"""
FastAPI service for PST/OST parsing.
Triggered by the Next.js upload/complete webhook.
"""
import logging
import os
import threading
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("main")

PARSER_SECRET = os.environ.get("PARSER_SECRET", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("parser-service started")
    yield
    logger.info("parser-service stopped")


app = FastAPI(title="Ostflow Parser Service", lifespan=lifespan)


class ParseRequest(BaseModel):
    archive_id: str
    r2_key: str
    organization_id: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse")
def parse(
    body: ParseRequest,
    background_tasks: BackgroundTasks,
    x_parser_secret: str = Header(default=""),
):
    if PARSER_SECRET and x_parser_secret != PARSER_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    from pst_parser import parse_archive

    background_tasks.add_task(
        parse_archive,
        archive_id=body.archive_id,
        r2_key=body.r2_key,
        organization_id=body.organization_id,
    )

    logger.info(f"[/parse] queued archive={body.archive_id}")
    return {"accepted": True, "archive_id": body.archive_id}
