import imaplib, os
from dotenv import load_dotenv
load_dotenv('.env.local')
email_addr = os.getenv('GMAIL_EMAIL')
app_password = os.getenv('GMAIL_APP_PASSWORD')
imap = imaplib.IMAP4_SSL("imap.gmail.com", 993)
imap.login(email_addr, app_password)
status, labels = imap.list()
for label in labels:
    print(label.decode())
imap.logout()
