Add the ability to block a user
- When viewing a user's profile, show a block button 
- When a user blocks another user 
    - remove them from their friends
    - Prevent the blocked user from viewing the profile of the user that blocked them
    - Prevent the blocked user from adding the user that blocked them
    - Do not show the user that blocked in the friend search results 
- There's a 'Blocked Users' option on the settings modal in app/src/screens/profile/ProfileScreen.tsx
    - Wire it up so it shows all the blocked users. Allow users to unblock

Does this feature structure make sense? Any recommendations? Review appdef.md to understand the features before recommending any changes.
