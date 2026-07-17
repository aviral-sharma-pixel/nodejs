import re

with open('backend/main.py', 'r') as f:
    content = f.read()

# Fix Timezone in get_alerts
old_get_alerts = """        if alert.status == 'firing':
            try:
                from email.utils import parsedate_to_datetime
                email_dt = parsedate_to_datetime(alert.timestamp)
                if email_dt.tzinfo:
                    email_dt = email_dt.replace(tzinfo=None)
                duration = max(0, int((now - email_dt).total_seconds() / 60))
            except:
                duration = 0"""

new_get_alerts = """        if alert.status == 'firing':
            try:
                from email.utils import parsedate_to_datetime
                import datetime as dt_mod
                email_dt = parsedate_to_datetime(alert.timestamp)
                # Convert email_dt to local naive datetime
                email_dt_local = email_dt.astimezone().replace(tzinfo=None)
                duration = max(0, int((now - email_dt_local).total_seconds() / 60))
            except Exception as e:
                duration = 0"""

content = content.replace(old_get_alerts, new_get_alerts)


# Fix Timezone in fetch_alerts
old_fetch = """                                # Calculate locked duration
                                try:
                                    from email.utils import parsedate_to_datetime
                                    start_dt = parsedate_to_datetime(alerts_store[alert.id].timestamp)
                                    end_dt = parsedate_to_datetime(alert.timestamp)
                                    if start_dt.tzinfo: start_dt = start_dt.replace(tzinfo=None)
                                    if end_dt.tzinfo: end_dt = end_dt.replace(tzinfo=None)
                                    dur = max(0, int((end_dt - start_dt).total_seconds() / 60))
                                except:
                                    dur = 0"""

new_fetch = """                                # Calculate locked duration
                                try:
                                    from email.utils import parsedate_to_datetime
                                    start_dt = parsedate_to_datetime(alerts_store[alert.id].timestamp).astimezone().replace(tzinfo=None)
                                    end_dt = parsedate_to_datetime(alert.timestamp).astimezone().replace(tzinfo=None)
                                    dur = max(0, int((end_dt - start_dt).total_seconds() / 60))
                                except Exception as e:
                                    dur = 0"""

content = content.replace(old_fetch, new_fetch)

# Also fix the "only newest" to be robust
# Ensure recent_emails is sliced correctly
old_recent = """                    recent_emails = email_list[-200:]"""
new_recent = """                    recent_emails = email_list[-300:]"""
content = content.replace(old_recent, new_recent)

with open('backend/main.py', 'w') as f:
    f.write(content)

print("Patched timezones")
