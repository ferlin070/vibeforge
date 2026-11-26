# Beta cloud session lifecycle

Cloud account UI is keyed by account identity. Leaving the account view discards
late sign-in results and cached snapshot responses. A new account receives a
fresh panel rather than the previous account's form or snapshot list.

Signing out clears the in-memory session before the remote request. The remote
logout is scoped to the initiating Supabase session, not all devices. A failure
to confirm remote revocation is disclosed without restoring the local session.
A delayed logout response never changes the current account. Already issued
access tokens can remain valid until expiry; requests already sent may finish
on the server. Local project data is not erased by logout.

Synthetic browser tests cover late sign-in after navigation and a delayed
logout while another account signs in. These are not real two-account
PostgREST or Auth UAT. No database or provider configuration changes.

Reference: https://supabase.com/docs/guides/auth/signout
