# Metrica Privacy Notice

**Last updated:** November 9, 2026
**Operated by:** Aswal Analytics Services, India
**Brand:** Metrica
**Privacy contact:** [Vipinaswal720@gmail.com](mailto:Vipinaswal720@gmail.com)

This notice explains what the current Metrica website does with information. It is a practical description of the app, not legal advice. Aswal Analytics Services does not claim ownership of datasets that users upload.

## 1. At a glance

- CSV and Excel files are read and analyzed in your browser. The app does not upload or save the full file to the Metrica or Supabase database.
- If you choose Ask AI, the app sends your question, dataset summary, column information, and up to 20 real sample rows to the Metrica server, which forwards that information to Google Gemini.
- Metrica is configured to use the Gemini API free or unpaid tier. Google says it may use prompts and responses to improve its services and that authorized human reviewers may review them. Do not send personal, sensitive, confidential, or health information to Ask AI.
- Supabase is used for account sign-in. The configured Supabase project is in West EU (Ireland). Metrica does not currently save datasets, dashboards, or rules to Supabase.
- You can delete your Metrica sign-in account from the Profile page after signing in.

## 2. Your uploaded datasets

You choose which file to upload and are responsible for having the authority to use it. Metrica reads the file in your browser to create summaries, charts, filters, data-quality results, cleaning actions, conditions, and exports. The app does not send the full spreadsheet to its server or store it in Supabase. Dataset contents are held in browser memory while you use the app. Saved conditions and some preferences are stored in your browser's local storage, not in your Metrica account.

Aswal Analytics Services does not claim ownership of your dataset and does not intentionally review or use the full uploaded file for its own independent business purposes. You control whether to upload a file and whether to use Ask AI. The service operator does configure and operate the website and its service providers, so it would be inaccurate to say the operator has no control over the data-processing pathway.

Only upload information you are permitted to process. MeitY's Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 describe sensitive categories including passwords, financial information, health or medical records, sexual orientation, and biometrics. Take special care with such information. See the [official MeitY rules](https://www.meity.gov.in/sites/upload_files/dit/files/GSR313E_10511%281%29.pdf).

## 3. Ask AI and Google Gemini

When you submit a question to Ask AI, Metrica sends the following from your browser to its server and then to Google Gemini:

- your question;
- dataset row and column counts and summary statistics;
- column names, detected types, and related summary values; and
- up to 20 real rows from the beginning of the dataset.

The full file is not sent, but those sample rows may contain identifying information. The app owner operates the server and supplies the Gemini API connection; the server does not intentionally save the prompt or sample rows in the Metrica database.

Metrica currently uses the Gemini API free or unpaid tier. Under Google's current [Gemini API terms](https://ai.google.dev/gemini-api/terms), Google may use content submitted to unpaid services and generated responses to provide, improve, and develop Google products and services. Authorized human reviewers may read, annotate, and process that content. Google specifically says not to submit sensitive, confidential, or personal information to unpaid services. Do not use Ask AI with personal, sensitive, confidential, or health data. This means Metrica cannot promise that Gemini does not retain or review submitted data.

If you do not want this transfer, do not use Ask AI for that dataset. AI-generated explanations can be inaccurate; confirm important conclusions against the data and Metrica's calculations.

## 4. Accounts and Supabase

Signing in is optional. If you create an account, Supabase Authentication processes your email address and authentication/session information to create and maintain your sign-in. Supabase handles passwords through its authentication service; Metrica does not receive your password in readable form.

The configured project region is **West EU (Ireland), eu-west-1**. Supabase says the selected region hosts the project's primary database, Auth service, Storage objects, and backups, but some account, support, telemetry, and operational processing may occur outside that region. Region selection alone is not a guarantee of legal compliance or that every processing activity stays in Ireland. See [Supabase's region information](https://supabase.com/docs/guides/platform/regions) and [data residency FAQ](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq).

The current Metrica app uses Supabase for Auth only. It does not currently save uploaded datasets, dashboards, or IF/ELSE rules in Supabase. Browser-local settings and saved rules are not deleted by deleting your Supabase account; clear the browser's site data if you also want to remove those local items.

## 5. Account deletion

After signing in, open **Profile → Delete account** and confirm the request. Metrica asks Supabase to permanently delete the authentication account. This removes access to the account and invalidates refresh tokens. It does not erase information already sent to Google Gemini, provider security records, or copies saved in your browser. Supabase documents that an already-issued access token may remain valid until it expires. The current app does not use Supabase Storage for user uploads; if that changes, stored objects must also be handled as part of deletion.

You may also email [Vipinaswal720@gmail.com](mailto:Vipinaswal720@gmail.com) with account or privacy requests.

## 6. Browser storage and technical information

Metrica uses browser storage for your sign-in session, theme and interface preferences, AI model preference, and saved conditions. Uploaded file contents are used in browser memory during analysis. Clearing Metrica's site data in your browser removes browser-stored preferences and the local sign-in session.

The app server applies request limits and processes the network information required to handle requests. The current server code does not write Ask AI prompts or sample rows to an application database or log them. Google, Supabase, Vercel, and their infrastructure may process service, security, or operational information under their own terms. Retention periods for those provider records are controlled by the providers and their configurations.

## 7. Service providers and sharing

Metrica uses these providers to operate its current features:

- **Google Gemini API** for optional Ask AI requests;
- **Supabase** for account authentication; and
- **Vercel** for website hosting and deployment.

These providers process information needed for their services under their respective terms and may process it in countries other than India. Information may also be disclosed when required by law.

## 8. Security and responsible use

The Gemini API key is kept on the server rather than in browser code. Use the production website over HTTPS. No online service can guarantee perfect security. Do not upload information you are not authorized to use, and do not send personal or sensitive information to Ask AI while it uses Google's unpaid Gemini service.

India's data protection framework includes the [Digital Personal Data Protection Act, 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf) and [Digital Personal Data Protection Rules, 2025](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa). This notice is intended to describe Metrica's current data flows; it is not a determination that the service satisfies every legal requirement. The business should obtain qualified legal advice about its obligations and any required grievance contact before public launch.

## 9. Children

Metrica is a general-purpose analytics tool, not a service designed for children. Do not upload children's personal information unless you have confirmed you are authorized to do so and have arranged any protections required by law.

## 10. Changes and contact

If Metrica's data handling changes, this notice will be updated. For privacy questions or requests, contact [Vipinaswal720@gmail.com](mailto:Vipinaswal720@gmail.com).

## Short in-app notices

**File upload:**

> Your file is analyzed in your browser and is not saved to Metrica's database. You are responsible for the data you choose to upload.

**Ask AI:**

> Ask AI sends your question, dataset summary, column information, and up to 20 real sample rows to Google Gemini. This app uses Google's free or unpaid Gemini API tier, which may use submitted content to improve services and allow human review. Do not send personal, sensitive, confidential, or health data. See the Privacy Notice.

**Sign-up:**

> Supabase processes your email and sign-in information. Metrica does not currently save your uploaded datasets or saved rules to your account. See the Privacy Notice.
