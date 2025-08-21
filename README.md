 Mini OAuth Demo (DATEV-style)
 What this project is about :

This is a mini demo project to understand how OAuth 2.0 authentication works in real-world APIs (like DATEV).
It shows how a Client (app) talks to an Auth Server to get tokens, and then uses them to call a Resource Server securely.

 Project Structure :

auth-server/ → acts like DATEV’s login server.

Gives Access Token (short life, e.g. 15 min).

Gives Refresh Token (long life, e.g. 11 hrs).

Refreshes tokens when they expire.

resource-server/ → acts like DATEV’s accounting API.

Has a protected /invoices endpoint.

Only accepts requests if you send a valid access token.

client-server/ → a small web UI.

Lets you Authenticate, Send Invoice, Check Token, Revoke Token.

Stores tokens and shows them in the UI.

How it works (Simple Flow) :

Authenticate → Client asks Auth Server for tokens.

Gets Access Token (short) + Refresh Token (long).

Send Invoice → Client calls Resource Server with Authorization: Bearer <access_token>.

Resource Server checks with Auth Server → if valid, accepts invoice.

Refresh → If Access Token expired, Client uses Refresh Token to get a new one.

Revoke → Client can revoke tokens (like logout).

Story Example :

Imagine going to a theme park :

Access Token = wristband (short-time).

Refresh Token = backup pass (longer).

Auth Server = ticket counter (gives wristbands & passes).

Resource Server = rides (they only let you in if you show a valid wristband).

Client = you (the visitor).

Goal of this Project

To learn how OAuth works step by step.

To simulate how systems like DATEV handle secure invoice transfers.

To practice using Access & Refresh tokens in a simple environment.
