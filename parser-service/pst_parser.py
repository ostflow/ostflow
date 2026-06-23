"""
Parses PST/OST files from R2, extracts emails and companies, writes to Supabase.
Uses pypff (libpff-python-ratom) for PST/OST reading.
"""
import os
import re
import tempfile
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from email.utils import parseaddr, getaddresses

import boto3
import pypff
from botocore.config import Config
from bs4 import BeautifulSoup
from striprtf.striprtf import rtf_to_text
from supabase import create_client, Client

logger = logging.getLogger(__name__)

DOMAIN_BLACKLIST = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
    "icloud.com", "me.com", "mac.com", "yandex.com", "yandex.ru",
    "msn.com", "aol.com", "protonmail.com", "mail.ru",
}


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=os.environ["R2_ENDPOINT_URL"],
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def extract_domain(email_addr: str) -> Optional[str]:
    _, addr = parseaddr(email_addr)
    if "@" not in addr:
        return None
    domain = addr.split("@", 1)[1].lower().strip()
    if not domain or domain in DOMAIN_BLACKLIST:
        return None
    return domain


def infer_company_name(domain: str) -> str:
    name = domain.split(".")[0]
    name = re.sub(r"[-_]", " ", name)
    return name.title()


def _iter_folders(folder):
    yield folder
    for i in range(folder.number_of_sub_folders):
        try:
            yield from _iter_folders(folder.get_sub_folder(i))
        except Exception:
            continue


def _get_sender(msg) -> str:
    try:
        addr = msg.sender_email_address
        if addr:
            return addr
    except Exception:
        pass
    try:
        headers = msg.transport_headers or ""
        for line in headers.splitlines():
            if line.lower().startswith("from:"):
                _, addr = parseaddr(line[5:].strip())
                if addr:
                    return addr
    except Exception:
        pass
    return ""


def _get_recipients(msg) -> list[str]:
    recipients = []
    try:
        for i in range(msg.number_of_recipients):
            r = msg.get_recipient(i)
            addr = getattr(r, "email_address", None) or ""
            if addr:
                recipients.append(addr)
    except Exception:
        pass
    return recipients


def _get_body(msg) -> tuple[str, str]:
    """Return (body_text, body_type). Tries plain text, then HTML, then RTF."""
    try:
        plain = msg.plain_text_body
        if plain:
            return plain.decode("utf-8", errors="replace"), "text"
    except Exception:
        pass
    try:
        html = msg.html_body
        if html:
            text = BeautifulSoup(html.decode("utf-8", errors="replace"), "html.parser").get_text()
            return text, "html"
    except Exception:
        pass
    try:
        rtf = msg.rtf_body
        if rtf:
            return rtf_to_text(rtf.decode("utf-8", errors="replace")), "text"
    except Exception:
        pass
    return "", "text"


def _get_sent_date(msg) -> Optional[datetime]:
    for attr in ("client_submit_time", "delivery_time"):
        try:
            dt = getattr(msg, attr, None)
            if dt:
                return dt
        except Exception:
            pass
    return None


def parse_archive(archive_id: str, r2_key: str, organization_id: str):
    """Download PST/OST from R2, parse it, write results to Supabase."""
    supabase = get_supabase()
    s3 = get_s3_client()
    bucket = os.environ["R2_BUCKET_NAME"]

    logger.info(f"[parse_archive] start archive={archive_id} key={r2_key}")
    supabase.table("archives").update({"status": "processing"}).eq("id", archive_id).execute()

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=Path(r2_key).suffix, delete=False) as tmp:
            tmp_path = tmp.name

        logger.info(f"[parse_archive] downloading {r2_key} → {tmp_path}")
        s3.download_file(bucket, r2_key, tmp_path)

        existing_domains: dict[str, str] = {}
        response = supabase.table("companies").select("id, domain").eq("organization_id", organization_id).execute()
        for row in (response.data or []):
            existing_domains[row["domain"]] = row["id"]

        email_rows = []
        new_companies: dict[str, str] = {}

        pst = pypff.file()
        pst.open(tmp_path)
        try:
            root = pst.get_root_folder()
            for folder in _iter_folders(root):
                for i in range(folder.number_of_messages):
                    try:
                        msg = folder.get_message(i)
                        subject = getattr(msg, "subject", None) or ""
                        from_addr = _get_sender(msg)
                        to_list = _get_recipients(msg)
                        body, body_type = _get_body(msg)
                        sent_dt = _get_sent_date(msg)

                        all_addrs = [from_addr] + to_list
                        company_id: Optional[str] = None
                        for addr in all_addrs:
                            domain = extract_domain(addr)
                            if not domain:
                                continue
                            if domain in existing_domains:
                                company_id = existing_domains[domain]
                                break
                            if domain in new_companies:
                                company_id = new_companies[domain]
                                break
                            name = infer_company_name(domain)
                            res = supabase.table("companies").insert({
                                "organization_id": organization_id,
                                "domain": domain,
                                "name": name,
                            }).execute()
                            if res.data:
                                cid = res.data[0]["id"]
                                new_companies[domain] = cid
                                existing_domains[domain] = cid
                                company_id = cid
                            break

                        email_rows.append({
                            "organization_id": organization_id,
                            "archive_id": archive_id,
                            "company_id": company_id,
                            "subject": subject[:500] if subject else None,
                            "from_address": from_addr[:255] if from_addr else "",
                            "to_addresses": to_list[:20],
                            "body": body[:100_000] if body else None,
                            "body_type": body_type,
                            "sent_at": sent_dt.isoformat() if sent_dt else None,
                        })

                        if len(email_rows) >= 100:
                            supabase.table("emails").insert(email_rows).execute()
                            email_rows = []

                    except Exception as e:
                        logger.warning(f"[parse_archive] skip message: {e}")
                        continue
        finally:
            pst.close()

        if email_rows:
            supabase.table("emails").insert(email_rows).execute()

        supabase.table("archives").update({
            "status": "done",
            "parsed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", archive_id).execute()

        logger.info(f"[parse_archive] done archive={archive_id}")

    except Exception as e:
        logger.error(f"[parse_archive] error: {e}")
        supabase.table("archives").update({
            "status": "error",
            "error_message": str(e)[:500],
        }).eq("id", archive_id).execute()
        raise

    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
