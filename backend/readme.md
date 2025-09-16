## Users

POST /login/ → anyone (check password).

POST /signup/ → only super_admin can create.

PUT /forget-password/<id>/ → only super_admin can reset.

## Credential (CRUD)

super_admin → full CRUD.

admin → only assigned-team’s credentials.

user → only their assigned credentials.

## Assignments (CRUD + extra list APIs)

GET /assignments/ → filtered by role.

GET /assignments/{id}/credentials_for_user/ → list all credentials for a user.

GET /assignments/{id}/users_for_credential/ → list all users for a credential.
