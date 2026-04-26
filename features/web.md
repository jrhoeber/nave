Create a new web folder in the root of this project. In the folder create a new web app with the following features and constraints
1. A landing page. naveapp.co should open a landing page that describes the product. use appdef.md for context
- The bottom of the landing page should have links to a privacy policy and TOS. The links should redirect to 'coming soon' pages.
2. On the top right nav bar there should be a sign in button that redirects to a sign in page (using the same auth options and user credentials as the application)
3. Once logged in, a user should be directed to an admin console. No functionality yet, just a 'coming soon'

Considerations
1. The backend is running in GCP cloud run. I'd like the web app to be served from GCP as well
2. I'm using github actions to deploy the backend. I'd like to use the same github actions pipeline to deploy the frontend as well