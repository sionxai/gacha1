# Firebase Backup Functions

This package contains the Cloud Functions that keep every user profile
mirrored and snapshotted on a fixed schedule. Deploying them adds a
server-side safety net that the admin UI can use for one-click restores.

## Prerequisites

- Firebase CLI (`npm install -g firebase-tools`)
- Project access to `gacha-870fa`
- Node.js 20+ (matches the Cloud Functions runtime)

## Install & Deploy

```bash
cd functions
npm install
firebase deploy --only functions
```

By default the functions deploy to the `asia-southeast1` region. Adjust the
region inside `index.js` if your database is hosted elsewhere.

## Scheduled Snapshots

`snapshotUsersHourly` is a Pub/Sub scheduled function. After the first deploy,
create a Cloud Scheduler job that triggers it every hour (or your preferred
interval):

```bash
gcloud scheduler jobs create pubsub snapshot-users-hourly \
  --schedule="0 * * * *" \
  --topic="firebase-schedule-snapshotUsersHourly" \
  --message-body="{}" \
  --project=gacha-870fa
```

Adjust the cron expression if you want a different cadence.

## Retention & Limits

Environment variables let you tweak retention without code changes:

- `SNAPSHOT_RETENTION_HOURS` (default: `48`)
- `SNAPSHOT_MAX_PER_USER` (default: `96`)

Example:

```bash
firebase functions:config:set backups.retention_hours="72" backups.max_per_user="120"
firebase deploy --only functions
```

The function reads the raw `process.env` values, so you can also set them in
the Cloud Functions console.

## Restore API

`restoreUserProfile` is an HTTPS callable function. The admin UI calls it via
Firebase Authentication, and the function checks the caller’s role in the
realtime database. Make sure Firebase security rules keep `/mirrors` and
`/snapshots` readable only to admins.

## Manual Testing Checklist

1. Launch the web app as an admin and pick a user from the new 백업/복원 panel.
2. Click “목록 새로고침” — the table should show the most recent snapshots and
   mirror timestamp.
3. Trigger `mirrorUserProfile` by making a profile change; verify the mirror
   node updates in the Realtime Database console.
4. Run the scheduled function locally (`firebase emulators:start --only functions`
   and `functions:shell`) or wait for the hourly scheduler, then confirm a new
   entry appears under `/snapshots/{uid}/...`.
5. Use “미러 복원” and “스냅샷 복원” buttons and ensure the UI warns/updates and
   the user profile reflects the restored data. The function automatically
   saves a pre-restore snapshot for undoing.

## Cleanup

To remove older snapshots or disable the scheduler, delete the Cloud Scheduler
job and remove the `/snapshots` subtree from the database. The mirror branch
(`/mirrors`) can be cleared independently.
