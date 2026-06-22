"""
Parses PST/OST files from R2, extracts emails and companies, writes to Supabase.
Uses libratom for PST/OST reading.
"""
import os
import re
import tempfile
import logging
from pathlib import Path
from typing import Optional
from email.utils import parseaddr, getaddresses

import boto3
from botocore.config import Config
from libratom.lib.pff import PffArchive
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
    """Extract domain from email address, return None for personal domains."""
    _, addr = parseaddr(email_addr)
    if "@" not in addr:
        return None
    domain = addr.split("@", 1)[1].lower().strip()
    if not domain or domain in DOMAIN_BLACKLIST:
        return None
    return domain


def infer_company_name(domain: str) -> str:
    """Best-effort company name from domain."""
    name = domain.split(".")[0]
    name = re.sub(r"[-_]", " ", name)
    return name.title()


def parse_archive(archive_id: str, r2_key: str, organization_id: str):
    """Download PST/OST from R2, parse it, write results to Supabase."""
    supabase = get_supabase()
    s3 = get_s3_client()
    bucket = os.environ["R2_BUCKET_NAME"]

    logger.info(f"[parse_archive] start archive={archive_id} key={r2_key}")

    # Update status to processing
    supabase.table("archives").update({"status": "processing"}).eq("id", archive_id).execute()

    try:
        with tempfile.NamedTemporaryFile(suffix=Path(r2_key).suffix, delete=False) as tmp:
            tmp_path = tmp.name

        logger.info(f"[parse_archive] downloading {r2_key} → {tmp_path}")
        s3.download_file(bucket, r2_key, tmp_path)

        # Track what we've already inserted per org to avoid duplicates
        existing_domains: dict[str, str] = {}  # domain → company_id
        response = supabase.table("companies").select("id, domain").eq("organization_id", organization_id).execute()
        for row in (response.data or []):
            existing_domains[row["domain"]] = row["id"]

        email_rows = []
        new_companies: dict[str, str] = {}  # domain → company_id (inserted this run)

        with PffArchive(tmp_path) as archive:
            for folder in archive.folders():
                try:
                    messages = list(folder.sub_messages)
                except Exception:
                    continue

                for msg in messages:
                    try:
                        subject = getattr(msg, "subject", None) or ""
                        from_addr = getattr(msg, "sender_email_address", None) or ""
                        to_field = getattr(msg, "display_to", None) or ""
                        body = getattr(msg, "plain_text_body", None) or getattr(msg, "html_body", None) or ""
                        body_type = "html" if getattr(msg, "html_body", None) else "text"
                        sent_at = getattr(msg, "delivery_time", None)

                        # Parse to addresses
                        to_list = [addr for _, addr in getaddresses([to_field]) if addr]

                        # Find company domain from all addresses
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

                            # Insert new company
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
                            "sent_at": sent_at.isoformat() if sent_at else None,
                        })

                        # Batch insert every 100
                        if len(email_rows) >= 100:
                            supabase.table("emails").insert(email_rows).execute()
                            email_rows = []

                    except Exception as e:
                        logger.warning(f"[parse_archive] skip message: {e}")
                        continue

        # Insert remaining
        if email_rows:
            supabase.table("emails").insert(email_rows).execute()

        # Mark done
        from datetime import datetime, timezone
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
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
