import re

with open('backend/main.py', 'r') as f:
    content = f.read()

# Replace the email list slicing
old_code = """                    email_list = email_ids[0].split()
                    new_ids = [
                        e.decode() if isinstance(e, bytes) else e 
                        for e in email_list 
                        if (e.decode() if isinstance(e, bytes) else e) not in seen_email_ids
                    ]"""

new_code = """                    email_list = email_ids[0].split()
                    # We only care about the NEWEST emails (end of the list)
                    recent_emails = email_list[-200:]
                    new_ids = [
                        e.decode() if isinstance(e, bytes) else e 
                        for e in recent_emails 
                        if (e.decode() if isinstance(e, bytes) else e) not in seen_email_ids
                    ]"""

content = content.replace(old_code, new_code)

with open('backend/main.py', 'w') as f:
    f.write(content)

print("Patched main.py")
