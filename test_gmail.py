import imaplib
import os

EMAIL = "aviral.sharma@girnarsoft.com"
APP_PASSWORD = "ktfwvywfzzutwkkz"

try:
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(EMAIL, APP_PASSWORD)

    print("✅ Login Successful")

    status, folders = mail.list()

    print("Folders:")

    for folder in folders:
        print(folder.decode())

    mail.logout()

except Exception as e:
    print(e)
