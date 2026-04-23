Update sign up and sign in for the application
- Use firebase auth with Apple & Google sign in options
- Completely remove username and password login. Remove password from DB, but keep username

New sign up flow
- Oprions to sign up with google or apple
- If account already exists, go to parish page
- If new account, create user and take user through a setup flow
    - Complete profile (Full name, birthday, email (optional), bio (optional), avatar)
    - If the user is younger than 13 years old, show a message that says the app is for over 13+ and don't let them proceed
    - Select a parish. User must select a parish to complete sign up. If a user logs in and is not assoiated with a parish, take them to this page
    