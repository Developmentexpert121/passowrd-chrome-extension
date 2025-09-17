# TODO List

## Completed Tasks

- [x] Rename "Add User" tab to "Manage Users" for super_admin
- [x] Create ManageUsersTab.tsx with add, edit, delete functionality
- [x] Update Dashboard.tsx to use ManageUsersTab
- [x] Backend: Change AppUserView to ModelViewSet with delete permission
- [x] Backend: Add destroy method with super_admin check
- [x] Backend: Update urls.py to register users router
- [x] Frontend: Add deleteUser API function
- [x] Remove duplicate deleteUser export

## Pending Tasks

- [ ] Test the Manage Users functionality
- [ ] Verify add, edit, delete users work correctly
- [ ] Ensure permissions are enforced (only super_admin can delete users)
- [ ] Check export CSV/PDF features
